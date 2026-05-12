<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { negociacaoApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const negociacoes = ref([])
const total = ref(0)
const carregando = ref(false)
const statusFiltro = ref('Todos')
const apenasMinhas = ref(false)

const negociacoesFiltradas = computed(() => {
  if (!apenasMinhas.value) return negociacoes.value
  return negociacoes.value.filter(n => n.compradorId === auth.user?.id)
})

async function carregar() {
  carregando.value = true
  try {
    const res = await negociacaoApi.listar({
      status: statusFiltro.value !== 'Todos' ? statusFiltro.value : undefined,
      tamanhoPagina: 50
    })
    negociacoes.value = res.data.items
    total.value = res.data.total
  } finally {
    carregando.value = false
  }
}

function ehMinha(neg) {
  return neg.compradorId === auth.user?.id
}

function totalCabecas(neg) {
  if (!neg?.itens?.length) return 0
  return neg.itens.reduce((s, i) => s + (i.qtdNegociada || 0), 0)
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function percentualEntrega(neg) {
  if (!neg?.itens?.length) return 0
  const qtdNeg = neg.itens.reduce((s, i) => s + (i.qtdNegociada || 0), 0)
  const qtdEnt = neg.itens.reduce((s, i) => s + (i.qtdEntregue || 0), 0)
  if (qtdNeg === 0) return 0
  return Math.round(qtdEnt / qtdNeg * 100)
}

function filtrar(status) {
  statusFiltro.value = status
  carregar()
}

onMounted(carregar)
</script>

<template>
  <div>
    <!-- Filtros de status -->
    <div style="display:flex;gap:0.5rem;margin-bottom:1rem;overflow-x:auto;padding-bottom:0.25rem;-webkit-overflow-scrolling:touch">
      <button
        class="pwa-btn pwa-btn-sm"
        :class="statusFiltro === 'Todos' ? 'pwa-btn-primary' : 'pwa-btn-outline'"
        style="white-space:nowrap;flex-shrink:0;width:auto;padding:0 1.1rem"
        @click="filtrar('Todos')"
      >Todos</button>
      <button
        class="pwa-btn pwa-btn-sm"
        :class="statusFiltro === 'EmNegociacao' ? 'pwa-btn-primary' : 'pwa-btn-outline'"
        style="white-space:nowrap;flex-shrink:0;width:auto;padding:0 1.1rem"
        @click="filtrar('EmNegociacao')"
      >Em Andamento</button>
      <button
        class="pwa-btn pwa-btn-sm"
        :class="statusFiltro === 'Fechado' ? 'pwa-btn-primary' : 'pwa-btn-outline'"
        style="white-space:nowrap;flex-shrink:0;width:auto;padding:0 1.1rem"
        @click="filtrar('Fechado')"
      >Fechados</button>
      <div style="width:1px;background:var(--pwa-borda);flex-shrink:0;margin:0 0.25rem"></div>
      <button
        class="pwa-btn pwa-btn-sm"
        :class="apenasMinhas ? 'pwa-btn-primary' : 'pwa-btn-outline'"
        style="white-space:nowrap;flex-shrink:0;width:auto;padding:0 1.1rem"
        @click="apenasMinhas = !apenasMinhas"
      ><i class="bi bi-person-check-fill me-1"></i>Minhas</button>
    </div>

    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border" style="color:var(--pwa-verde)"></div>
    </div>

    <div
      v-else-if="negociacoesFiltradas.length === 0"
      style="text-align:center;padding:3rem 1rem;color:var(--pwa-texto-suave)"
    >
      <i class="bi bi-clipboard-x" style="font-size:3rem;color:var(--pwa-borda);display:block;margin-bottom:0.75rem"></i>
      <p style="margin:0">Nenhuma negociação encontrada.</p>
    </div>

    <div
      v-for="neg in negociacoesFiltradas"
      :key="neg.id"
      class="pwa-neg-card"
      :class="{
        fechado:   neg.status === 'Fechado' && percentualEntrega(neg) < 100,
        concluido: neg.status === 'Fechado' && percentualEntrega(neg) >= 100
      }"
      @click="router.push('/app/negociacoes/' + neg.id)"
    >
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div style="display:flex;align-items:center;gap:6px">
          <div class="pwa-neg-numero">{{ neg.numero }}</div>
          <span v-if="ehMinha(neg)" class="pwa-badge pwa-badge-verde" style="font-size:0.65rem">MINHA</span>
        </div>
        <span
          class="pwa-badge"
          :class="neg.status !== 'Fechado' ? 'pwa-badge-verde'
                : percentualEntrega(neg) >= 100 ? 'pwa-badge-cinza'
                : 'pwa-badge-laranja'"
        >
          {{ neg.status !== 'Fechado' ? 'Em Andamento'
           : percentualEntrega(neg) >= 100 ? 'Concluído'
           : 'Fechado' }}
        </span>
      </div>
      <div class="pwa-neg-titulo">{{ neg.municipioOrigemNome }}-{{ neg.municipioOrigemUf }}</div>
      <div class="pwa-neg-info">
        <i class="bi bi-person-circle"></i>
        <span><strong style="color:var(--pwa-texto)">Comprador:</strong> {{ neg.compradorNome }}</span>
      </div>
      <div class="pwa-neg-info" style="margin-top:3px">
        <i class="bi bi-person"></i> {{ neg.corretorNome }}
        <span style="margin-left:auto;font-weight:700;color:var(--pwa-texto)">
          <i class="bi bi-collection-fill"></i> {{ totalCabecas(neg).toLocaleString('pt-BR') }} cab.
        </span>
      </div>
      <div v-if="neg.status === 'Fechado'" style="margin-top:6px">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--pwa-texto-suave);margin-bottom:3px">
          <span><i class="bi bi-truck me-1"></i>Entrega</span>
          <span style="font-weight:700;color:var(--pwa-verde)">{{ percentualEntrega(neg) }}%</span>
        </div>
        <div class="pwa-progress-wrap" style="margin:0">
          <div class="pwa-progress-bar" :style="{ width: percentualEntrega(neg) + '%' }"></div>
        </div>
      </div>
      <div class="pwa-neg-info" style="margin-top:4px">
        <i class="bi bi-calendar3"></i> Entrega: {{ fmtData(neg.dataPrevistaEntrega) }}
        <span style="margin-left:auto;font-size:0.75rem;color:var(--pwa-texto-suave)">
          {{ fmtData(neg.criadoEm) }}
        </span>
      </div>
    </div>

    <!-- FAB nova negociação -->
    <button
      class="pwa-fab"
      @click="router.push('/app/negociacoes/nova')"
      title="Nova Negociação"
    >
      <i class="bi bi-plus-lg"></i>
    </button>
  </div>
</template>
