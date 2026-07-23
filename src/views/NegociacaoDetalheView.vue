<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { negociacaoApi } from '../services/api'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const neg = ref(null)
const carregando = ref(false)
const fechando = ref(false)
const excluindo = ref(false)
const alterandoStatus = ref(false)
const alterandoComissao = ref(false)
const erro = ref('')
const novoStatus = ref('')
const motivoStatus = ref('')

const statusInfo = {
  EmNegociacao: { label: 'Em Negociação', badge: 'badge-andamento' },
  Fechado: { label: 'Fechado', badge: 'bg-success' },
  EmEntrega: { label: 'Em Entrega', badge: 'bg-info text-dark' },
  Concluido: { label: 'Concluído', badge: 'bg-secondary' }
}

async function carregar() {
  carregando.value = true
  try {
    const res = await negociacaoApi.obter(route.params.id)
    neg.value = res.data
    novoStatus.value = res.data.status
  } finally {
    carregando.value = false
  }
}

async function fechar() {
  if (!confirm('Confirma o fechamento desta negociação? Os valores serão congelados.')) return
  fechando.value = true
  try {
    await negociacaoApi.fechar(route.params.id)
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao fechar negociação.'
  } finally {
    fechando.value = false
  }
}

async function excluir() {
  if (!confirm(`Confirma a exclusão da negociação ${neg.value?.numero}? Esta ação não pode ser desfeita.`)) return
  excluindo.value = true
  try {
    await negociacaoApi.excluir(route.params.id)
    router.push('/negociacoes')
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao excluir negociação.'
  } finally {
    excluindo.value = false
  }
}

async function alterarStatus() {
  if (novoStatus.value === neg.value.status) return
  alterandoStatus.value = true
  erro.value = ''
  try {
    await negociacaoApi.alterarStatus(route.params.id, novoStatus.value, motivoStatus.value || null)
    motivoStatus.value = ''
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao alterar status.'
  } finally {
    alterandoStatus.value = false
  }
}

