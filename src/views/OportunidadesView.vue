<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { categoriasApi, simulacaoApi } from '../services/api'

const MODO_COM_ICMS = 'com_icms'
const MODO_SEM_ICMS = 'sem_icms'

const categorias = ref([])
const categoriaId = ref('')
const precoMask = ref('')
const precoNumerico = ref(null)
const resultados = ref([])
const carregando = ref(false)
const filtroUf = ref('')
const modoCalculo = ref(MODO_COM_ICMS)

const ehComIcms = computed(() => modoCalculo.value === MODO_COM_ICMS)
const ehSemIcms = computed(() => modoCalculo.value === MODO_SEM_ICMS)

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
  if (!categoriaId.value) return
  if (ehComIcms.value && !precoNumerico.value) return

  carregando.value = true
  resultados.value = []
  try {
    const res = ehComIcms.value
      ? await simulacaoApi.oportunidades(categoriaId.value, precoNumerico.value)
      : await simulacaoApi.oportunidadesPraca(categoriaId.value)
    resultados.value = res.data
  } finally {
    carregando.value = false
  }
}

// IMPORTANTE: precoNumerico fica fora do watch — não disparar buscar() a cada tecla digitada.
// A busca por preço acontece no blur/Enter do campo (ver dispararBuscaPorPreco).
watch([categoriaId, modoCalculo], () => {
  if (!categoriaId.value) { resultados.value = []; return }
  if (ehComIcms.value && !precoNumerico.value) { resultados.value = []; return }
  buscar()
})

function dispararBuscaPorPreco() {
  if (!categoriaId.value || !precoNumerico.value) return
  buscar()
}

const resultadosFiltrados = computed(() => {
  if (!filtroUf.value) return resultados.value
  return resultados.value.filter(r => r.uf === filtroUf.value.toUpperCase())
})

const ufsDisponiveis = computed(() => {
  return [...new Set(resultados.value.map(r => r.uf))].sort()
})

// Valor exibido como "destaque" da linha — muda conforme o modo:
//  - Com ICMS: precoPraca (preço objetivo em R$/kg)
//  - Sem ICMS: custoColocadoKg (menor = melhor)
function valorOrdenacao(row) {
  return ehComIcms.value ? row.precoPraca : row.custoColocadoKg
}

const melhorValor = computed(() => {
  const lista = resultadosFiltrados.value
  if (!lista.length) return null
  return valorOrdenacao(lista[0])
})

const piorValor = computed(() => {
  const lista = resultadosFiltrados.value
  if (!lista.length) return null
  return valorOrdenacao(lista[lista.length - 1])
})

// Modo A: melhor/pior deságio (já vem ordenado do backend).
// Ignora origens sem cotação (desagioPercentual == null) para os cards.
const melhorDesagio = computed(() => {
  if (!ehComIcms.value) return null
  const comValor = resultadosFiltrados.value.filter(r => r.desagioPercentual !== null && r.desagioPercentual !== undefined)
  return comValor.length ? comValor[0].desagioPercentual : null
})

const piorDesagio = computed(() => {
  if (!ehComIcms.value) return null
  const comValor = resultadosFiltrados.value.filter(r => r.desagioPercentual !== null && r.desagioPercentual !== undefined)
  return comValor.length ? comValor[comValor.length - 1].desagioPercentual : null
})

function fmtPct(v) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  const sinal = n > 0 ? '+' : ''
  return `${sinal}${n.toFixed(2).replace('.', ',')}%`
}

function corDesagio(v) {
  if (v === null || v === undefined) return '#6c757d'
  const n = Number(v)
  if (n >= 0) return '#1a5f2a'        // verde — pagando acima da praça (favorável)
  if (n >= -5) return '#b88600'       // amarelo — ligeiramente abaixo
  return '#c0392b'                    // vermelho — bem abaixo (operação difícil)
}

function corLinha(idx) {
  if (idx < 3) return '#e8f5e9'
  if (idx >= resultadosFiltrados.value.length - 3) return '#fff8f0'
  return ''
}

