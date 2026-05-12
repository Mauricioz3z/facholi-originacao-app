<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  negociacaoApi, corretoresApi, municipiosOrigemApi,
  municipiosDestinoApi, categoriasApi
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const editandoId = computed(() => route.params.id ? Number(route.params.id) : null)
const modoEdicao = computed(() => !!editandoId.value)

const corretores = ref([])
const origens = ref([])
const destinos = ref([])
const categorias = ref([])
const carregando = ref(false)
const salvando = ref(false)
const erro = ref('')

const form = ref({
  corretorId: '',
  municipioOrigemId: '',
  municipioDestinoId: '',
  dataPrevistaEntrega: '',
  itens: []
})

async function carregar() {
  carregando.value = true
  try {
    const [c, o, d, cat] = await Promise.all([
      corretoresApi.listar({ ativo: true }),
      municipiosOrigemApi.listar({ ativo: true }),
      municipiosDestinoApi.listar(),
      categoriasApi.listar()
    ])
    corretores.value = c.data
    origens.value = o.data
    destinos.value = d.data
    categorias.value = cat.data

    form.value.itens = cat.data.map(c => ({
      categoriaId: c.id,
      categoriaNome: c.nome,
      pesoMin: c.pesoMin,
      pesoMax: c.pesoMax,
      pesoMedio: c.pesoMedio,
      ativo: false,
      qtdNegociada: '',
      precoNegociado: '',
      precoNegociadoMask: ''
    }))

    if (modoEdicao.value) {
      const res = await negociacaoApi.obter(editandoId.value)
      const neg = res.data
      if (neg.status === 'Fechado') {
        erro.value = 'Esta negociação está fechada e não pode ser editada.'
        return
      }
      if (!auth.isAdmin && neg.compradorId !== auth.user?.id) {
        erro.value = 'Você só pode editar negociações que você mesmo criou.'
        return
      }
      form.value.corretorId = neg.corretorId
      form.value.municipioOrigemId = neg.municipioOrigemId
      form.value.municipioDestinoId = neg.municipioDestinoId
      form.value.dataPrevistaEntrega = neg.dataPrevistaEntrega
        ? new Date(neg.dataPrevistaEntrega).toISOString().substring(0, 10)
        : ''
      for (const itemNeg of neg.itens) {
        const itemForm = form.value.itens.find(i => i.categoriaId === itemNeg.categoriaId)
        if (itemForm) {
          itemForm.ativo = true
          itemForm.qtdNegociada = itemNeg.qtdNegociada ?? ''
          itemForm.precoNegociado = itemNeg.precoNegociado ?? ''
          itemForm.precoNegociadoMask = inicializarMascara(itemNeg.precoNegociado)
          itemForm.pesoMedio = itemNeg.pesoMedio ?? itemForm.pesoMedio
        }
      }
    } else {
      const padrao = d.data.find(x => x.padrao)
      if (padrao) form.value.municipioDestinoId = padrao.id
    }
  } finally {
    carregando.value = false
  }
}

async function salvar() {
  erro.value = ''
  const itensAtivos = form.value.itens.filter(i => i.ativo)

  if (!form.value.corretorId || !form.value.municipioOrigemId) {
    erro.value = 'Preencha o Corretor e o Município de Origem.'
    return
  }
  if (itensAtivos.length === 0) {
    erro.value = 'Selecione ao menos uma categoria.'
    return
  }
  for (const i of itensAtivos) {
    if (!i.precoNegociado) {
      erro.value = `Informe o preço para a categoria "${i.categoriaNome}".`
      return
    }
  }

  const payload = {
    compradorId: auth.user?.id,
    corretorId: Number(form.value.corretorId),
    municipioOrigemId: Number(form.value.municipioOrigemId),
    municipioDestinoId: Number(form.value.municipioDestinoId),
    dataPrevistaEntrega: form.value.dataPrevistaEntrega || null,
    itens: itensAtivos.map(i => ({
      categoriaId: i.categoriaId,
      qtdNegociada: i.qtdNegociada ? Number(i.qtdNegociada) : null,
      precoNegociado: Number(i.precoNegociado),
      pesoMedio: Number(i.pesoMedio)
    }))
  }

  salvando.value = true
  try {
    if (modoEdicao.value) {
      await negociacaoApi.atualizar(editandoId.value, payload)
      router.push('/app/negociacoes/' + editandoId.value)
    } else {
      const res = await negociacaoApi.criar(payload)
      router.push('/app/negociacoes/' + res.data.id)
    }
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar negociação.'
  } finally {
    salvando.value = false
  }
}

