<script setup>
import { ref, onMounted, watch } from 'vue'
import { municipiosOrigemApi, municipiosDestinoApi, simulacaoApi } from '../../services/api'

const origens = ref([])
const destinos = ref([])
const origemId = ref('')
const destinoId = ref('')
const itens = ref([])
const carregando = ref(false)
const calculando = ref(false)

async function carregar() {
  carregando.value = true
  try {
    const [o, d] = await Promise.all([
      municipiosOrigemApi.listar({ ativo: true }),
      municipiosDestinoApi.listar()
    ])
    origens.value = o.data
    destinos.value = d.data
    const padrao = d.data.find(x => x.padrao)
    if (padrao) destinoId.value = padrao.id
  } finally {
    carregando.value = false
  }
}

async function simular() {
  if (!origemId.value || !destinoId.value) return
  calculando.value = true
  itens.value = []
  try {
    const res = await simulacaoApi.rapida(origemId.value, destinoId.value)
    itens.value = res.data.itens.map(i => ({ ...i, precoColocado: '', precoPraca: null }))
  } finally {
    calculando.value = false
  }
}

async function calcular(item) {
  if (!item.precoColocado) { item.precoPraca = null; return }
  try {
    const res = await simulacaoApi.calcular({
      municipioOrigemId: Number(origemId.value),
      municipioDestinoId: Number(destinoId.value),
      itens: [{ categoriaId: item.categoriaId, precoColocado: Number(item.precoColocado) }]
    })
    const r = res.data.itens[0]
    item.precoPraca = r.precoPraca
    item.freteKg = r.freteKg
    item.valorIcms = r.valorIcms
  } catch {}
}

function fmtR(v) {
  if (v === null || v === undefined || v === '') return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function fmtFrete(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(4).replace('.', ',')}/kg`
}

watch([origemId, destinoId], () => {
  if (origemId.value && destinoId.value) simular()
})

onMounted(carregar)
</script>

<template>
  <div>
    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border" style="color:var(--pwa-verde)"></div>
    </div>

    <div v-else>
      <div class="pwa-card">
        <div class="pwa-card-header">
          <i class="bi bi-geo-alt-fill me-2"></i>Origem e Destino
        </div>
        <div class="pwa-card-body">
          <div style="margin-bottom:1rem">
            <label class="pwa-label">Destino</label>
            <div class="pwa-select-wrap">
              <select v-model="destinoId" class="pwa-select">
                <option value="">Selecione o destino...</option>
                <option v-for="d in destinos" :key="d.id" :value="d.id">
                  {{ d.nome }}-{{ d.uf }}{{ d.padrao ? ' ★' : '' }}
                </option>
              </select>
            </div>
          </div>
          <div>
            <label class="pwa-label">Origem</label>
            <div class="pwa-select-wrap">
              <select v-model="origemId" class="pwa-select">
                <option value="">Selecione a origem...</option>
                <optgroup
                  v-for="uf in [...new Set(origens.map(o => o.uf))].sort()"
                  :key="uf"
                  :label="uf"
                >
                  <option
                    v-for="o in origens.filter(x => x.uf === uf)"
                    :key="o.id"
                    :value="o.id"
                  >
                    {{ o.nome }}-{{ o.uf }}
                  </option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div v-if="calculando" class="text-center py-4">
        <div class="spinner-border" style="color:var(--pwa-verde)"></div>
        <div style="margin-top:0.5rem;color:var(--pwa-texto-suave);font-size:0.9rem">Calculando...</div>
      </div>

      <div
        v-else-if="!origemId || !destinoId"
        style="text-align:center;padding:2.5rem 1rem;color:var(--pwa-texto-suave)"
      >
        <i class="bi bi-calculator" style="font-size:3.5rem;color:var(--pwa-borda);display:block;margin-bottom:1rem"></i>
        <p style="font-size:1rem;margin:0">
          Selecione a <strong>origem</strong> e o <strong>destino</strong> acima para iniciar a simulação.
        </p>
      </div>

      <template v-else-if="itens.length > 0">
        <div class="pwa-section-title">Preços por Categoria</div>

        <div v-for="item in itens" :key="item.categoriaId" class="pwa-sim-row">
          <div class="pwa-sim-categoria">{{ item.categoriaNome }}</div>
          <div class="pwa-sim-faixa">
            {{ item.pesoMin }}–{{ item.pesoMax }} kg &nbsp;·&nbsp;
            Médio: {{ item.pesoMedio }} kg &nbsp;·&nbsp;
            {{ item.cabCaminhao }} cab/caminhão
          </div>

          <div style="margin:0.75rem 0 0.5rem">
            <label class="pwa-label" style="color:var(--pwa-verde)">
              R$/kg Colocado — informe o preço
            </label>
            <input
              v-model="item.precoColocado"
              type="number"
              step="0.01"
              min="0"
              inputmode="decimal"
              class="pwa-num-input"
              placeholder="0,00"
              @input="calcular(item)"
            />
          </div>

          <div class="pwa-sim-valores">
            <div class="pwa-sim-campo">
              <div class="pwa-sim-campo-label">R$/kg Praça</div>
              <div class="pwa-sim-campo-valor praca">{{ fmtR(item.precoPraca) }}</div>
            </div>
            <div class="pwa-sim-campo">
              <div class="pwa-sim-campo-label">Frete/kg</div>
              <div class="pwa-sim-campo-valor" style="color:var(--pwa-texto-suave);font-size:0.88rem">
                {{ fmtFrete(item.freteKg) }}
              </div>
            </div>
          </div>
        </div>

        <p style="font-size:0.78rem;color:var(--pwa-texto-suave);text-align:center;margin-top:0.5rem;padding:0 0.5rem">
          Praça = Colocado − Frete − ICMS − Comissão (arredondado para baixo, 1 casa decimal)
        </p>
      </template>
    </div>
  </div>
</template>
