<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  negociacaoApi, corretoresApi, municipiosOrigemApi,
  municipiosDestinoApi, categoriasApi
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()

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

    const padrao = d.data.find(x => x.padrao)
    if (padrao) form.value.municipioDestinoId = padrao.id

    form.value.itens = cat.data.map(c => ({
      categoriaId: c.id,
      categoriaNome: c.nome,
      pesoMin: c.pesoMin,
      pesoMax: c.pesoMax,
      pesoMedio: c.pesoMedio,
      ativo: false,
      qtdNegociada: '',
      precoNegociado: ''
    }))
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

  salvando.value = true
  try {
    const res = await negociacaoApi.criar({
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
    })
    router.push('/app/negociacoes/' + res.data.id)
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar negociação.'
  } finally {
    salvando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.2rem">
      <button
        class="pwa-btn pwa-btn-outline pwa-btn-icon"
        @click="router.push('/app/negociacoes')"
      >
        <i class="bi bi-arrow-left"></i>
      </button>
      <div style="font-size:1.15rem;font-weight:700">Nova Negociação</div>
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
                v-model="item.precoNegociado"
                type="number"
                step="0.0001"
                min="0"
                inputmode="decimal"
                class="pwa-num-input"
                placeholder="0,0000"
                required
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
        Criar Negociação
      </button>

      <button
        type="button"
        class="pwa-btn pwa-btn-outline"
        @click="router.push('/app/negociacoes')"
      >
        Cancelar
      </button>
    </form>
  </div>
</template>
