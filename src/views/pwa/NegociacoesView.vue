<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { negociacaoApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const negociacoes = ref([])
const total = ref(0)
const carregando = ref(false)
const statusFiltro = ref('Todos')

async function carregar() {
  carregando.value = true
  try {
    const res = await negociacaoApi.listar({
      compradorId: auth.user?.id,
      status: statusFiltro.value !== 'Todos' ? statusFiltro.value : undefined,
      tamanhoPagina: 50
    })
    negociacoes.value = res.data.items
    total.value = res.data.total
  } finally {
    carregando.value = false
  }
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
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
    </div>

    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border" style="color:var(--pwa-verde)"></div>
    </div>

    <div
      v-else-if="negociacoes.length === 0"
      style="text-align:center;padding:3rem 1rem;color:var(--pwa-texto-suave)"
    >
      <i class="bi bi-clipboard-x" style="font-size:3rem;color:var(--pwa-borda);display:block;margin-bottom:0.75rem"></i>
      <p style="margin:0">Nenhuma negociação encontrada.</p>
    </div>

    <div
      v-for="neg in negociacoes"
      :key="neg.id"
      class="pwa-neg-card"
      :class="{ fechado: neg.status === 'Fechado' }"
      @click="router.push('/app/negociacoes/' + neg.id)"
    >
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
        <div class="pwa-neg-numero">{{ neg.numero }}</div>
        <span
          class="pwa-badge"
          :class="neg.status === 'Fechado' ? 'pwa-badge-laranja' : 'pwa-badge-verde'"
        >
          {{ neg.status === 'Fechado' ? 'Fechado' : 'Em Andamento' }}
        </span>
      </div>
      <div class="pwa-neg-titulo">{{ neg.municipioOrigemNome }}-{{ neg.municipioOrigemUf }}</div>
      <div class="pwa-neg-info">
        <i class="bi bi-person"></i> {{ neg.corretorNome }}
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
