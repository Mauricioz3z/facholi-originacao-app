<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { negociacaoApi, usuariosApi, corretoresApi } from '../services/api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const negociacoes = ref([])
const total = ref(0)
const carregando = ref(false)
const listaCompradores = ref([])
const listaCorretores = ref([])

const filtros = ref({
  status: '', // '' = padrão (oculta Concluídas), 'Todos' = literalmente tudo
  compradorId: '',
  corretorId: '',
  uf: '',
  dataInicio: '',
  dataFim: '',
  comissao: '',
  apenasMinhas: false,
  pagina: 1,
  tamanhoPagina: 20
})

async function carregar() {
  carregando.value = true
  try {
    const params = {
      status: filtros.value.status || undefined,
      compradorId: filtros.value.apenasMinhas ? auth.user?.id : (filtros.value.compradorId || undefined),
      corretorId: filtros.value.corretorId || undefined,
      uf: filtros.value.uf || undefined,
      dataInicio: filtros.value.dataInicio || undefined,
      dataFim: filtros.value.dataFim || undefined,
      comissao: filtros.value.comissao || undefined,
      pagina: filtros.value.pagina,
      tamanhoPagina: filtros.value.tamanhoPagina
    }
    const res = await negociacaoApi.listar(params)
    negociacoes.value = res.data.items
    total.value = res.data.total
  } finally {
    carregando.value = false
  }
}

function aoMarcarMinhas() {
  if (filtros.value.apenasMinhas) filtros.value.compradorId = ''
  filtros.value.pagina = 1
  carregar()
}

async function carregarFiltros() {
  const [u, c] = await Promise.all([
    usuariosApi.listar({ ativo: true }),
    corretoresApi.listar({ ativo: true })
  ])
  listaCompradores.value = u.data
  listaCorretores.value = c.data
}

const statusInfo = {
  EmNegociacao: { label: 'Em Negociação', badge: 'badge-andamento' },
  Fechado: { label: 'Fechado', badge: 'bg-success' },
  EmEntrega: { label: 'Em Entrega', badge: 'bg-info text-dark' },
  Concluido: { label: 'Concluído', badge: 'bg-secondary' }
}

function statusBadge(neg) {
  return 'badge ' + (statusInfo[neg.status]?.badge || 'bg-light text-dark')
}

function statusLabel(neg) {
  return statusInfo[neg.status]?.label || neg.status
}

