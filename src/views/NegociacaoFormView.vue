<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { negociacaoApi, usuariosApi, corretoresApi, municipiosOrigemApi, municipiosDestinoApi, categoriasApi, simulacaoApi } from '../services/api'

const router = useRouter()
const route = useRoute()
const isEdicao = computed(() => !!route.params.id)

const form = ref({
  compradorId: '',
  corretorId: '',
  municipioOrigemId: '',
  municipioDestinoId: '',
  dataPrevistaEntrega: '',
  itens: []
})

const listaCompradores = ref([])
const listaCorretores = ref([])
const origens = ref([])
const destinos = ref([])
const categorias = ref([])
const carregando = ref(false)
const salvando = ref(false)
const erro = ref('')

// Inicializar itens para todas as categorias
function inicializarItens() {
  form.value.itens = categorias.value.map(cat => ({
    categoriaId: cat.id,
    categoriaNome: cat.nome,
    pesoMin: cat.pesoMin,
    pesoMax: cat.pesoMax,
    pesoMedioDefault: cat.pesoMedio,
    ativo: false,
    qtdNegociada: null,
    precoNegociado: '',
    precoNegociadoMask: '',
    pesoMedio: cat.pesoMedio,
    precoColocado: null
  }))
}

async function calcularColocado(item) {
  if (!item.precoNegociado || !form.value.municipioOrigemId) {
    item.precoColocado = null
    return
  }
  try {
    const res = await simulacaoApi.calcular({
      municipioOrigemId: Number(form.value.municipioOrigemId),
      municipioDestinoId: Number(form.value.municipioDestinoId || destinos.value[0]?.id),
      itens: [{ categoriaId: item.categoriaId, precoColocado: Number(item.precoNegociado) }]
    })
    // Para calcular Colocado a partir de Negociado, usamos endpoint de negociações
    // Aqui o backend calculará a direção inversa automaticamente ao salvar
    item.precoColocado = null // será calculado pelo backend ao salvar
  } catch {}
}

async function carregar() {
  carregando.value = true
  try {
    const [u, c, o, d, cat] = await Promise.all([
      usuariosApi.listar({ ativo: true }),
      corretoresApi.listar({ ativo: true }),
      municipiosOrigemApi.listar({ ativo: true }),
      municipiosDestinoApi.listar(),
      categoriasApi.listar()
    ])
    listaCompradores.value = u.data
    listaCorretores.value = c.data
    origens.value = o.data
    destinos.value = d.data
    categorias.value = cat.data

    const padrao = d.data.find(x => x.padrao)
    if (padrao) form.value.municipioDestinoId = padrao.id

    inicializarItens()

    if (isEdicao.value) {
      const res = await negociacaoApi.obter(route.params.id)
      const neg = res.data
      form.value.compradorId = neg.compradorId
      form.value.corretorId = neg.corretorId
      form.value.municipioOrigemId = neg.municipioOrigemId
      form.value.municipioDestinoId = neg.municipioDestinoId
      form.value.dataPrevistaEntrega = neg.dataPrevistaEntrega ? neg.dataPrevistaEntrega.split('T')[0] : ''

      // Preencher itens existentes
      for (const item of form.value.itens) {
        const itemExistente = neg.itens.find(i => i.categoriaId === item.categoriaId)
        if (itemExistente) {
          item.ativo = true
          item.qtdNegociada = itemExistente.qtdNegociada
          item.precoNegociado = itemExistente.precoNegociado
          item.precoNegociadoMask = inicializarMascara(itemExistente.precoNegociado)
          item.pesoMedio = itemExistente.pesoMedio
          item.precoColocado = itemExistente.precoColocado
        }
      }
    }
  } finally {
    carregando.value = false
  }
}

async function salvar() {
  erro.value = ''
  const itensAtivos = form.value.itens.filter(i => i.ativo)
  if (!form.value.compradorId || !form.value.corretorId || !form.value.municipioOrigemId) {
    erro.value = 'Preencha os campos obrigatórios: Comprador, Corretor e Município de Origem.'
    return
  }
  if (itensAtivos.length === 0) {
    erro.value = 'Selecione ao menos uma categoria para a negociação.'
    return
  }

  salvando.value = true
  try {
    const payload = {
      compradorId: Number(form.value.compradorId),
      corretorId: Number(form.value.corretorId),
      municipioOrigemId: Number(form.value.municipioOrigemId),
      municipioDestinoId: Number(form.value.municipioDestinoId),
      dataPrevistaEntrega: form.value.dataPrevistaEntrega || null,
      itens: itensAtivos.map(i => ({
        categoriaId: i.categoriaId,
        qtdNegociada: i.qtdNegociada ? Number(i.qtdNegociada) : null,
        precoNegociado: i.precoNegociado ? Number(i.precoNegociado) : null,
        pesoMedio: Number(i.pesoMedio)
      }))
    }

    if (isEdicao.value) {
      await negociacaoApi.atualizar(route.params.id, payload)
      router.push(`/negociacoes/${route.params.id}`)
    } else {
      const res = await negociacaoApi.criar(payload)
      router.push(`/negociacoes/${res.data.id}`)
    }
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar negociação.'
  } finally {
    salvando.value = false
  }
}

