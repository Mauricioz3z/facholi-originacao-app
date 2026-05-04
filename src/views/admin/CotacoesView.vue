<script setup>
import { ref, onMounted, computed } from 'vue'
import { cotacoesApi, categoriasApi } from '../../services/api'

const cotacoes = ref([])
const categorias = ref([])
const carregando = ref(false)
const salvando = ref(false)
const mensagem = ref('')
const editandoUf = ref(null)

const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

function valorKgPorCategoria(cotacao, cat) {
  if (!cotacao.valorArroba) return 0
  const agio = cotacao.agios?.find(a => a.categoriaId === cat.id)
  const percentual = agio ? agio.percentual / 100 : 0
  return (cotacao.valorArroba / 30) * (1 + percentual)
}

async function carregar() {
  carregando.value = true
  try {
    const [c, cat] = await Promise.all([cotacoesApi.listar(), categoriasApi.listar()])
    cotacoes.value = JSON.parse(JSON.stringify(c.data))
    categorias.value = cat.data
  } finally { carregando.value = false }
}

async function salvar(cotacao) {
  salvando.value = true
  mensagem.value = ''
  try {
    await cotacoesApi.salvar({
      uf: cotacao.uf,
      pracaReferenciaUf: cotacao.pracaReferenciaUf || null,
      valorArroba: Number(cotacao.valorArroba),
      agios: categorias.value.map(cat => ({
        categoriaId: cat.id,
        percentual: Number(cotacao.agios?.find(a => a.categoriaId === cat.id)?.percentual || 0)
      }))
    })
    mensagem.value = `Cotação ${cotacao.uf} salva!`
    setTimeout(() => mensagem.value = '', 3000)
    editandoUf.value = null
    await carregar()
  } catch { mensagem.value = 'Erro ao salvar.' }
  finally { salvando.value = false }
}

function getAgio(cotacao, catId) {
  const a = cotacao.agios?.find(x => x.categoriaId === catId)
  return a ? a.percentual : 0
}

function setAgio(cotacao, catId, value) {
  if (!cotacao.agios) cotacao.agios = []
  const idx = cotacao.agios.findIndex(x => x.categoriaId === catId)
  if (idx >= 0) cotacao.agios[idx].percentual = value
  else cotacao.agios.push({ categoriaId: catId, percentual: value })
}

onMounted(carregar)
</script>

<template>
  <div>
    <h4 class="fw-bold mb-2">Cotação Regional</h4>
    <p class="text-muted small mb-4">R$/kg = (R$/@ ÷ 30) × (1 + Ágio%). Atualização manual semanal pelo administrador.</p>

    <div v-if="mensagem" class="alert alert-success py-2 small">{{ mensagem }}</div>

    <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <div v-else>
      <div v-for="cotacao in cotacoes" :key="cotacao.uf" class="card mb-3">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <div>
            <strong>{{ cotacao.uf }}</strong>
            <span v-if="cotacao.pracaReferenciaUf" class="text-muted small ms-2">(referência: {{ cotacao.pracaReferenciaUf }})</span>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted small">Atualizado: {{ cotacao.atualizadoEm ? new Date(cotacao.atualizadoEm).toLocaleDateString('pt-BR') : '—' }}</span>
            <button class="btn btn-sm btn-outline-primary" @click="editandoUf = editandoUf === cotacao.uf ? null : cotacao.uf">
              <i class="bi bi-pencil"></i> Editar
            </button>
          </div>
        </div>

        <div v-if="editandoUf === cotacao.uf" class="card-body">
          <div class="row g-3 mb-3">
            <div class="col-md-3">
              <label class="form-label">R$/@ (arroba)</label>
              <input v-model.number="cotacao.valorArroba" type="number" step="0.01" min="0" class="form-control" />
            </div>
            <div class="col-md-3">
              <label class="form-label">Praça de Referência (UF)</label>
              <select v-model="cotacao.pracaReferenciaUf" class="form-select">
                <option value="">— Própria —</option>
                <option v-for="uf in ufs.filter(u => u !== cotacao.uf)" :key="uf">{{ uf }}</option>
              </select>
            </div>
          </div>

          <h6 class="fw-semibold">Ágios por Faixa de Peso</h6>
          <div class="row g-2 mb-3">
            <div v-for="cat in categorias" :key="cat.id" class="col-md-4">
              <div class="input-group input-group-sm">
                <span class="input-group-text" style="min-width:140px">{{ cat.nome }} {{ cat.pesoMin }}–{{ cat.pesoMax }}</span>
                <input :value="getAgio(cotacao, cat.id)" @input="setAgio(cotacao, cat.id, Number($event.target.value))"
                       type="number" step="0.1" min="0" max="100" class="form-control" />
                <span class="input-group-text">%</span>
              </div>
              <small class="text-muted">R$/kg: {{ valorKgPorCategoria(cotacao, cat).toFixed(4).replace('.', ',') }}</small>
            </div>
          </div>

          <div class="d-flex gap-2">
            <button class="btn btn-primary btn-sm" @click="salvar(cotacao)" :disabled="salvando">Salvar Cotação</button>
            <button class="btn btn-outline-secondary btn-sm" @click="editandoUf = null">Cancelar</button>
          </div>
        </div>

        <div v-else class="card-body py-2">
          <div class="d-flex flex-wrap gap-3">
            <div><span class="text-muted small">R$/@:</span> <strong>{{ cotacao.valorArroba ? `R$ ${Number(cotacao.valorArroba).toFixed(2).replace('.', ',')}` : '—' }}</strong></div>
            <div v-for="cat in categorias" :key="cat.id" class="text-muted small">
              {{ cat.nome }} ({{ cat.pesoMin }}–{{ cat.pesoMax }}): <strong>{{ getAgio(cotacao, cat.id) }}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
