<script setup>
import { ref, onMounted } from 'vue'
import { dashboardApi, usuariosApi, corretoresApi } from '../services/api'

const visao = ref('compradores')
const compradores = ref([])
const corretores = ref([])
const listaCompradores = ref([])
const listaCorretores = ref([])
const carregando = ref(false)

const filtros = ref({
  compradorId: '',
  corretorId: '',
  uf: '',
  status: 'Todos'
})

const expandidosComprador = ref(new Set())
const expandidosCorretor = ref(new Set())
const negociacoesPorComprador = ref({})
const carregandoNegociacoes = ref(new Set())

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

async function carregarDados() {
  carregando.value = true
  expandidosComprador.value = new Set()
  expandidosCorretor.value = new Set()
  negociacoesPorComprador.value = {}
  try {
    const params = {
      compradorId: filtros.value.compradorId || undefined,
      corretorId: filtros.value.corretorId || undefined,
      uf: filtros.value.uf || undefined,
      status: filtros.value.status !== 'Todos' ? filtros.value.status : undefined
    }
    if (visao.value === 'compradores') {
      const res = await dashboardApi.porComprador(params)
      compradores.value = res.data
    } else {
      const res = await dashboardApi.porCorretor(params)
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
    }
  } finally {
    carregando.value = false
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
  if (negociacoesPorComprador.value[compradorId]) return

  carregandoNegociacoes.value.add(compradorId)
  try {
    const params = {
      status: filtros.value.status !== 'Todos' ? filtros.value.status : undefined,
      uf: filtros.value.uf || undefined,
      corretorId: filtros.value.corretorId || undefined,
      tamanhoPagina: 100
    }
    const res = await dashboardApi.negociacoesPorComprador(compradorId, params)
    negociacoesPorComprador.value = {
      ...negociacoesPorComprador.value,
      [compradorId]: res.data.items
    }
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

function statusBadge(s) {
  return s === 'Fechado' ? 'badge bg-success' : 'badge bg-warning text-dark'
}

function statusLabel(s) {
  return s === 'Fechado' ? 'Fechado' : 'Em Negociação'
}

onMounted(() => {
  carregarFiltros()
  carregarDados()
})
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">Dashboard — Resumo de Negociações</h4>
      <div class="btn-group">
        <button class="btn btn-sm" :class="visao === 'compradores' ? 'btn-primary' : 'btn-outline-primary'" @click="visao = 'compradores'; carregarDados()">
          Por Comprador
        </button>
        <button class="btn btn-sm" :class="visao === 'corretores' ? 'btn-primary' : 'btn-outline-primary'" @click="visao = 'corretores'; carregarDados()">
          Por Corretor
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
            <button class="btn btn-primary btn-sm w-100" @click="carregarDados">Filtrar</button>
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
                      <span class="ms-2 text-muted small">Carregando negociações...</span>
                    </div>
                    <div v-else-if="!negociacoesPorComprador[row.comprador_id]?.length" class="text-center text-muted small py-2">
                      Nenhuma negociação encontrada para este comprador.
                    </div>
                    <table v-else class="table table-sm mb-0">
                      <thead>
                        <tr class="text-muted small">
                          <th>Número</th>
                          <th>Status</th>
                          <th>Corretor</th>
                          <th>Origem</th>
                          <th class="text-end">Cabeças</th>
                          <th>Criado em</th>
                          <th>Entrega Prev.</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="neg in negociacoesPorComprador[row.comprador_id]" :key="neg.id">
                          <td class="fw-semibold">{{ neg.numero }}</td>
                          <td><span :class="statusBadge(neg.status)">{{ statusLabel(neg.status) }}</span></td>
                          <td>{{ neg.corretorNome }}</td>
                          <td>{{ neg.municipioOrigemNome }}-{{ neg.municipioOrigemUf }}</td>
                          <td class="text-end fw-semibold">{{ totalCabecasNeg(neg).toLocaleString('pt-BR') }}</td>
                          <td class="text-muted small">{{ fmtData(neg.criadoEm) }}</td>
                          <td class="text-muted small">{{ fmtData(neg.dataPrevistaEntrega) }}</td>
                          <td class="text-end">
                            <router-link :to="`/negociacoes/${neg.id}`" class="btn btn-sm btn-outline-primary" @click.stop>
                              <i class="bi bi-eye"></i>
                            </router-link>
                          </td>
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
                          <td>{{ cat.categoria }}</td>
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
  </div>
</template>