async function alternarComissao() {
  alterandoComissao.value = true
  erro.value = ''
  try {
    await negociacaoApi.alterarComissao(route.params.id, !neg.value.comissaoPaga)
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao atualizar comissão.'
  } finally {
    alterandoComissao.value = false
  }
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtKg(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}/kg`
}

const percentualTotal = computed(() => {
  if (!neg.value?.itens) return 0
  const qtdNeg = neg.value.itens.reduce((s, i) => s + (i.qtdNegociada || 0), 0)
  const qtdEnt = neg.value.itens.reduce((s, i) => s + (i.qtdEntregue || 0), 0)
  if (qtdNeg === 0) return 0
  return Math.round(qtdEnt / qtdNeg * 100)
})

onMounted(carregar)
</script>

<template>
  <div>
    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="neg">
      <!-- Cabeçalho -->
      <div class="d-flex justify-content-between align-items-start mb-4">
        <div class="d-flex align-items-center gap-2">
          <router-link to="/negociacoes" class="btn btn-sm btn-outline-secondary">
            <i class="bi bi-arrow-left"></i>
          </router-link>
          <div>
            <h4 class="fw-bold mb-0">Negociação {{ neg.numero }}</h4>
            <span :class="'badge ' + statusInfo[neg.status]?.badge">{{ statusInfo[neg.status]?.label || neg.status }}</span>
            <span class="badge bg-light text-dark border ms-1">{{ neg.tipoNegocio }}</span>
            <span
              class="badge ms-1"
              :class="neg.comissaoPaga ? 'bg-success' : 'bg-warning text-dark'"
            >Comissão {{ neg.comissaoPaga ? 'paga' : 'pendente' }}</span>
          </div>
        </div>
        <div class="d-flex gap-2">
          <router-link v-if="neg.status !== 'EmNegociacao'" :to="`/negociacoes/${neg.id}/produtores`" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-diagram-3 me-1"></i> Desmembramento
          </router-link>
          <router-link v-if="neg.status !== 'EmNegociacao'" :to="`/negociacoes/${neg.id}/embarques`" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-truck me-1"></i> Embarques
          </router-link>
          <router-link v-if="neg.status === 'EmNegociacao' || auth.isAdmin" :to="`/negociacoes/${neg.id}/editar`" class="btn btn-outline-secondary btn-sm">
            <i class="bi bi-pencil me-1"></i> Editar
          </router-link>
          <button v-if="neg.status === 'EmNegociacao'" class="btn btn-success btn-sm" @click="fechar" :disabled="fechando">
            <span v-if="fechando" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check-circle me-1"></i> Fechar Negociação
          </button>
          <button class="btn btn-outline-danger btn-sm" @click="excluir" :disabled="excluindo">
            <span v-if="excluindo" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-trash me-1"></i> Excluir
          </button>
        </div>
      </div>

      <div v-if="erro" class="alert alert-danger py-2 mb-3 small">{{ erro }}</div>

      <!-- Resumo -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <p class="text-muted small mb-1">Comprador</p>
              <p class="fw-semibold mb-0">{{ neg.compradorNome }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <p class="text-muted small mb-1">Corretor / Fornecedor</p>
              <p class="fw-semibold mb-0">{{ neg.corretorNome }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <p class="text-muted small mb-1">Origem → Destino</p>
              <p class="fw-semibold mb-0">{{ neg.municipioOrigemNome }}-{{ neg.municipioOrigemUf }} → {{ neg.municipioDestinoNome }}</p>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card h-100">
            <div class="card-body">
              <p class="text-muted small mb-1">Entrega Prevista</p>
              <p class="fw-semibold mb-0">{{ fmtData(neg.dataPrevistaEntrega) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Observações -->
      <div v-if="neg.observacoes" class="card mb-4">
        <div class="card-header bg-white fw-semibold">Observações</div>
        <div class="card-body">
          <p class="mb-0" style="white-space: pre-wrap; word-break: break-word;">{{ neg.observacoes }}</p>
        </div>
      </div>

      <!-- Itens da negociação -->
      <div class="card mb-4">
        <div class="card-header bg-white fw-semibold">Itens Negociados</div>
        <div class="card-body p-0">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Categoria</th>
                <th>Faixa (kg)</th>
                <th class="text-end">Qtd.</th>
                <th class="text-end">Peso Médio</th>
                <th class="text-end">R$/kg Negociado (praça)</th>
                <th class="text-end">R$/kg Colocado (fazenda)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in neg.itens" :key="item.id">
                <td class="fw-semibold">{{ item.categoriaNome }}</td>
                <td class="text-muted small">{{ item.pesoMin }}–{{ item.pesoMax }}</td>
                <td class="text-end">{{ item.qtdNegociada?.toLocaleString('pt-BR') || '—' }}</td>
                <td class="text-end">{{ item.pesoMedio ? item.pesoMedio.toFixed(1).replace('.', ',') + ' kg' : '—' }}</td>
                <td class="text-end preco-praca">{{ fmtKg(item.precoNegociado) }}</td>
                <td class="text-end preco-colocado">{{ fmtKg(item.precoColocado) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Saldo de entrega (somente leitura — a baixa é feita via Embarques/Chegada) -->
      <div v-if="neg.status !== 'EmNegociacao'" class="card mb-4">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold">Saldo de Entrega</span>
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted small">Recebido:</span>
            <div class="progress" style="width: 120px; height: 8px;">
              <div class="progress-bar" :class="percentualTotal >= 100 ? 'bg-success' : 'bg-primary'"
                   :style="{ width: percentualTotal + '%' }"></div>
            </div>
            <span class="fw-bold">{{ percentualTotal }}%</span>
          </div>
        </div>
        <div class="card-body p-0">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Categoria</th>
                <th class="text-end">Qtd. Negociada</th>
                <th class="text-end">Qtd. Recebida</th>
                <th class="text-end">Saldo</th>
                <th class="text-center">%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in neg.itens" :key="item.id">
                <td class="fw-semibold">{{ item.categoriaNome }}</td>
                <td class="text-end">{{ item.qtdNegociada?.toLocaleString('pt-BR') || '—' }}</td>
                <td class="text-end">{{ (item.qtdEntregue || 0).toLocaleString('pt-BR') }}</td>
                <td class="text-end">{{ ((item.qtdNegociada || 0) - (item.qtdEntregue || 0)).toLocaleString('pt-BR') }}</td>
                <td class="text-center">{{ item.percentualConclusao || 0 }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-footer bg-white small text-muted">
          A baixa de saldo é automática, feita ao registrar a chegada dos embarques.
        </div>
      </div>

      <!-- Ações do Master -->
      <div v-if="auth.isAdmin" class="card">
        <div class="card-header bg-white fw-semibold">Ações do Master</div>
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label class="form-label small fw-semibold">Alterar status</label>
              <select v-model="novoStatus" class="form-select form-select-sm">
                <option value="EmNegociacao">Em Negociação</option>
                <option value="Fechado">Fechado</option>
                <option value="EmEntrega">Em Entrega</option>
                <option value="Concluido">Concluído</option>
              </select>
            </div>
            <div class="col-md-5">
              <label class="form-label small fw-semibold">Motivo (opcional)</label>
              <input v-model="motivoStatus" class="form-control form-control-sm" placeholder="Ex.: encerrado com 49 de 50 cabeças" />
            </div>
            <div class="col-md-3">
              <button
                class="btn btn-primary btn-sm w-100"
                :disabled="alterandoStatus || novoStatus === neg.status"
                @click="alterarStatus"
              >
                <span v-if="alterandoStatus" class="spinner-border spinner-border-sm me-1"></span>
                Alterar Status
              </button>
            </div>
          </div>
          <hr />
          <button class="btn btn-outline-secondary btn-sm" :disabled="alterandoComissao" @click="alternarComissao">
            <span v-if="alterandoComissao" class="spinner-border spinner-border-sm me-1"></span>
            Marcar comissão como {{ neg.comissaoPaga ? 'não paga' : 'paga' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