function voltar() {
  if (modoEdicao.value) router.push('/app/negociacoes/' + editandoId.value)
  else router.push('/app/negociacoes')
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
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.2rem">
      <button
        class="pwa-btn pwa-btn-outline pwa-btn-icon"
        @click="voltar"
      >
        <i class="bi bi-arrow-left"></i>
      </button>
      <div style="font-size:1.15rem;font-weight:700">
        {{ modoEdicao ? 'Editar Negociação' : 'Nova Negociação' }}
      </div>
    </div>

    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border" style="color:var(--pwa-verde)"></div>
    </div>

    <form v-else @submit.prevent="salvar">
      <!-- Corretor -->
      <div class="pwa-card">
        <div class="pwa-card-header"><i class="bi bi-person-badge-fill me-2"></i>Dados da Negociação</div>
        <div class="pwa-card-body">
          <div style="margin-bottom:1rem">
            <label class="pwa-label">Corretor / Fornecedor <span style="color:#c0392b">*</span></label>
            <div class="pwa-select-wrap">
              <select v-model="form.corretorId" class="pwa-select" required>
                <option value="">Selecione o corretor...</option>
                <option v-for="c in corretores" :key="c.id" :value="c.id">{{ c.nome }}</option>
              </select>
            </div>
          </div>

          <div style="margin-bottom:1rem">
            <label class="pwa-label">Origem <span style="color:#c0392b">*</span></label>
            <div class="pwa-select-wrap">
              <select v-model="form.municipioOrigemId" class="pwa-select" required>
                <option value="">Selecione a origem...</option>
                <optgroup
                  v-for="uf in [...new Set(origens.map(o => o.uf))].sort()"
                  :key="uf"
                  :label="uf"
                >
                  <option
                    v-for="o in origens.filter(x => x.uf === uf)"
                    :key="o.id"
                    :value="o.id"
                  >{{ o.nome }}-{{ o.uf }}</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div style="margin-bottom:1rem">
            <label class="pwa-label">Destino</label>
            <div class="pwa-select-wrap">
              <select v-model="form.municipioDestinoId" class="pwa-select">
                <option v-for="d in destinos" :key="d.id" :value="d.id">
                  {{ d.nome }}-{{ d.uf }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="pwa-label">Data Prevista de Entrega</label>
            <input
              v-model="form.dataPrevistaEntrega"
              type="date"
              class="pwa-input"
            />
          </div>
        </div>
      </div>

      <!-- Categorias -->
      <div class="pwa-section-title">Selecione as Categorias</div>

      <div v-for="item in form.itens" :key="item.categoriaId">
        <label class="pwa-check-card" :class="{ checked: item.ativo }">
          <input type="checkbox" v-model="item.ativo" />
          <div style="flex:1">
            <div style="font-size:1rem;font-weight:700;color:var(--pwa-texto)">{{ item.categoriaNome }}</div>
            <div style="font-size:0.82rem;color:var(--pwa-texto-suave)">{{ item.pesoMin }}–{{ item.pesoMax }} kg</div>
          </div>
        </label>

        <div v-if="item.ativo" style="background:white;border-radius:0 0 10px 10px;padding:1rem;margin-top:-0.5rem;margin-bottom:0.5rem;border:2px solid var(--pwa-borda);border-top:none">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div>
              <label class="pwa-label">R$/kg Praça <span style="color:#c0392b">*</span></label>
              <input
                :value="item.precoNegociadoMask"
                type="text"
                inputmode="decimal"
                class="pwa-num-input"
                placeholder="0,000"
                required
                @input="aoDigitarPraca(item, $event)"
              />
            </div>
            <div>
              <label class="pwa-label">Qtd. Cabeças</label>
              <input
                v-model="item.qtdNegociada"
                type="number"
                min="0"
                inputmode="numeric"
                class="pwa-num-input"
                placeholder="0"
              />
            </div>
          </div>
          <div style="margin-top:0.75rem">
            <label class="pwa-label">Peso Médio (kg)</label>
            <input
              v-model="item.pesoMedio"
              type="number"
              step="0.1"
              min="0"
              inputmode="decimal"
              class="pwa-num-input"
              :placeholder="item.pesoMedio"
            />
          </div>
        </div>
      </div>

      <div
        v-if="erro"
        style="color:#c0392b;padding:0.85rem 1rem;background:#fdecea;border-radius:10px;margin-bottom:1rem;font-size:0.9rem"
      >
        <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ erro }}
      </div>

      <button
        type="submit"
        class="pwa-btn pwa-btn-primary"
        :disabled="salvando"
        style="margin-bottom:1rem"
      >
        <span v-if="salvando" class="spinner-border spinner-border-sm"></span>
        <i v-else class="bi bi-check-lg"></i>
        {{ modoEdicao ? 'Salvar Alterações' : 'Criar Negociação' }}
      </button>

      <button
        type="button"
        class="pwa-btn pwa-btn-outline"
        @click="voltar"
      >
        Cancelar
      </button>
    </form>
  </div>
</template>
