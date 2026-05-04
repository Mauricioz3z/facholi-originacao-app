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

const expandidos = ref(new Set())

async function carregarDados() {
  carregando.value = true
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
      // Agrupar por corretor
      const grupos = {}
      for (const row of res.data) {
        if (!grupos[row.corretor_id]) {
          grupos[row.corretor_id] = { corretor_id: row.corretor_id, corretor_nome: row.corretor_nome, categorias: [] }
        }
        grupos[row.corretor_id].categorias.push(row)
      }
      corretores.value = Object.values(grupos)
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

function toggleExpansao(id) {
  if (expandidos.value.has(id)) expandidos.value.delete(id)
  else expandidos.value.add(id)
}

function fmt(v) {
  if (!v && v !== 0) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtKg(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(4).replace('.', ',')}/kg`
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
          <table class="table table-hover mb-0">
            <thead class="table-light">
              <tr>
                <th>Comprador</th>
                <th class="text-end">Negociações</th>
                <th class="text-end">Qtd. Total (cabeças)</th>
                <th class="text-end">R$/kg Negociado (méd.)</th>
                <th class="text-end">R$/kg Colocado (méd.)</th>
                <th class="text-end">Peso Médio (kg)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in compradores" :key="row.comprador_id" @click="toggleExpansao(row.comprador_id)" style="cursor:pointer">
                <td class="fw-semibold">{{ row.comprador_nome }}</td>
                <td class="text-end">{{ row.total_negociacoes }}</td>
                <td class="text-end">{{ row.qtd_total?.toLocaleString('pt-BR') || '—' }}</td>
                <td class="text-end preco-praca">{{ fmtKg(row.preco_negociado_medio) }}</td>
                <td class="text-end preco-colocado">{{ fmtKg(row.preco_colocado_medio) }}</td>
                <td class="text-end">{{ row.peso_medio ? Number(row.peso_medio).toFixed(1).replace('.', ',') + ' kg' : '—' }}</td>
                <td class="text-center">
                  <i :class="expandidos.has(row.comprador_id) ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
                </td>
              </tr>
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
      <div v-else>
        <div v-for="cor in corretores" :key="cor.corretor_id" class="card mb-3">
          <div class="card-header bg-white fw-semibold d-flex justify-content-between">
            <span>{{ cor.corretor_nome }}</span>
            <span class="text-muted small">{{ cor.categorias.length }} categoria(s)</span>
          </div>
          <div class="card-body p-0">
            <table class="table table-sm mb-0">
              <thead class="table-light">
                <tr>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