function saldo(neg) {
  if (!neg?.itens?.length) return 0
  const qtdNeg = neg.itens.reduce((s, i) => s + (i.qtdNegociada || 0), 0)
  const qtdEnt = neg.itens.reduce((s, i) => s + (i.qtdEntregue || 0), 0)
  return qtdNeg - qtdEnt
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtKg(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function totalCabecas(neg) {
  if (!neg?.itens?.length) return 0
  return neg.itens.reduce((s, i) => s + (i.qtdNegociada || 0), 0)
}

function paginar(p) {
  filtros.value.pagina = p
  carregar()
}

async function excluir(neg) {
  if (!confirm(`Confirma a exclusão da negociação ${neg.numero}? Esta ação não pode ser desfeita.`)) return
  try {
    await negociacaoApi.excluir(neg.id)
    await carregar()
  } catch (e) {
    alert(e.response?.data?.mensagem || 'Erro ao excluir negociação.')
  }
}

const totalPaginas = () => Math.ceil(total.value / filtros.value.tamanhoPagina)

onMounted(() => {
  carregarFiltros()
  carregar()
})
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">Negociações</h4>
      <router-link to="/negociacoes/nova" class="btn btn-primary">
        <i class="bi bi-plus-lg me-1"></i> Nova Negociação
      </router-link>
    </div>

    <!-- Filtros -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-3">
            <select v-model="filtros.compradorId" class="form-select form-select-sm">
              <option value="">Todos os compradores</option>
              <option v-for="u in listaCompradores" :key="u.id" :value="u.id">{{ u.nome }}</option>
            </select>
          </div>
          <div class="col-md-3">
            <select v-model="filtros.corretorId" class="form-select form-select-sm">
              <option value="">Todos os corretores</option>
              <option v-for="c in listaCorretores" :key="c.id" :value="c.id">{{ c.nome }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <input v-model="filtros.uf" class="form-control form-control-sm" placeholder="UF de origem" maxlength="2" />
          </div>
          <div class="col-md-2">
            <select v-model="filtros.status" class="form-select form-select-sm">
              <option value="">Em aberto (padrão)</option>
              <option value="EmNegociacao">Em Negociação</option>
              <option value="Fechado">Fechado</option>
              <option value="EmEntrega">Em Entrega</option>
              <option value="Concluido">Concluído</option>
              <option value="Todos">Todos os status</option>
            </select>
          </div>
          <div class="col-md-2">
            <select v-model="filtros.comissao" class="form-select form-select-sm">
              <option value="">Comissão: todas</option>
              <option value="Paga">Comissão paga</option>
              <option value="NaoPaga">Comissão pendente</option>
            </select>
          </div>
          <div class="col-md-2">
            <input v-model="filtros.dataInicio" type="date" class="form-control form-control-sm" title="Criado a partir de" />
          </div>
          <div class="col-md-2">
            <input v-model="filtros.dataFim" type="date" class="form-control form-control-sm" title="Criado até" />
          </div>
          <div class="col-md-2 d-flex gap-2 align-items-center">
            <button class="btn btn-primary btn-sm flex-grow-1" @click="filtros.pagina = 1; carregar()">Filtrar</button>
          </div>
          <div class="col-12 d-flex align-items-center gap-4">
            <div class="form-check mb-0">
              <input
                class="form-check-input"
                type="checkbox"
                id="apenasMinhas"
                v-model="filtros.apenasMinhas"
                @change="aoMarcarMinhas"
              />
              <label class="form-check-label fw-semibold" for="apenasMinhas">
                Apenas minhas negociações
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabela -->
    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5">
          <div class="spinner-border text-primary"></div>
        </div>
        <div v-else-if="negociacoes.length === 0" class="text-center text-muted py-5">
          Nenhuma negociação encontrada.
        </div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Número</th>
                <th>Status</th>
                <th>Comprador</th>
                <th>Corretor</th>
                <th>Origem</th>
                <th class="text-end">Cabeças</th>
                <th class="text-end">Saldo</th>
                <th>Comissão</th>
                <th>Criado em</th>
                <th>Entrega Prev.</th>
                <th style="min-width:180px">Observações</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="neg in negociacoes" :key="neg.id">
                <td class="fw-semibold">{{ neg.numero }}</td>
                <td><span :class="statusBadge(neg)">{{ statusLabel(neg) }}</span></td>
                <td>{{ neg.compradorNome }}</td>
                <td>{{ neg.corretorNome }}</td>
                <td>{{ neg.municipioOrigemNome }}-{{ neg.municipioOrigemUf }}</td>
                <td class="text-end fw-semibold">{{ totalCabecas(neg).toLocaleString('pt-BR') }}</td>
                <td class="text-end">{{ saldo(neg).toLocaleString('pt-BR') }}</td>
                <td><span :class="neg.comissaoPaga ? 'badge bg-success' : 'badge bg-warning text-dark'">{{ neg.comissaoPaga ? 'Paga' : 'Pendente' }}</span></td>
                <td class="text-muted small">{{ fmtData(neg.criadoEm) }}</td>
                <td class="text-muted small">{{ fmtData(neg.dataPrevistaEntrega) }}</td>
                <td class="small">
                  <span v-if="neg.observacoes" class="obs-cell text-muted" :title="neg.observacoes">{{ neg.observacoes }}</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="text-end">
                  <router-link :to="`/negociacoes/${neg.id}`" class="btn btn-sm btn-outline-primary me-1" title="Visualizar">
                    <i class="bi bi-eye"></i>
                  </router-link>
                  <router-link v-if="neg.status === 'EmNegociacao' || auth.isAdmin" :to="`/negociacoes/${neg.id}/editar`" class="btn btn-sm btn-outline-secondary me-1" title="Editar">
                    <i class="bi bi-pencil"></i>
                  </router-link>
                  <button class="btn btn-sm btn-outline-danger" title="Excluir" @click="excluir(neg)">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div v-if="total > filtros.tamanhoPagina" class="card-footer d-flex justify-content-between align-items-center">
        <span class="text-muted small">{{ total }} registro(s)</span>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" :class="{ disabled: filtros.pagina === 1 }">
              <button class="page-link" @click="paginar(filtros.pagina - 1)">«</button>
            </li>
            <li v-for="p in totalPaginas()" :key="p" class="page-item" :class="{ active: p === filtros.pagina }">
              <button class="page-link" @click="paginar(p)">{{ p }}</button>
            </li>
            <li class="page-item" :class="{ disabled: filtros.pagina >= totalPaginas() }">
              <button class="page-link" @click="paginar(filtros.pagina + 1)">»</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</template>

<style scoped>
.obs-cell {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
  max-width: 280px;
  line-height: 1.25;
  cursor: help;
}
</style>
