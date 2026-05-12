<script setup>
import { ref, onMounted } from 'vue'
import { dashboardApi, usuariosApi, corretoresApi } from '../services/api'

const visao = ref('compradores')
const compradores = ref([])
const corretores = ref([])
const listaCompradores = ref([])
const listaCorretores = ref([])
const carregando = ref(false)
const cbAndamento = ref(0)
const cbFechadas = ref(0)
const porCategoriaCb = ref([])

const filtros = ref({
  compradorId: '',
  corretorId: '',
  uf: '',
  status: 'Todos'
})

const expandidosComprador = ref(new Set())
const expandidosCorretor = ref(new Set())
const negociacoesPorComprador = ref({})
const detalheComprador = ref({})
const carregandoNegociacoes = ref(new Set())

// Totais gerais
const totais = ref(null)
const carregandoTotais = ref(false)

// Por Categoria
const categorias = ref([])
const expandidosCategoria = ref(new Set())
const detalheCategorias = ref({})
const carregandoDetalheCategoria = ref(new Set())

function calcularAgregadosCorretor(categorias) {
  let qtd = 0
  let pesoQtd = 0
  let numNeg = 0
  let numCol = 0
  for (const c of categorias) {
    const q = Number(c.qtd_total) || 0
    const peso = Number(c.peso_medio) || 0
    qtd += q
    pesoQtd += q * peso
    numNeg += q * peso * (Number(c.preco_negociado_medio) || 0)
    numCol += q * peso * (Number(c.preco_colocado_medio) || 0)
  }
  return {
    qtdTotal: qtd,
    precoNegociadoMedio: pesoQtd > 0 ? numNeg / pesoQtd : null,
    precoColocadoMedio: pesoQtd > 0 ? numCol / pesoQtd : null,
    pesoMedio: qtd > 0 ? pesoQtd / qtd : null
  }
}

function params() {
  return {
    compradorId: filtros.value.compradorId || undefined,
    corretorId: filtros.value.corretorId || undefined,
    uf: filtros.value.uf || undefined,
    status: filtros.value.status !== 'Todos' ? filtros.value.status : undefined
  }
}

async function carregarTotais() {
  carregandoTotais.value = true
  try {
    const res = await dashboardApi.totais(params())
    totais.value = res.data
  } finally {
    carregandoTotais.value = false
  }
}

async function carregarDados() {
  carregando.value = true
  expandidosComprador.value = new Set()
  expandidosCorretor.value = new Set()
  expandidosCategoria.value = new Set()
  negociacoesPorComprador.value = {}
  detalheCategorias.value = {}
  try {
    if (visao.value === 'compradores') {
      const res = await dashboardApi.porComprador(params())
      compradores.value = res.data
    } else if (visao.value === 'corretores') {
      const res = await dashboardApi.porCorretor(params())
      const grupos = {}
      for (const row of res.data) {
        if (!grupos[row.corretor_id]) {
          grupos[row.corretor_id] = {
            corretor_id: row.corretor_id,
            corretor_nome: row.corretor_nome,
            categorias: []
          }
        }
        grupos[row.corretor_id].categorias.push(row)
      }
      corretores.value = Object.values(grupos).map(g => ({
        ...g,
        agregados: calcularAgregadosCorretor(g.categorias)
      }))
    } else {
      const res = await dashboardApi.porCategoria(params())
      categorias.value = res.data
    }
  } finally {
    carregando.value = false
  }
}

async function toggleExpansaoCategoria(categoriaId) {
  if (expandidosCategoria.value.has(categoriaId)) {
    expandidosCategoria.value.delete(categoriaId)
    return
  }
  expandidosCategoria.value.add(categoriaId)
  if (detalheCategorias.value[categoriaId]) return

  carregandoDetalheCategoria.value.add(categoriaId)
  try {
    const res = await dashboardApi.detalhePorCategoria(categoriaId, params())
    detalheCategorias.value = { ...detalheCategorias.value, [categoriaId]: res.data }
  } finally {
    carregandoDetalheCategoria.value.delete(categoriaId)
  }
}

async function carregarFiltros() {
  const [u, c] = await Promise.all([
    usuariosApi.listar({ ativo: true }),
    corretoresApi.listar({ ativo: true })
  ])
  listaCompradores.value = u.data
  listaCorretores.value = c.data
}

