<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { negociacaoApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const carregando = ref(true)
const emAndamento = ref(0)
const fechadas = ref(0)
const recentes = ref([])

async function carregar() {
  try {
    const [abertas, encerradas] = await Promise.all([
      negociacaoApi.listar({ status: 'EmNegociacao', tamanhoPagina: 5 }),
      negociacaoApi.listar({ status: 'Fechado', tamanhoPagina: 1 })
    ])
    emAndamento.value = abertas.data.total
    fechadas.value = encerradas.data.total
    recentes.value = abertas.data.items.slice(0, 4)
  } finally {
    carregando.value = false
  }
}

function ehMinha(neg) {
  return neg.compradorId === auth.user?.id
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

onMounted(carregar)
</script>

<template>
  <div>
    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border" style="color:var(--pwa-verde)"></div>
    </div>

    <div v-else>
      <div style="margin-bottom:1.2rem">
        <div style="font-size:1.25rem;font-weight:700;color:var(--pwa-texto)">
          Olá, {{ auth.nomeUsuario.split(' ')[0] }}!
        </div>
        <div style="font-size:0.9rem;color:var(--pwa-texto-suave)">Resumo das negociações da equipe</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem">
        <div class="pwa-card" style="margin-bottom:0">
          <div class="pwa-card-body" style="text-align:center;padding:1.25rem 1rem">
            <div style="font-size:2.4rem;font-weight:800;color:var(--pwa-laranja)">{{ emAndamento }}</div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--pwa-texto-suave);text-transform:uppercase;letter-spacing:0.04em;margin-top:4px">
              Em Andamento
            </div>
          </div>
        </div>
        <div class="pwa-card" style="margin-bottom:0">
          <div class="pwa-card-body" style="text-align:center;padding:1.25rem 1rem">
            <div style="font-size:2.4rem;font-weight:800;color:var(--pwa-verde)">{{ fechadas }}</div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--pwa-texto-suave);text-transform:uppercase;letter-spacing:0.04em;margin-top:4px">
              Fechadas
            </div>
          </div>
        </div>
      </div>

      <div class="pwa-section-title">Negociações em Andamento</div>

      <div v-if="recentes.length === 0"
           style="text-align:center;color:var(--pwa-texto-suave);padding:2rem 0;font-size:0.95rem">
        <i class="bi bi-clipboard" style="font-size:2.5rem;color:var(--pwa-borda);display:block;margin-bottom:0.75rem"></i>
        Nenhuma negociação em andamento.
      </div>

      <div
        v-for="neg in recentes"
        :key="neg.id"
        class="pwa-neg-card"
        @click="router.push('/app/negociacoes/' + neg.id)"
      >
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px">
          <div class="pwa-neg-numero">{{ neg.numero }}</div>
          <span v-if="ehMinha(neg)" class="pwa-badge pwa-badge-verde" style="font-size:0.65rem">MINHA</span>
        </div>
        <div class="pwa-neg-titulo">{{ neg.municipioOrigemNome }}-{{ neg.municipioOrigemUf }}</div>
        <div class="pwa-neg-info">
          <i class="bi bi-person-circle"></i>
          <span><strong style="color:var(--pwa-texto)">Comprador:</strong> {{ neg.compradorNome }}</span>
        </div>
        <div class="pwa-neg-info" style="margin-top:3px">
          <i class="bi bi-person"></i>{{ neg.corretorNome }}
          <span style="margin-left:auto">
            <i class="bi bi-calendar3"></i> {{ fmtData(neg.dataPrevistaEntrega) }}
          </span>
        </div>
      </div>

      <button
        class="pwa-btn pwa-btn-outline"
        style="margin-top:0.5rem"
        @click="router.push('/app/negociacoes')"
      >
        <i class="bi bi-list-ul"></i>
        Ver todas as negociações
      </button>
    </div>
  </div>
</template>
