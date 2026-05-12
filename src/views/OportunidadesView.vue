<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { categoriasApi, simulacaoApi } from '../services/api'

const categorias = ref([])
const categoriaId = ref('')
const precoMask = ref('')
const precoNumerico = ref(null)
const resultados = ref([])
const carregando = ref(false)
const filtroUf = ref('')

onMounted(async () => {
  const res = await categoriasApi.listar()
  categorias.value = res.data
})

function aplicarMascara(valor) {
  const digits = String(valor ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return (parseInt(digits, 10) / 1000).toLocaleString('pt-BR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3
  })
}

function aoDigitar(evento) {
  const mascarado = aplicarMascara(evento.target.value)
  precoMask.value = mascarado
  const digits = mascarado.replace(/\D/g, '')
  precoNumerico.value = digits ? parseInt(digits, 10) / 1000 : null
}

async function buscar() {
  if (!categoriaId.value || !precoNumerico.value) return
  carregando.value = true
  resultados.value = []
  try {
    const res = await simulacaoApi.oportunidades(categoriaId.value, precoNumerico.value)
    resultados.value = res.data
  } finally {
    carregando.value = false
  }
}

watch([categoriaId, precoNumerico], ([cat, preco]) => {
  if (cat && preco) buscar()
  else resultados.value = []
})

const resultadosFiltrados = computed(() => {
  if (!filtroUf.value) return resultados.value
  return resultados.value.filter(r => r.uf === filtroUf.value.toUpperCase())
})

const ufsDisponiveis = computed(() => {
  return [...new Set(resultados.value.map(r => r.uf))].sort()
})

const melhorPraca = computed(() => resultadosFiltrados.value[0]?.precoPraca ?? null)
const piorPraca   = computed(() => resultadosFiltrados.value[resultadosFiltrados.value.length - 1]?.precoPraca ?? null)

function corLinha(praca, idx) {
  if (idx < 3) return '#e8f5e9'
  if (idx >= resultadosFiltrados.value.length - 3) return '#fff8f0'
  return ''
}

function fmtR3(v) {
  if (v === null || v === undefined) return '—'
  return `R$ ${Number(v).toFixed(3).replace('.', ',')}`
}

