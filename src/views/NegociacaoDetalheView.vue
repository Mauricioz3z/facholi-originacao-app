<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { negociacaoApi } from '../services/api'

const route = useRoute()
const router = useRouter()
const neg = ref(null)
const carregando = ref(false)
const salvandoEntrega = ref(false)
const fechando = ref(false)
const excluindo = ref(false)
const erro = ref('')
const entregaItens = ref([])

async function carregar() {
  carregando.value = true
  try {
    const res = await negociacaoApi.obter(route.params.id)
    neg.value = res.data
    entregaItens.value = res.data.itens.map(i => ({
      itemId: i.id,
      qtdEntregue: i.qtdEntregue || 0
    }))
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

async function salvarEntrega() {
  salvandoEntrega.value = true
  try {
    await negociacaoApi.atualizarEntrega({
      negociacaoId: Number(route.params.id),
      itens: entregaItens.value
    })
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao atualizar entrega.'
  } finally {
    salvandoEntrega.value = false
  }
}

function entregaParaItem(itemId) {
  return entregaItens.value.find(e => e.itemId === itemId)
}

function statusEntregaBadge(s) {
  const map = { 'Concluido': 'bg-success', 'Parcial': 'bg-warning text-dark', 'Pendente': 'bg-secondary' }
  return 'badge ' + (map[s] || 'bg-secondary')
}

function statusLabel(s) {
  const map = { 'Concluido': 'Concluído', 'Parcial': 'Parcial', 'Pendente': 'Pendente' }
  return map[s] || s
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtKg(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(4).replace('.', ',')}/kg`
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
            <span :class="neg.status === 'Fechado' ? 'badge bg-success' : 'badge bg-warning text-dark'">
              {{ neg.status === 'Fechado' ? 'Fechado' : 'Em Negociação' }}
            </span>
          </div>
        </div>
        <div class="d-flex gap-2">
          <router-link v-if="neg.status === 'EmNegociacao'" :to="`/negociacoes/${neg.id}/editar`" class="btn btn-outline-secondary btn-sm">
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

      <!-- Controle de Entrega (apenas para fechadas) -->
      <div v-if="neg.status === 'Fechado'" class="card">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold">Controle de Entrega</span>
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted small">Conclusão geral:</span>
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
                <th class="text-end">Qtd. Entregue</th>
                <th class="text-center">% Conclusão</th>
                <th>Status Entrega</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in neg.itens" :key="item.id">
                <td class="fw-semibold">{{ item.categoriaNome }}</td>
                <td class="text-end">{{ item.qtdNegociada?.toLocaleString('pt-BR') || '—' }}</td>
                <td class="text-end">
                  <input
                    v-if="entregaParaItem(item.id)"
                    v-model.number="entregaParaItem(item.id).qtdEntregue"
                    type="number" min="0" :max="item.qtdNegociada"
                    class="form-control form-control-sm text-end d-inline-block"
                    style="width: 90px"
                  />
                </td>
                <td class="text-center">
                  <div class="progress" style="height:6px">
                    <div class="progress-bar" :style="{ width: (item.percentualConclusao || 0) + '%' }"></div>
                  </div>
                  <small>{{ item.percentualConclusao || 0 }}%</small>
                </td>
                <td>
                  <span :class="statusEntregaBadge(item.statusEntrega)">{{ statusLabel(item.statusEntrega) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="card-footer bg-white">
          <div v-if="erro" class="alert alert-danger py-2 mb-2 small">{{ erro }}</div>
          <button class="btn btn-primary btn-sm" @click="salvarEntrega" :disabled="salvandoEntrega">
            <span v-if="salvandoEntrega" class="spinner-border spinner-border-sm me-1"></span>
            Salvar Entrega
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