function fmtKg(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}/kg`
}

function aplicarMascara3(valor) {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return (parseInt(digits, 10) / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function inicializarMascara(valor) {
  if (!valor && valor !== 0) return ''
  return aplicarMascara3(String(Math.round(Number(valor) * 1000)))
}

function aoDigitarPraca(item, evento) {
  const mascarado = aplicarMascara3(evento.target.value)
  item.precoNegociadoMask = mascarado
  const digits = mascarado.replace(/\D/g, '')
  item.precoNegociado = digits ? parseInt(digits, 10) / 1000 : ''
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex align-items-center gap-2 mb-4">
      <router-link to="/negociacoes" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left"></i>
      </router-link>
      <h4 class="fw-bold mb-0">{{ isEdicao ? 'Editar Negociação' : 'Nova Negociação' }}</h4>
    </div>

    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <form v-else @submit.prevent="salvar">
      <!-- Dados da negociação -->
      <div class="card mb-4">
        <div class="card-header bg-white fw-semibold">Dados da Negociação</div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">Comprador <span class="text-danger">*</span></label>
              <select v-model="form.compradorId" class="form-select" required>
                <option value="">Selecione o comprador...</option>
                <option v-for="u in listaCompradores.filter(x => x.perfil === 'Comprador')" :key="u.id" :value="u.id">{{ u.nome }}</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Corretor / Fornecedor <span class="text-danger">*</span></label>
              <select v-model="form.corretorId" class="form-select" required>
                <option value="">Selecione o corretor...</option>
                <option v-for="c in listaCorretores" :key="c.id" :value="c.id">{{ c.nome }}</option>
              </select>
            </div>
            <div class="col-md-5">
              <label class="form-label fw-semibold">Origem <span class="text-danger">*</span></label>
              <select v-model="form.municipioOrigemId" class="form-select" required>
                <option value="">Selecione a origem...</option>
                <optgroup v-for="uf in [...new Set(origens.map(o => o.uf))].sort()" :key="uf" :label="uf">
                  <option v-for="o in origens.filter(x => x.uf === uf)" :key="o.id" :value="o.id">
                    {{ o.nome }}-{{ o.uf }}
                  </option>
                </optgroup>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">Destino</label>
              <select v-model="form.municipioDestinoId" class="form-select">
                <option v-for="d in destinos" :key="d.id" :value="d.id">{{ d.nome }}-{{ d.uf }}</option>
              </select>
            </div>
            <div class="col-md-3">
              <label class="form-label fw-semibold">Data Prevista de Entrega</label>
              <input v-model="form.dataPrevistaEntrega" type="date" class="form-control" />
            </div>
          </div>
        </div>
      </div>

      <!-- Itens da negociação por categoria -->
      <div class="card mb-4">
        <div class="card-header bg-white fw-semibold">Categorias Negociadas</div>
        <div class="card-body p-0">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th style="width:40px"></th>
                <th>Categoria</th>
                <th>Faixa (kg)</th>
                <th>Qtd. (cabeças)</th>
                <th>R$/kg Negociado (praça) <span class="text-danger">*</span></th>
                <th>Peso Médio (kg)</th>
                <th class="text-end" style="color:#2980b9">R$/kg Colocado (calc.)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in form.itens" :key="item.categoriaId"
                  :class="{ 'table-primary': item.ativo }">
                <td>
                  <input type="checkbox" class="form-check-input" v-model="item.ativo" />
                </td>
                <td class="fw-semibold">{{ item.categoriaNome }}</td>
                <td class="text-muted small">{{ item.pesoMin }}–{{ item.pesoMax }}</td>
                <td>
                  <input v-if="item.ativo" v-model="item.qtdNegociada" type="number" min="0" class="form-control form-control-sm" style="width:90px" placeholder="0" />
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <div v-if="item.ativo" class="d-flex align-items-center gap-1">
                    <span class="text-muted small">R$</span>
                    <input
                      :value="item.precoNegociadoMask"
                      type="text"
                      inputmode="decimal"
                      class="form-control form-control-sm"
                      style="width:110px"
                      placeholder="0,000"
                      required
                      @input="aoDigitarPraca(item, $event)"
                    />
                  </div>
                  <span v-else class="text-muted">—</span>
                </td>
                <td>
                  <input v-if="item.ativo" v-model="item.pesoMedio" type="number" step="0.1" min="0"
                         class="form-control form-control-sm" style="width:90px"
                         :placeholder="item.pesoMedioDefault" />
                  <span v-else class="text-muted">{{ item.pesoMedioDefault }}</span>
                </td>
                <td class="text-end">
                  <span v-if="item.precoColocado" class="preco-colocado">{{ fmtKg(item.precoColocado) }}</span>
                  <span v-else class="text-muted small">calculado ao salvar</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="erro" class="alert alert-danger">{{ erro }}</div>

      <div class="d-flex gap-2">
        <button type="submit" class="btn btn-primary px-4" :disabled="salvando">
          <span v-if="salvando" class="spinner-border spinner-border-sm me-2"></span>
          {{ isEdicao ? 'Salvar Alterações' : 'Criar Negociação' }}
        </button>
        <router-link to="/negociacoes" class="btn btn-outline-secondary">Cancelar</router-link>
      </div>
    </form>
  </div>
</template>
