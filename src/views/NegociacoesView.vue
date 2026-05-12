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
  status: 'Todos',
  compradorId: '',
  corretorId: '',
  uf: '',
  apenasMinhas: false,
  pagina: 1,
  tamanhoPagina: 20
})

async function carregar() {
  carregando.value = true
  try {
    const params = {
      status: filtros.value.status !== 'Todos' ? filtros.value.status : undefined,
      compradorId: filtros.value.apenasMinhas ? auth.user?.id : (filtros.value.compradorId || undefined),
      corretorId: filtros.value.corretorId || undefined,
      uf: filtros.value.uf || undefined,
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

function statusBadge(s) {
  return s === 'Fechado' ? 'badge bg-success' : 'badge bg-warning text-dark'
}

function statusLabel(s) {
  return s === 'Fechado' ? 'Fechado' : 'Em Negociação'
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
              <option value="Todos">Todos os status</option>
              <option value="EmNegociacao">Em Negociação</option>
              <option value="Fechado">Fechado</option>
            </select>
          </div>
          <div class="col-md-2 d-flex gap-2 align-items-center">
            <button class="btn btn-primary btn-sm flex-grow-1" @click="filtros.pagina = 1; carregar()">Filtrar</button>
          </div>
          <div class="col-12 d-flex align-items-center">
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
                <th>Criado em</th>
                <th>Entrega Prev.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="neg in negociacoes" :key="neg.id">
                <td class="fw-semibold">{{ neg.numero }}</td>
                <td><span :class="statusBadge(neg.status)">{{ statusLabel(neg.status) }}</span></td>
                <td>{{ neg.compradorNome }}</td>
                <td>{{ neg.corretorNome }}</td>
                <td>{{ neg.municipioOrigemNome }}-{{ neg.municipioOrigemUf }}</td>
                <td class="text-end fw-semibold">{{ totalCabecas(neg).toLocaleString('pt-BR') }}</td>
                <td class="text-muted small">{{ fmtData(neg.criadoEm) }}</td>
                <td class="text-muted small">{{ fmtData(neg.dataPrevistaEntrega) }}</td>
                <td class="text-end">
                  <router-link :to="`/negociacoes/${neg.id}`" class="btn btn-sm btn-outline-primary me-1" title="Visualizar">
                    <i class="bi bi-eye"></i>
                  </router-link>
                  <router-link v-if="neg.status === 'EmNegociacao'" :to="`/negociacoes/${neg.id}/editar`" class="btn btn-sm btn-outline-secondary me-1" title="Editar">
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