function fmtR4(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(4).replace('.', ',')}/kg`
}

function fmtArroba(v) {
  if (v === null || v === undefined) return '—'
  return `R$ ${(Number(v) * 30).toFixed(2).replace('.', ',')}`
}

function fmtKm(v) {
  return `${Number(v).toLocaleString('pt-BR')} km`
}

function categoriaNomeCompleto(id) {
  const cat = categorias.value.find(c => c.id === Number(id))
  if (!cat) return ''
  return `${cat.nome} ${Math.round(cat.pesoMin)}–${Math.round(cat.pesoMax)} kg`
}
</script>

<template>
  <div>
    <div class="d-flex align-items-center gap-3 mb-4">
      <h4 class="fw-bold mb-0">Mapa de Oportunidades</h4>
      <span class="badge bg-warning text-dark">Experimental</span>
    </div>

    <p class="text-muted mb-4" style="max-width:640px">
      Informe a <strong>categoria</strong> e o <strong>preço colocado</strong> (R$/kg posto fazenda).
      O sistema calcula automaticamente o R$/kg praça para <strong>todas as origens cadastradas</strong>,
      ordenadas da melhor para a pior oportunidade.
    </p>

    <!-- Parâmetros -->
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label fw-semibold">Categoria</label>
            <select v-model="categoriaId" class="form-select">
              <option value="">Selecione a categoria...</option>
              <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
                {{ cat.nome }} {{ Math.round(cat.pesoMin) }}–{{ Math.round(cat.pesoMax) }} kg
              </option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label fw-semibold">R$/kg Colocado</label>
            <div class="input-group">
              <span class="input-group-text">R$</span>
              <input
                :value="precoMask"
                type="text"
                inputmode="decimal"
                class="form-control"
                placeholder="0,000"
                @input="aoDigitar"
              />
            </div>
          </div>
          <div class="col-md-3" v-if="resultados.length">
            <label class="form-label fw-semibold">Filtrar por UF</label>
            <select v-model="filtroUf" class="form-select">
              <option value="">Todas as UFs</option>
              <option v-for="uf in ufsDisponiveis" :key="uf" :value="uf">{{ uf }}</option>
            </select>
          </div>
          <div class="col-md-2" v-if="resultados.length">
            <button class="btn btn-outline-secondary w-100" @click="filtroUf = ''; precoMask = ''; precoNumerico = null; categoriaId = ''; resultados = []">
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vazio -->
    <div v-if="!categoriaId || !precoNumerico" class="text-center text-muted py-5">
      <i class="bi bi-geo-alt" style="font-size:3.5rem;color:#ccc;display:block;margin-bottom:1rem"></i>
      <p class="mb-0">Selecione a categoria e informe o preço colocado para ver as oportunidades.</p>
    </div>

    <!-- Carregando -->
    <div v-else-if="carregando" class="text-center py-5">
      <div class="spinner-border text-success"></div>
      <div class="text-muted mt-2">Calculando para todas as origens...</div>
    </div>

    <!-- Resultados -->
    <div v-else-if="resultadosFiltrados.length">

      <!-- Resumo -->
      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Origens analisadas</div>
            <div style="font-size:1.8rem;font-weight:800;color:#1a5f2a">{{ resultadosFiltrados.length }}</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm text-center py-3" style="background:#e8f5e9">
            <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Melhor praça</div>
            <div style="font-size:1.8rem;font-weight:800;color:#1a5f2a">{{ fmtR3(melhorPraca) }}</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm text-center py-3" style="background:#fff8f0">
            <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Pior praça</div>
            <div style="font-size:1.8rem;font-weight:800;color:#c0392b">{{ fmtR3(piorPraca) }}</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Categoria</div>
            <div style="font-size:1rem;font-weight:700;color:#1a1a1a;padding:0.3rem 0.5rem">{{ categoriaNomeCompleto(categoriaId) }}</div>
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="card shadow-sm">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
          <span class="fw-semibold">Ranking de Oportunidades — preço colocado: R$ {{ precoMask }}/kg</span>
          <span class="text-muted small">{{ resultadosFiltrados.length }} origens · ordenadas por maior praça</span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width:50px" class="text-center">#</th>
                  <th>Origem</th>
                  <th class="text-end">Distância</th>
                  <th class="text-end">Frete/kg</th>
                  <th class="text-end">ICMS</th>
                  <th class="text-end" style="color:#1a5f2a">R$/kg Praça</th>
                  <th class="text-end" style="color:#1a5f2a">@ Arroba</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in resultadosFiltrados"
                  :key="row.municipioId"
                  :style="{ background: corLinha(row.precoPraca, idx) }"
                >
                  <td class="text-center fw-bold" :style="{ color: idx < 3 ? '#1a5f2a' : idx >= resultadosFiltrados.length - 3 ? '#c0392b' : '#999' }">
                    {{ idx + 1 }}
                  </td>
                  <td>
                    <span class="fw-semibold">{{ row.nome }}</span>
                    <span class="badge bg-light text-secondary ms-1" style="font-size:0.72rem">{{ row.uf }}</span>
                    <span v-if="idx === 0" class="badge ms-1" style="background:#1a5f2a;font-size:0.7rem">Melhor</span>
                  </td>
                  <td class="text-end text-muted small">{{ fmtKm(row.distanciaKm) }}</td>
                  <td class="text-end text-muted small">{{ fmtR4(row.freteKg) }}</td>
                  <td class="text-end text-muted small">{{ row.valorIcms ? fmtR4(row.valorIcms) : '—' }}</td>
                  <td class="text-end fw-bold" :style="{ color: idx < 3 ? '#1a5f2a' : '' }">
                    {{ fmtR3(row.precoPraca) }}
                  </td>
                  <td class="text-end fw-semibold text-muted">
                    {{ fmtArroba(row.precoPraca) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center text-muted py-5">
      Nenhuma origem cadastrada e ativa encontrada.
    </div>
  </div>
</template>