async function toggleExpansaoComprador(compradorId) {
  if (expandidosComprador.value.has(compradorId)) {
    expandidosComprador.value.delete(compradorId)
    return
  }
  expandidosComprador.value.add(compradorId)
  if (detalheComprador.value[compradorId]) return

  carregandoNegociacoes.value.add(compradorId)
  try {
    const res = await dashboardApi.categoriasPorComprador(compradorId, params())
    detalheComprador.value = { ...detalheComprador.value, [compradorId]: res.data }
  } finally {
    carregandoNegociacoes.value.delete(compradorId)
  }
}

function toggleExpansaoCorretor(corretorId) {
  if (expandidosCorretor.value.has(corretorId)) expandidosCorretor.value.delete(corretorId)
  else expandidosCorretor.value.add(corretorId)
}

function fmt(v) {
  if (!v && v !== 0) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtKg(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(4).replace('.', ',')}/kg`
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function totalCabecasNeg(neg) {
  if (!neg?.itens?.length) return 0
  return neg.itens.reduce((s, i) => s + (i.qtdNegociada || 0), 0)
}

function fmtCategoria(cat) {
  const min = Math.round(Number(cat.peso_min))
  const max = Math.round(Number(cat.peso_max))
  return `${cat.categoria} ${min}–${max} kg`
}

function agruparPorCorretor(rows) {
  const grupos = []
  const map = {}
  for (const row of rows) {
    if (!map[row.corretor_id]) {
      map[row.corretor_id] = { corretor_id: row.corretor_id, corretor_nome: row.corretor_nome, itens: [] }
      grupos.push(map[row.corretor_id])
    }
    map[row.corretor_id].itens.push(row)
  }
  return grupos
}

function statusBadge(s) {
  return s === 'Fechado' ? 'badge bg-success' : 'badge badge-andamento'
}

function statusLabel(s) {
  return s === 'Fechado' ? 'Fechado' : 'Em Negociação'
}

async function carregarResumoCabecas() {
  const res = await dashboardApi.resumoCabecas()
  cbAndamento.value = res.data.totalAndamento
  cbFechadas.value = res.data.totalFechadas
  porCategoriaCb.value = res.data.porCategoria
}

onMounted(() => {
  carregarFiltros()
  carregarDados()
  carregarTotais()
  carregarResumoCabecas()
})
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="fw-bold mb-0">Dashboard — Resumo de Negociações</h4>
    </div>

    <!-- Resumo de Cabeças -->
    <div class="card mb-4 shadow-sm border-0">
      <div class="card-header bg-white fw-semibold">Cabeças por Categoria</div>
      <div class="card-body">
        <div class="row g-3 mb-3">
          <div class="col-6 col-md-3">
            <div class="rounded-3 text-center py-3 px-2" style="background:#fff8f0;border:1px solid #fddcb5">
              <div style="font-size:1.9rem;font-weight:800;color:#e67e22;line-height:1">{{ cbAndamento.toLocaleString('pt-BR') }}</div>
              <div class="small fw-semibold text-uppercase mt-1" style="color:#b3621a;letter-spacing:.04em">Em Andamento</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="rounded-3 text-center py-3 px-2" style="background:#f0fff5;border:1px solid #b2dfca">
              <div style="font-size:1.9rem;font-weight:800;color:#27ae60;line-height:1">{{ cbFechadas.toLocaleString('pt-BR') }}</div>
              <div class="small fw-semibold text-uppercase mt-1" style="color:#1a7a43;letter-spacing:.04em">Fechadas</div>
            </div>
          </div>
        </div>
        <table class="table table-sm mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th>Categoria</th>
              <th class="text-end" style="color:#e67e22">Em Andamento</th>
              <th class="text-end" style="color:#27ae60">Fechadas</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in porCategoriaCb" :key="cat.categoria">
              <td class="fw-semibold">{{ fmtCategoria(cat) }}</td>
              <td class="text-end fw-bold" style="color:#e67e22">{{ Number(cat.cb_andamento).toLocaleString('pt-BR') }}</td>
              <td class="text-end fw-bold" style="color:#27ae60">{{ Number(cat.cb_fechadas).toLocaleString('pt-BR') }}</td>
            </tr>
          </tbody>
          <tfoot v-if="porCategoriaCb.length">
            <tr class="table-light fw-bold">
              <td>Total</td>
              <td class="text-end" style="color:#e67e22">{{ cbAndamento.toLocaleString('pt-BR') }}</td>
              <td class="text-end" style="color:#27ae60">{{ cbFechadas.toLocaleString('pt-BR') }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    <!-- Totalizador geral -->
    <div class="card mb-4 border-0 shadow-sm" style="background:linear-gradient(135deg,#1a5f2a 0%,#2ecc71 100%)">
      <div class="card-body py-3">
        <div v-if="carregandoTotais" class="text-center text-white py-1">
          <div class="spinner-border spinner-border-sm"></div>
        </div>
        <div v-else-if="totais" class="row g-0 text-white text-center">
          <div class="col border-end border-white border-opacity-25">
            <div style="font-size:1.7rem;font-weight:800;line-height:1">
              {{ totais.qtd_total ? Number(totais.qtd_total).toLocaleString('pt-BR') : '—' }}
            </div>
            <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;opacity:.85;margin-top:3px">
              Total Cabeças
            </div>
          </div>
          <div class="col border-end border-white border-opacity-25">
            <div style="font-size:1.7rem;font-weight:800;line-height:1">
              {{ totais.preco_negociado_medio ? `R$ ${Number(totais.preco_negociado_medio).toFixed(3).replace('.',',')}` : '—' }}
            </div>
            <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;opacity:.85;margin-top:3px">
              R$/kg Negociado (méd.)
            </div>
          </div>
          <div class="col border-end border-white border-opacity-25">
            <div style="font-size:1.7rem;font-weight:800;line-height:1">
              {{ totais.preco_colocado_medio ? `R$ ${Number(totais.preco_colocado_medio).toFixed(3).replace('.',',')}` : '—' }}
            </div>
            <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;opacity:.85;margin-top:3px">
              R$/kg Colocado (méd.)
            </div>
          </div>
          <div class="col">
            <div style="font-size:1.7rem;font-weight:800;line-height:1">
              {{ totais.peso_medio ? `${Number(totais.peso_medio).toFixed(1).replace('.',',')} kg` : '—' }}
            </div>
            <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;opacity:.85;margin-top:3px">
              Peso Médio
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-4">
      <div class="btn-group">
        <button class="btn btn-sm" :class="visao === 'compradores' ? 'btn-primary' : 'btn-outline-primary'" @click="visao = 'compradores'; carregarDados()">
          Por Comprador
        </button>
        <button class="btn btn-sm" :class="visao === 'corretores' ? 'btn-primary' : 'btn-outline-primary'" @click="visao = 'corretores'; carregarDados()">
          Por Corretor
        </button>
        <button class="btn btn-sm" :class="visao === 'categorias' ? 'btn-primary' : 'btn-outline-primary'" @click="visao = 'categorias'; carregarDados()">
          Por Categoria
        </button>
      </div>
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
            <input v-model="filtros.uf" class="form-control form-control-sm" placeholder="UF" maxlength="2" />
          </div>
          <div class="col-md-2">
            <select v-model="filtros.status" class="form-select form-select-sm">
              <option value="Todos">Todos os status</option>
              <option value="EmNegociacao">Em Negociação</option>
              <option value="Fechado">Fechado</option>
            </select>
          </div>
          <div class="col-md-2">
            <button class="btn btn-primary btn-sm w-100" @click="carregarDados(); carregarTotais()">Filtrar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Visão por Comprador -->
    <div v-if="visao === 'compradores'">
      <div v-if="carregando" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
      </div>
      <div v-else-if="compradores.length === 0" class="card">
        <div class="card-body text-center text-muted py-5">Nenhuma negociação encontrada.</div>
      </div>
      <div v-else class="card">
        <div class="card-body p-0">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Comprador</th>
                <th class="text-end">Negociações</th>
                <th class="text-end">Qtd. Total (cabeças)</th>
                <th class="text-end">R$/kg Negociado (méd.)</th>
                <th class="text-end">R$/kg Colocado (méd.)</th>
                <th class="text-end">Peso Médio (kg)</th>
                <th class="text-center" style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="row in compradores" :key="row.comprador_id">
                <tr @click="toggleExpansaoComprador(row.comprador_id)" style="cursor:pointer">
                  <td class="fw-semibold">{{ row.comprador_nome }}</td>
                  <td class="text-end">{{ row.total_negociacoes }}</td>
                  <td class="text-end">{{ row.qtd_total?.toLocaleString('pt-BR') || '—' }}</td>
                  <td class="text-end preco-praca">{{ fmtKg(row.preco_negociado_medio) }}</td>
                  <td class="text-end preco-colocado">{{ fmtKg(row.preco_colocado_medio) }}</td>
                  <td class="text-end">{{ row.peso_medio ? Number(row.peso_medio).toFixed(1).replace('.', ',') + ' kg' : '—' }}</td>
                  <td class="text-center">
                    <i :class="expandidosComprador.has(row.comprador_id) ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
                  </td>
                </tr>
                <tr v-if="expandidosComprador.has(row.comprador_id)">
                  <td colspan="7" class="bg-light p-3">
                    <div v-if="carregandoNegociacoes.has(row.comprador_id)" class="text-center py-3">
                      <div class="spinner-border spinner-border-sm text-primary"></div>
                      <span class="ms-2 text-muted small">Carregando...</span>
                    </div>
                    <div v-else-if="!detalheComprador[row.comprador_id]?.length" class="text-center text-muted small py-2">
                      Nenhum dado encontrado para este comprador.
                    </div>
                    <template v-else>
                      <div class="small fw-semibold text-muted mb-2 text-uppercase" style="letter-spacing:.04em">
                        Detalhamento por Corretor / Categoria
                      </div>
                      <table class="table table-sm mb-0">
                        <thead>
                          <tr class="text-muted small">
                            <th>Corretor</th>
                            <th>Categoria</th>
                            <th class="text-end">Total (cab.)</th>
                            <th class="text-end" style="color:#e67e22">Em Andamento</th>
                            <th class="text-end" style="color:#27ae60">Fechadas</th>
                            <th class="text-end">R$/kg Negociado</th>
                            <th class="text-end">R$/kg Colocado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <template v-for="grupo in agruparPorCorretor(detalheComprador[row.comprador_id])" :key="grupo.corretor_id">
                            <tr v-for="(item, idx) in grupo.itens" :key="`${item.corretor_id}-${item.categoria}`">
                              <td v-if="idx === 0" class="fw-semibold align-middle" :rowspan="grupo.itens.length"
                                  style="border-right:2px solid #dee2e6">
                                {{ grupo.corretor_nome }}
                              </td>
                              <td>{{ fmtCategoria(item) }}</td>
                              <td class="text-end">{{ Number(item.qtd_total).toLocaleString('pt-BR') }}</td>
                              <td class="text-end fw-bold" style="color:#e67e22">{{ Number(item.cb_andamento).toLocaleString('pt-BR') }}</td>
                              <td class="text-end fw-bold" style="color:#27ae60">{{ Number(item.cb_fechadas).toLocaleString('pt-BR') }}</td>
                              <td class="text-end preco-praca">{{ fmtKg(item.preco_negociado_medio) }}</td>
                              <td class="text-end preco-colocado">{{ fmtKg(item.preco_colocado_medio) }}</td>
                            </tr>
                          </template>
                        </tbody>
                      </table>
                    </template>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Visão por Corretor -->
    <div v-if="visao === 'corretores'">
      <div v-if="carregando" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
      </div>
      <div v-else-if="corretores.length === 0" class="card">
        <div class="card-body text-center text-muted py-5">Nenhuma negociação encontrada.</div>
      </div>
      <div v-else class="card">
        <div class="card-body p-0">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Corretor</th>
                <th class="text-end">Categorias</th>
                <th class="text-end">Qtd. Total (cabeças)</th>
                <th class="text-end">R$/kg Negociado (méd.)</th>
                <th class="text-end">R$/kg Colocado (méd.)</th>
                <th class="text-end">Peso Médio (kg)</th>
                <th class="text-center" style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="cor in corretores" :key="cor.corretor_id">
                <tr @click="toggleExpansaoCorretor(cor.corretor_id)" style="cursor:pointer">
                  <td class="fw-semibold">{{ cor.corretor_nome }}</td>
                  <td class="text-end">{{ cor.categorias.length }}</td>
                  <td class="text-end">{{ cor.agregados.qtdTotal.toLocaleString('pt-BR') }}</td>
                  <td class="text-end preco-praca">{{ fmtKg(cor.agregados.precoNegociadoMedio) }}</td>
                  <td class="text-end preco-colocado">{{ fmtKg(cor.agregados.precoColocadoMedio) }}</td>
                  <td class="text-end">{{ cor.agregados.pesoMedio ? cor.agregados.pesoMedio.toFixed(1).replace('.', ',') + ' kg' : '—' }}</td>
                  <td class="text-center">
                    <i :class="expandidosCorretor.has(cor.corretor_id) ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
                  </td>
                </tr>
                <tr v-if="expandidosCorretor.has(cor.corretor_id)">
                  <td colspan="7" class="bg-light p-3">
                    <table class="table table-sm mb-0">
                      <thead>
                        <tr class="text-muted small">
                          <th>Categoria</th>
                          <th class="text-end">Qtd. (cabeças)</th>
                          <th class="text-end">R$/kg Negociado</th>
                          <th class="text-end">R$/kg Colocado</th>
                          <th class="text-end">Peso Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="cat in cor.categorias" :key="cat.categoria">
                          <td>{{ fmtCategoria(cat) }}</td>
                          <td class="text-end">{{ cat.qtd_total?.toLocaleString('pt-BR') || '—' }}</td>
                          <td class="text-end preco-praca">{{ fmtKg(cat.preco_negociado_medio) }}</td>
                          <td class="text-end preco-colocado">{{ fmtKg(cat.preco_colocado_medio) }}</td>
                          <td class="text-end">{{ cat.peso_medio ? Number(cat.peso_medio).toFixed(1).replace('.', ',') + ' kg' : '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Visão por Categoria -->
    <div v-if="visao === 'categorias'">
      <div v-if="carregando" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
      </div>
      <div v-else-if="categorias.length === 0" class="card">
        <div class="card-body text-center text-muted py-5">Nenhuma negociação encontrada.</div>
      </div>
      <div v-else class="card">
        <div class="card-body p-0">
          <table class="table table-hover mb-0 align-middle">
            <thead class="table-light">
              <tr>
                <th>Categoria</th>
                <th class="text-end">Negociações</th>
                <th class="text-end">Total (cab.)</th>
                <th class="text-end" style="color:#e67e22">Em Andamento</th>
                <th class="text-end" style="color:#27ae60">Fechadas</th>
                <th class="text-end">R$/kg Negociado (méd.)</th>
                <th class="text-end">R$/kg Colocado (méd.)</th>
                <th class="text-center" style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="cat in categorias" :key="cat.categoria_id">
                <tr @click="toggleExpansaoCategoria(cat.categoria_id)" style="cursor:pointer">
                  <td class="fw-semibold">{{ fmtCategoria(cat) }}</td>
                  <td class="text-end">{{ cat.total_negociacoes }}</td>
                  <td class="text-end fw-semibold">{{ Number(cat.qtd_total).toLocaleString('pt-BR') }}</td>
                  <td class="text-end fw-bold" style="color:#e67e22">{{ Number(cat.cb_andamento).toLocaleString('pt-BR') }}</td>
                  <td class="text-end fw-bold" style="color:#27ae60">{{ Number(cat.cb_fechadas).toLocaleString('pt-BR') }}</td>
                  <td class="text-end preco-praca">{{ fmtKg(cat.preco_negociado_medio) }}</td>
                  <td class="text-end preco-colocado">{{ fmtKg(cat.preco_colocado_medio) }}</td>
                  <td class="text-center">
                    <i :class="expandidosCategoria.has(cat.categoria_id) ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
                  </td>
                </tr>
                <tr v-if="expandidosCategoria.has(cat.categoria_id)">
                  <td colspan="8" class="bg-light p-3">
                    <div v-if="carregandoDetalheCategoria.has(cat.categoria_id)" class="text-center py-3">
                      <div class="spinner-border spinner-border-sm text-primary"></div>
                      <span class="ms-2 text-muted small">Carregando...</span>
                    </div>
                    <div v-else-if="!detalheCategorias[cat.categoria_id]?.length" class="text-center text-muted small py-2">
                      Nenhum detalhe encontrado.
                    </div>
                    <table v-else class="table table-sm mb-0">
                      <thead>
                        <tr class="text-muted small">
                          <th>Comprador</th>
                          <th>Corretor</th>
                          <th class="text-end">Total (cab.)</th>
                          <th class="text-end" style="color:#e67e22">Em Andamento</th>
                          <th class="text-end" style="color:#27ae60">Fechadas</th>
                          <th class="text-end">R$/kg Negociado</th>
                          <th class="text-end">R$/kg Colocado</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="row in detalheCategorias[cat.categoria_id]" :key="`${row.comprador_id}-${row.corretor_id}`">
                          <td class="fw-semibold">{{ row.comprador_nome }}</td>
                          <td>{{ row.corretor_nome }}</td>
                          <td class="text-end">{{ Number(row.qtd_total).toLocaleString('pt-BR') }}</td>
                          <td class="text-end fw-bold" style="color:#e67e22">{{ Number(row.cb_andamento).toLocaleString('pt-BR') }}</td>
                          <td class="text-end fw-bold" style="color:#27ae60">{{ Number(row.cb_fechadas).toLocaleString('pt-BR') }}</td>
                          <td class="text-end preco-praca">{{ fmtKg(row.preco_negociado_medio) }}</td>
                          <td class="text-end preco-colocado">{{ fmtKg(row.preco_colocado_medio) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
