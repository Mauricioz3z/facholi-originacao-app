<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { negociacaoApi, dashboardApi } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const carregando = ref(true)
const carregandoRecentes = ref(false)
const cbAndamento = ref(0)
const cbFechadas = ref(0)
const porCategoria = ref([])
const recentes = ref([])
const apenasMinhas = ref(false)

async function carregarRecentes() {
  carregandoRecentes.value = true
  try {
    const params = { status: 'EmNegociacao', tamanhoPagina: 4 }
    if (apenasMinhas.value) params.compradorId = auth.user?.id
    const res = await negociacaoApi.listar(params)
    recentes.value = res.data.items
  } finally {
    carregandoRecentes.value = false
  }
}

async function carregar() {
  try {
    const resumo = await dashboardApi.resumoCabecas()
    cbAndamento.value = resumo.data.totalAndamento
    cbFechadas.value = resumo.data.totalFechadas
    porCategoria.value = resumo.data.porCategoria
    await carregarRecentes()
  } finally {
    carregando.value = false
  }
}

watch(apenasMinhas, () => carregarRecentes())

function ehMinha(neg) {
  return neg.compradorId === auth.user?.id
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtCb(v) {
  if (!v && v !== 0) return '—'
  return Number(v).toLocaleString('pt-BR')
}

function fmtCategoria(cat) {
  const min = Math.round(Number(cat.peso_min))
  const max = Math.round(Number(cat.peso_max))
  return `${cat.categoria} ${min}–${max} kg`
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

      <!-- Totais de cabeças -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem">
        <div class="pwa-card" style="margin-bottom:0">
          <div class="pwa-card-body" style="text-align:center;padding:1.25rem 1rem">
            <div style="font-size:2.2rem;font-weight:800;color:var(--pwa-laranja)">{{ fmtCb(cbAndamento) }}</div>
            <div style="font-size:0.7rem;font-weight:700;color:var(--pwa-texto-suave);text-transform:uppercase;letter-spacing:0.04em;margin-top:4px">
              CB em andamento
            </div>
          </div>
        </div>
        <div class="pwa-card" style="margin-bottom:0">
          <div class="pwa-card-body" style="text-align:center;padding:1.25rem 1rem">
            <div style="font-size:2.2rem;font-weight:800;color:var(--pwa-verde)">{{ fmtCb(cbFechadas) }}</div>
            <div style="font-size:0.7rem;font-weight:700;color:var(--pwa-texto-suave);text-transform:uppercase;letter-spacing:0.04em;margin-top:4px">
              CB fechadas
            </div>
          </div>
        </div>
      </div>

      <!-- CB por categoria -->
      <div class="pwa-section-title">Cabeças por Categoria</div>

      <div class="pwa-card" style="margin-bottom:1.25rem">
        <div class="pwa-card-body" style="padding:0">
          <div v-if="porCategoria.length === 0"
               style="text-align:center;color:var(--pwa-texto-suave);padding:1.5rem;font-size:0.9rem">
            Nenhum dado de categoria disponível.
          </div>
          <table v-else style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:var(--pwa-fundo)">
                <th style="padding:0.6rem 1rem;text-align:left;font-size:0.72rem;font-weight:700;color:var(--pwa-texto-suave);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--pwa-borda)">
                  Categoria
                </th>
                <th style="padding:0.6rem 0.75rem;text-align:right;font-size:0.72rem;font-weight:700;color:var(--pwa-laranja);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--pwa-borda)">
                  Em Andamento
                </th>
                <th style="padding:0.6rem 1rem;text-align:right;font-size:0.72rem;font-weight:700;color:var(--pwa-verde);text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--pwa-borda)">
                  Fechadas
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(cat, idx) in porCategoria"
                :key="cat.categoria"
                :style="idx < porCategoria.length - 1 ? 'border-bottom:1px solid var(--pwa-borda)' : ''"
              >
                <td style="padding:0.65rem 1rem;font-size:0.9rem;font-weight:600;color:var(--pwa-texto)">
                  {{ fmtCategoria(cat) }}
                </td>
                <td style="padding:0.65rem 0.75rem;text-align:right;font-size:0.9rem;font-weight:700;color:var(--pwa-laranja)">
                  {{ fmtCb(cat.cb_andamento) }}
                </td>
                <td style="padding:0.65rem 1rem;text-align:right;font-size:0.9rem;font-weight:700;color:var(--pwa-verde)">
                  {{ fmtCb(cat.cb_fechadas) }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background:var(--pwa-fundo);border-top:2px solid var(--pwa-borda)">
                <td style="padding:0.6rem 1rem;font-size:0.82rem;font-weight:700;color:var(--pwa-texto-suave)">Total</td>
                <td style="padding:0.6rem 0.75rem;text-align:right;font-size:0.88rem;font-weight:800;color:var(--pwa-laranja)">
                  {{ fmtCb(cbAndamento) }}
                </td>
                <td style="padding:0.6rem 1rem;text-align:right;font-size:0.88rem;font-weight:800;color:var(--pwa-verde)">
                  {{ fmtCb(cbFechadas) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Negociações recentes em andamento -->
      <div class="pwa-section-title">Negociações em Andamento</div>

      <!-- Filtro apenas minhas -->
      <label
        :style="{
          display:'flex',
          alignItems:'center',
          gap:'10px',
          cursor:'pointer',
          padding:'8px 12px',
          marginBottom:'0.75rem',
          userSelect:'none',
          border: '1.5px solid ' + (apenasMinhas ? 'var(--pwa-verde)' : 'var(--pwa-borda)'),
          background: apenasMinhas ? 'rgba(46,160,67,0.06)' : 'white',
          borderRadius: '10px',
          transition: 'all 0.15s ease'
        }"
      >
        <input
          type="checkbox"
          v-model="apenasMinhas"
          style="width:20px;height:20px;accent-color:var(--pwa-verde);cursor:pointer;flex-shrink:0;margin:0"
        />
        <span style="font-size:0.85rem;font-weight:600;color:var(--pwa-texto);line-height:1.2">
          Mostrar apenas as minhas negociações
        </span>
      </label>

      <div v-if="carregandoRecentes" class="text-center py-3">
        <div class="spinner-border spinner-border-sm" style="color:var(--pwa-verde)"></div>
      </div>

      <template v-else>
        <div v-if="recentes.length === 0"
             style="text-align:center;color:var(--pwa-texto-suave);padding:2rem 0;font-size:0.95rem">
          <i class="bi bi-clipboard" style="font-size:2.5rem;color:var(--pwa-borda);display:block;margin-bottom:0.75rem"></i>
          {{ apenasMinhas ? 'Você não tem negociações em andamento.' : 'Nenhuma negociação em andamento.' }}
        </div>
      </template>

      <div
        v-for="neg in (carregandoRecentes ? [] : recentes)"
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
