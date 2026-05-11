<script setup>
import { ref, onMounted, watch } from 'vue'
import { municipiosOrigemApi, municipiosDestinoApi, categoriasApi, simulacaoApi } from '../services/api'

const origens = ref([])
const destinos = ref([])
const categorias = ref([])
const origemId = ref('')
const destinoId = ref('')
const itens = ref([]) // { categoriaId, categoriaNome, pesoMin, pesoMax, pesoMedio, cabCaminhao, precoColocado, precoPraca, freteKg }
const carregando = ref(false)
const calculando = ref(false)

async function carregar() {
  carregando.value = true
  try {
    const [o, d, c] = await Promise.all([
      municipiosOrigemApi.listar({ ativo: true }),
      municipiosDestinoApi.listar(),
      categoriasApi.listar()
    ])
    origens.value = o.data
    destinos.value = d.data
    categorias.value = c.data
    const padrao = d.data.find(x => x.padrao)
    if (padrao) destinoId.value = padrao.id
  } finally {
    carregando.value = false
  }
}

async function iniciarSimulacao() {
  if (!origemId.value || !destinoId.value) return
  calculando.value = true
  try {
    const res = await simulacaoApi.rapida(origemId.value, destinoId.value)
    itens.value = res.data.itens.map(i => ({
      ...i,
      precoColocado: '',
      precoPraca: null,
      freteKg: i.freteKg
    }))
  } finally {
    calculando.value = false
  }
}

async function calcularItem(item) {
  if (!item.precoColocado || !origemId.value || !destinoId.value) {
    item.precoPraca = null
    return
  }
  calculando.value = true
  try {
    const res = await simulacaoApi.calcular({
      municipioOrigemId: Number(origemId.value),
      municipioDestinoId: Number(destinoId.value),
      itens: [{ categoriaId: item.categoriaId, precoColocado: Number(item.precoColocado) }]
    })
    const resultado = res.data.itens[0]
    item.precoPraca = resultado.precoPraca
    item.freteKg = resultado.freteKg
    item.valorIcms = resultado.valorIcms
    item.valorComissao = resultado.valorComissao
  } finally {
    calculando.value = false
  }
}

function fmtKg(v) {
  if (v === null || v === undefined || v === '') return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function fmtArroba(v) {
  if (v === null || v === undefined || v === '') return null
  return `@ R$ ${(Number(v) * 30).toFixed(2).replace('.', ',')}`
}

function fmtKg4(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(4).replace('.', ',')}/kg`
}

watch([origemId, destinoId], () => {
  if (origemId.value && destinoId.value) iniciarSimulacao()
})

onMounted(carregar)
</script>

<template>
  <div>
    <h4 class="fw-bold mb-4">Simulação Rápida</h4>
    <p class="text-muted">Dado o preço posto fazenda destino, calcule o preço máximo a pagar na praça de origem.</p>

    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else>
      <!-- Seletores de Origem e Destino -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">Destino</label>
              <select v-model="destinoId" class="form-select">
                <option value="">Selecione o destino...</option>
                <option v-for="d in destinos" :key="d.id" :value="d.id">
                  {{ d.nome }}-{{ d.uf }}{{ d.padrao ? ' (padrão)' : '' }}
                </option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Origem</label>
              <select v-model="origemId" class="form-select">
                <option value="">Selecione a origem...</option>
                <optgroup v-for="uf in [...new Set(origens.map(o => o.uf))].sort()" :key="uf" :label="uf">
                  <option v-for="o in origens.filter(x => x.uf === uf)" :key="o.id" :value="o.id">
                    {{ o.nome }}-{{ o.uf }}
                  </option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela de Simulação -->
      <div v-if="itens.length > 0" class="card">
        <div class="card-header bg-white">
          <strong>Resultado da Simulação</strong>
          <span v-if="calculando" class="spinner-border spinner-border-sm ms-2 text-primary"></span>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Categoria</th>
                  <th>Faixa (kg)</th>
                  <th>Peso Médio</th>
                  <th>Cab./Caminhão</th>
                  <th class="text-end" style="color:#2980b9">R$/kg Colocado <small class="text-muted">(informe)</small></th>
                  <th class="text-end" style="color:#c0392b">R$/kg Praça <small class="text-muted">(calculado)</small></th>
                  <th class="text-end text-muted">Frete/kg</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in itens" :key="item.categoriaId">
                  <td class="fw-semibold">{{ item.categoriaNome }}</td>
                  <td class="text-muted small">{{ item.pesoMin }}-{{ item.pesoMax }}</td>
                  <td>{{ item.pesoMedio }} kg</td>
                  <td>{{ item.cabCaminhao }}</td>
                  <td class="text-end">
                    <div class="d-flex align-items-center justify-content-end gap-1">
                      <span class="text-muted small">R$</span>
                      <input
                        v-model="item.precoColocado"
                        type="number"
                        step="0.01"
                        min="0"
                        class="form-control form-control-sm input-preco"
                        placeholder="0,00"
                        @input="calcularItem(item)"
                        style="width:110px"
                      />
                    </div>
                  </td>
                  <td class="text-end">
                    <span class="preco-praca fs-6">
                      {{ item.precoPraca !== null ? fmtKg(item.precoPraca) : '—' }}
                    </span>
                    <div v-if="item.precoPraca !== null" class="text-muted" style="font-size:0.75rem;line-height:1;margin-top:2px">
                      {{ fmtArroba(item.precoPraca) }}
                    </div>
                  </td>
                  <td class="text-end text-muted small">{{ fmtKg4(item.freteKg) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="card-footer text-muted small bg-white">
          * R$/kg Praça calculado descontando frete, ICMS e comissão do R$/kg Colocado. Arredondamento para baixo (1 casa decimal).
        </div>
      </div>

      <div v-else-if="origemId && destinoId" class="text-center py-4 text-muted">
        <div class="spinner-border text-primary" v-if="calculando"></div>
        <span v-else>Selecione origem e destino para iniciar a simulação.</span>
      </div>

      <div v-else class="alert alert-info">
        Selecione a <strong>Origem</strong> e o <strong>Destino</strong> para exibir a tabela de simulação.
      </div>
    </div>
  </div>
</template>
