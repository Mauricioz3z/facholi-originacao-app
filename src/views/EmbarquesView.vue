<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { negociacaoApi, embarqueApi } from '../services/api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const negociacaoId = Number(route.params.id)

const neg = ref(null)
const embarques = ref([])
const carregando = ref(false)

async function carregar() {
  carregando.value = true
  try {
    const [resNeg, resEmb] = await Promise.all([
      negociacaoApi.obter(negociacaoId),
      embarqueApi.listar(negociacaoId)
    ])
    neg.value = resNeg.data
    embarques.value = resEmb.data
  } finally {
    carregando.value = false
  }
}

function resumoCategorias(emb) {
  return emb.itens.map(i => `${i.categoriaNome}: ${i.qtdEmbarcada}`).join(', ')
}

function totalEmbarcado(emb) {
  return emb.itens.reduce((s, i) => s + i.qtdEmbarcada, 0)
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function statusBadge(emb) {
  return emb.statusChegada === 'Recebido' ? 'badge bg-success' : 'badge bg-warning text-dark'
}

async function excluir(emb) {
  if (!confirm(`Excluir o embarque ${emb.numero}?`)) return
  try {
    await embarqueApi.excluir(emb.id)
    await carregar()
  } catch (e) {
    alert(e.response?.data?.mensagem || 'Erro ao excluir embarque.')
  }
}

const saldoNegociacao = computed(() => {
  if (!neg.value?.itens) return { negociado: 0, recebido: 0 }
  const negociado = neg.value.itens.reduce((s, i) => s + (i.qtdNegociada || 0), 0)
  const recebido = neg.value.itens.reduce((s, i) => s + (i.qtdEntregue || 0), 0)
  return { negociado, recebido }
})

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div class="d-flex align-items-center gap-2">
        <router-link :to="`/negociacoes/${negociacaoId}`" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left"></i>
        </router-link>
        <div>
          <h4 class="fw-bold mb-0">Embarques</h4>
          <span class="text-muted small" v-if="neg">Negociação {{ neg.numero }} — {{ neg.compradorNome }}</span>
        </div>
      </div>
      <router-link v-if="auth.isAdmin" :to="`/negociacoes/${negociacaoId}/embarques/novo`" class="btn btn-primary">
        <i class="bi bi-plus-lg me-1"></i> Novo Embarque
      </router-link>
    </div>

    <div v-if="neg" class="mb-3 d-flex align-items-center gap-2">
      <span class="text-muted small">Saldo da negociação: {{ saldoNegociacao.negociado - saldoNegociacao.recebido }} CB</span>
      <div class="progress flex-grow-1" style="max-width: 260px; height: 8px;">
        <div class="progress-bar bg-success" :style="{ width: (saldoNegociacao.negociado ? saldoNegociacao.recebido / saldoNegociacao.negociado * 100 : 0) + '%' }"></div>
      </div>
      <span class="small fw-semibold">{{ saldoNegociacao.recebido }}/{{ saldoNegociacao.negociado }}</span>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <div v-else-if="embarques.length === 0" class="text-center text-muted py-5">Nenhum embarque criado ainda.</div>
        <table v-else class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Emb.</th>
              <th>Produtor</th>
              <th>Categorias</th>
              <th class="text-end">Qtd.</th>
              <th>Data</th>
              <th>NF</th>
              <th>GTA</th>
              <th>Chegada</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emb in embarques" :key="emb.id">
              <td class="fw-semibold">{{ emb.numero }}</td>
              <td>{{ emb.produtorOrigem }}</td>
              <td class="small text-muted">{{ resumoCategorias(emb) }}</td>
              <td class="text-end">{{ totalEmbarcado(emb) }}</td>
              <td class="text-muted small">{{ fmtData(emb.dataEmbarque) }}</td>
              <td>{{ emb.nf || '—' }}</td>
              <td>{{ emb.gta || '—' }}</td>
              <td><span :class="statusBadge(emb)">{{ emb.statusChegada === 'Recebido' ? 'Recebido' : 'Pendente' }}</span></td>
              <td class="text-end">
                <router-link
                  v-if="auth.isAdmin && !emb.chegadaConfirmadaEm"
                  :to="`/embarques/${emb.id}/editar`"
                  class="btn btn-sm btn-outline-secondary me-1"
                  title="Editar"
                ><i class="bi bi-pencil"></i></router-link>
                <router-link v-if="auth.isAdmin" :to="`/embarques/${emb.id}/conferencia`" class="btn btn-sm btn-outline-primary me-1">
                  Conferência
                </router-link>
                <button
                  v-if="auth.isAdmin && !emb.chegadaConfirmadaEm"
                  class="btn btn-sm btn-outline-danger"
                  title="Excluir"
                  @click="excluir(emb)"
                ><i class="bi bi-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
