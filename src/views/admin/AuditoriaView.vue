<script setup>
import { ref, onMounted } from 'vue'
import { auditoriaApi, usuariosApi } from '../../services/api'

const registros = ref([])
const total = ref(0)
const carregando = ref(false)
const listaUsuarios = ref([])

const filtros = ref({
  tabela: '',
  usuarioId: '',
  dataInicio: '',
  dataFim: '',
  pagina: 1,
  tamanhoPagina: 50
})

const tabelas = ['negociacoes','usuarios','corretores','municipios_origem','icms','cotacoes_regionais','config_comissao']

const tabelaLabels = {
  negociacoes: 'Negociações',
  usuarios: 'Compradores',
  corretores: 'Corretores',
  municipios_origem: 'Municípios Origem',
  icms: 'ICMS',
  cotacoes_regionais: 'Cotação Regional',
  config_comissao: 'Comissão'
}

async function carregar() {
  carregando.value = true
  try {
    const params = {
      tabela: filtros.value.tabela || undefined,
      usuarioId: filtros.value.usuarioId || undefined,
      dataInicio: filtros.value.dataInicio || undefined,
      dataFim: filtros.value.dataFim || undefined,
      pagina: filtros.value.pagina,
      tamanhoPagina: filtros.value.tamanhoPagina
    }
    const res = await auditoriaApi.listar(params)
    registros.value = res.data.items
    total.value = res.data.total
  } finally { carregando.value = false }
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR')
}

function tabelaBadgeClass(t) {
  const map = {
    negociacoes: 'bg-primary',
    icms: 'bg-warning text-dark',
    cotacoes_regionais: 'bg-info text-dark',
    config_comissao: 'bg-secondary',
    usuarios: 'bg-success',
    corretores: 'bg-dark',
    municipios_origem: 'bg-light text-dark border'
  }
  return 'badge ' + (map[t] || 'bg-secondary')
}

async function carregarFiltros() {
  const res = await usuariosApi.listar()
  listaUsuarios.value = res.data
}

onMounted(() => { carregarFiltros(); carregar() })
</script>

<template>
  <div>
    <h4 class="fw-bold mb-4">Histórico de Alterações (Auditoria)</h4>

    <!-- Filtros -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="row g-2">
          <div class="col-md-3">
            <select v-model="filtros.tabela" class="form-select form-select-sm">
              <option value="">Todas as tabelas</option>
              <option v-for="t in tabelas" :key="t" :value="t">{{ tabelaLabels[t] || t }}</option>
            </select>
          </div>
          <div class="col-md-3">
            <select v-model="filtros.usuarioId" class="form-select form-select-sm">
              <option value="">Todos os usuários</option>
              <option v-for="u in listaUsuarios" :key="u.id" :value="u.id">{{ u.nome }}</option>
            </select>
          </div>
          <div class="col-md-2">
            <input v-model="filtros.dataInicio" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <input v-model="filtros.dataFim" type="date" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <button class="btn btn-primary btn-sm w-100" @click="filtros.pagina = 1; carregar()">Filtrar</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <div v-else-if="registros.length === 0" class="text-center text-muted py-5">Nenhum registro encontrado.</div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Data/Hora</th>
                <th>Tabela</th>
                <th>Campo</th>
                <th>Valor Anterior</th>
                <th>Valor Novo</th>
                <th>Usuário</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in registros" :key="r.id">
                <td class="text-muted small text-nowrap">{{ fmtData(r.dataHora) }}</td>
                <td><span :class="tabelaBadgeClass(r.tabela)">{{ tabelaLabels[r.tabela] || r.tabela }}</span></td>
                <td class="small">{{ r.campo }}</td>
                <td class="small text-danger">{{ r.valorAnterior || '—' }}</td>
                <td class="small text-success">{{ r.valorNovo || '—' }}</td>
                <td class="small fw-semibold">{{ r.usuarioNome }}</td>
                <td class="small text-muted">{{ r.descricao }}</td>
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
              <button class="page-link" @click="filtros.pagina--; carregar()">«</button>
            </li>
            <li class="page-item" :class="{ disabled: filtros.pagina * filtros.tamanhoPagina >= total }">
              <button class="page-link" @click="filtros.pagina++; carregar()">»</button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </div>
</template>