function limpar() {
  filtroUf.value = ''
  precoMask.value = ''
  precoNumerico.value = null
  categoriaId.value = ''
  resultados.value = []
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

const labelColunaDestaque = computed(() =>
  ehComIcms.value ? 'R$/kg na Praça' : 'R$/kg Colocado'
)

const labelColunaArroba = computed(() =>
  ehComIcms.value ? 'R$/@ na Praça' : '@ Arroba'
)

// Função para exibir a cotação @ na coluna verde:
//  - Modo A: usa o valor cru da UF (sem ágio) — definição da diretoria/Israel
//  - Modo B: cotação com ágio convertida para R$/@ (faz parte do cálculo do custo)
function cotacaoArrobaExibida(row) {
  if (ehComIcms.value) return row.valorArrobaUf
  return row.cotacaoPracaKg ? row.cotacaoPracaKg * 30 : 0
}

const tituloRanking = computed(() => {
  if (ehComIcms.value) {
    return `Ranking de Oportunidades — preço colocado: R$ ${precoMask.value}/kg`
  }
  return 'Ranking de Oportunidades — modo: Praça + Frete (sem ICMS)'
})

const subtituloRanking = computed(() => {
  const qtd = resultadosFiltrados.value.length
  return ehComIcms.value
    ? `${qtd} origens · ordenadas por melhor ágio sobre a praça`
    : `${qtd} origens · ordenadas por menor custo colocado`
})
</script>

<template>
  <div>
    <div class="d-flex align-items-center gap-3 mb-4">
      <h4 class="fw-bold mb-0">Mapa de Oportunidades</h4>
      <span class="badge bg-warning text-dark">Experimental</span>
    </div>

    <p class="text-muted mb-4" style="max-width:720px">
      <template v-if="ehComIcms">
        Informe a <strong>categoria</strong> e o <strong>preço colocado</strong> (R$/kg posto fazenda).
        O sistema calcula o R$/kg praça para <strong>todas as origens</strong>, considerando frete e ICMS.
      </template>
      <template v-else>
        Modo <strong>Praça + Frete (sem ICMS)</strong>: o sistema soma a cotação atual da praça de cada UF
        com o frete convertido em R$/kg. Útil para comparar onde o animal sai mais barato,
        ignorando o crédito de ICMS.
      </template>
    </p>

    <!-- Parâmetros -->
    <div class="card mb-4 shadow-sm">
      <div class="card-body">
        <!-- Seletor de modo de cálculo -->
        <div class="mb-3">
          <label class="form-label fw-semibold d-block">Modo de Cálculo</label>
          <div class="btn-group" role="group" aria-label="Modo de cálculo">
            <input
              type="radio"
              class="btn-check"
              id="modo-com-icms"
              value="com_icms"
              v-model="modoCalculo"
            />
            <label class="btn btn-outline-success" for="modo-com-icms">
              <i class="bi bi-cash-coin me-1"></i> Com ICMS — Preço Colocado
            </label>

            <input
              type="radio"
              class="btn-check"
              id="modo-sem-icms"
              value="sem_icms"
              v-model="modoCalculo"
            />
            <label class="btn btn-outline-success" for="modo-sem-icms">
              <i class="bi bi-geo-alt me-1"></i> Sem ICMS — Praça + Frete
            </label>
          </div>
        </div>

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
          <div class="col-md-3" v-if="ehComIcms">
            <label class="form-label fw-semibold d-flex justify-content-between align-items-center">
              <span>R$/kg Colocado</span>
              <span class="text-muted fw-normal" style="font-size:0.7rem">
                <kbd>Enter</kbd> p/ calcular
              </span>
            </label>
            <div class="input-group">
              <span class="input-group-text">R$</span>
              <input
                :value="precoMask"
                type="text"
                inputmode="decimal"
                class="form-control"
                placeholder="0,000"
                @input="aoDigitar"
                @blur="dispararBuscaPorPreco"
                @keyup.enter="dispararBuscaPorPreco"
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
            <button class="btn btn-outline-secondary w-100" @click="limpar">
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Estado vazio -->
    <div
      v-if="!categoriaId || (ehComIcms && !precoNumerico)"
      class="text-center text-muted py-5"
    >
      <i class="bi bi-geo-alt" style="font-size:3.5rem;color:#ccc;display:block;margin-bottom:1rem"></i>
      <p class="mb-0" v-if="ehComIcms">
        Selecione a categoria e informe o preço colocado para ver as oportunidades.
      </p>
      <p class="mb-0" v-else>
        Selecione a categoria para ver o ranking de praça + frete.
      </p>
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
        <!-- Modo A: cards de ágio/deságio -->
        <template v-if="ehComIcms">
          <div class="col-md-3">
            <div class="card border-0 shadow-sm text-center py-3" style="background:#e8f5e9">
              <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Melhor ágio</div>
              <div style="font-size:1.8rem;font-weight:800" :style="{ color: corDesagio(melhorDesagio) }">
                {{ fmtPct(melhorDesagio) }}
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm text-center py-3" style="background:#fff8f0">
              <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Pior deságio</div>
              <div style="font-size:1.8rem;font-weight:800" :style="{ color: corDesagio(piorDesagio) }">
                {{ fmtPct(piorDesagio) }}
              </div>
            </div>
          </div>
        </template>
        <!-- Modo B: cards de R$/kg -->
        <template v-else>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm text-center py-3" style="background:#e8f5e9">
              <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Melhor praça</div>
              <div style="font-size:1.8rem;font-weight:800;color:#1a5f2a">{{ fmtR3(melhorValor) }}</div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card border-0 shadow-sm text-center py-3" style="background:#fff8f0">
              <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Pior praça</div>
              <div style="font-size:1.8rem;font-weight:800;color:#c0392b">{{ fmtR3(piorValor) }}</div>
            </div>
          </div>
        </template>
        <div class="col-md-3">
          <div class="card border-0 shadow-sm text-center py-3">
            <div class="text-muted small fw-semibold text-uppercase" style="letter-spacing:.04em">Categoria</div>
            <div style="font-size:1rem;font-weight:700;color:#1a1a1a;padding:0.3rem 0.5rem">{{ categoriaNomeCompleto(categoriaId) }}</div>
          </div>
        </div>
      </div>

      <!-- Tabela -->
      <div class="card shadow-sm">
        <div class="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span class="fw-semibold">
            {{ tituloRanking }}
            <span
              v-if="ehSemIcms"
              class="badge bg-info-subtle text-info-emphasis ms-2"
              style="font-size:.7rem;vertical-align:middle"
            >
              ICMS desconsiderado
            </span>
          </span>
          <span class="text-muted small">{{ subtituloRanking }}</span>
        </div>
        <div v-if="ehSemIcms" class="px-3 py-2 small text-muted border-bottom" style="background:#fafafa">
          <i class="bi bi-info-circle me-1"></i>
          Origens cuja UF está com cotação zerada (R$ 0,00/@) são omitidas do ranking — praça não está comprando.
        </div>
        <div v-else class="px-3 py-2 small text-muted border-bottom" style="background:#fafafa">
          <i class="bi bi-info-circle me-1"></i>
          <strong>Ágio/Deságio</strong> = quanto o <strong>R$/@ na Praça</strong> (preço-alvo na origem) está acima (+) ou abaixo (−) da <strong>Cotação Praça @</strong> oficial da UF.
          <span class="text-success fw-semibold">Positivo</span> = pagando acima da praça (região atrativa para fomentar negócio).
          <span class="text-danger fw-semibold">Negativo</span> = pagando abaixo (operação difícil).
          <span class="text-muted">Tela de relatório — ajuste fino na Simulação Rápida.</span>
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
                  <th v-if="ehComIcms" class="text-end">ICMS</th>
                  <th class="text-end">Cotação Praça @</th>
                  <th class="text-end" style="color:#1a5f2a">{{ labelColunaDestaque }}</th>
                  <th class="text-end" style="color:#1a5f2a">{{ labelColunaArroba }}</th>
                  <th v-if="ehComIcms" class="text-end">Ágio/Deságio</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, idx) in resultadosFiltrados"
                  :key="row.municipioId"
                  :style="{ background: corLinha(idx) }"
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
                  <td v-if="ehComIcms" class="text-end text-muted small">
                    {{ row.valorIcms ? fmtR4(row.valorIcms) : '—' }}
                  </td>
                  <td class="text-end text-muted small">
                    <template v-if="cotacaoArrobaExibida(row)">
                      R$ {{ Number(cotacaoArrobaExibida(row)).toFixed(2).replace('.', ',') }}
                    </template>
                    <template v-else>—</template>
                  </td>
                  <td class="text-end fw-bold" :style="{ color: idx < 3 ? '#1a5f2a' : '' }">
                    {{ fmtR3(valorOrdenacao(row)) }}
                  </td>
                  <td class="text-end fw-semibold text-muted">
                    {{ fmtArroba(valorOrdenacao(row)) }}
                  </td>
                  <td v-if="ehComIcms" class="text-end fw-bold" :style="{ color: corDesagio(row.desagioPercentual) }">
                    {{ fmtPct(row.desagioPercentual) }}
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
