<script setup>
import { ref, onMounted, computed } from 'vue'
import { embarqueApi } from '../../services/api'
import PwaSelectBusca from '../../components/PwaSelectBusca.vue'

const pendentes = ref([])
const embarqueId = ref(null)
const embarque = ref(null)
const itensForm = ref([])
const observacoes = ref('')
const carregando = ref(false)
const salvando = ref(false)
const erro = ref('')
const sucesso = ref('')

function rotuloEmbarque(e) {
  return `Emb. ${e.numero} — Neg. ${e.negociacaoNumero} — ${e.produtorOrigem}`
}

async function carregarPendentes() {
  carregando.value = true
  try {
    const res = await embarqueApi.listarPendentes()
    pendentes.value = res.data
  } finally {
    carregando.value = false
  }
}

async function aoSelecionar(item) {
  erro.value = ''
  sucesso.value = ''
  if (!item) {
    embarque.value = null
    return
  }
  const res = await embarqueApi.obter(item.id)
  embarque.value = res.data
  itensForm.value = res.data.itens.map(i => ({
    embarqueItemId: i.id,
    categoriaNome: i.categoriaNome,
    qtdEmbarcada: i.qtdEmbarcada,
    qtdChegou: i.qtdEmbarcada,
    pesoMedioEntrada: null,
    animaisDebilitados: 0
  }))
}

function quebra(item) {
  if (item.qtdChegou === null || item.qtdChegou === undefined || item.qtdChegou === '') return 0
  return Math.max(0, item.qtdEmbarcada - Number(item.qtdChegou))
}

const temExcedente = computed(() =>
  itensForm.value.some(i => Number(i.qtdChegou) > i.qtdEmbarcada)
)

async function confirmar() {
  erro.value = ''
  sucesso.value = ''
  for (const item of itensForm.value) {
    if (item.qtdChegou === null || item.qtdChegou === '' || Number(item.qtdChegou) < 0) {
      erro.value = `Informe a quantidade que chegou de ${item.categoriaNome}.`
      return
    }
  }
  if (temExcedente.value && !confirm('A quantidade que chegou excede a embarcada em pelo menos uma categoria. Confirma o excedente?')) {
    return
  }

  salvando.value = true
  try {
    await embarqueApi.registrarChegada(embarqueId.value, {
      itens: itensForm.value.map(i => ({
        embarqueItemId: i.embarqueItemId,
        qtdChegou: Number(i.qtdChegou),
        pesoMedioEntrada: i.pesoMedioEntrada ? Number(i.pesoMedioEntrada) : null,
        animaisDebilitados: Number(i.animaisDebilitados) || 0
      })),
      observacoesChegada: observacoes.value?.trim() || null
    })
    sucesso.value = 'Chegada registrada com sucesso.'
    embarque.value = null
    embarqueId.value = null
    observacoes.value = ''
    await carregarPendentes()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao registrar chegada.'
  } finally {
    salvando.value = false
  }
}

onMounted(carregarPendentes)
</script>

<template>
  <div>
    <div class="pwa-card" style="margin-bottom:1rem">
      <div class="pwa-card-body">
        <label class="pwa-label">Minuta / Embarque</label>
        <PwaSelectBusca
          v-model="embarqueId"
          :opcoes="pendentes"
          :label-field="rotuloEmbarque"
          placeholder="Selecionar minuta/embarque..."
          titulo="Selecionar embarque"
          :permitir-limpar="false"
          @change="aoSelecionar"
        />
        <p v-if="!carregando && pendentes.length === 0" style="font-size:0.82rem;color:var(--pwa-texto-suave);margin:0.5rem 0 0">
          Nenhum embarque pendente de chegada no momento.
        </p>
        <div style="margin-top:0.75rem;padding:0.65rem 0.85rem;background:#fdecea;border-radius:8px;font-size:0.8rem;color:#c0392b">
          Sem negociação registrada, o gado não é descarregado.
        </div>
      </div>
    </div>

    <div v-if="sucesso" class="pwa-card" style="margin-bottom:1rem;background:rgba(46,160,67,0.08)">
      <div class="pwa-card-body" style="color:var(--pwa-verde);font-weight:600">{{ sucesso }}</div>
    </div>
    <div v-if="erro" style="color:#c0392b;padding:0.75rem 1rem;background:#fdecea;border-radius:10px;margin-bottom:1rem;font-size:0.9rem">
      {{ erro }}
    </div>

    <template v-if="embarque">
      <div class="pwa-section-title">Emb. {{ embarque.numero }} — {{ embarque.produtorOrigem }}</div>

      <div v-for="item in itensForm" :key="item.embarqueItemId" class="pwa-card" style="margin-bottom:0.75rem">
        <div class="pwa-card-body">
          <div style="font-weight:700;color:var(--pwa-texto);margin-bottom:0.5rem">{{ item.categoriaNome }}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div>
              <label class="pwa-label">Embarcado</label>
              <div class="pwa-num-input" style="background:#f5f7f5;display:flex;align-items:center">{{ item.qtdEmbarcada }}</div>
            </div>
            <div>
              <label class="pwa-label">Qtd. que Chegou</label>
              <input v-model.number="item.qtdChegou" type="number" min="0" inputmode="numeric" class="pwa-num-input" />
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:0.75rem">
            <div>
              <label class="pwa-label">Peso Médio (kg)</label>
              <input v-model.number="item.pesoMedioEntrada" type="number" step="0.1" min="0" inputmode="decimal" class="pwa-num-input" />
            </div>
            <div>
              <label class="pwa-label">Debilitados</label>
              <input v-model.number="item.animaisDebilitados" type="number" min="0" inputmode="numeric" class="pwa-num-input" />
            </div>
          </div>
          <div style="margin-top:0.5rem;font-size:0.82rem" :style="{ color: quebra(item) > 0 ? '#c0392b' : 'var(--pwa-texto-suave)' }">
            Morte (não chegou): {{ quebra(item) }}
          </div>
        </div>
      </div>

      <div class="pwa-card" style="margin-bottom:1rem">
        <div class="pwa-card-body">
          <label class="pwa-label">Observações da Chegada</label>
          <input v-model="observacoes" class="pwa-input" placeholder="Ex.: dois bezerros ficaram em Cuiabá" />
        </div>
      </div>

      <button class="pwa-btn pwa-btn-primary" :disabled="salvando" @click="confirmar" style="margin-bottom:1rem">
        <span v-if="salvando" class="spinner-border spinner-border-sm"></span>
        <i v-else class="bi bi-check-lg"></i>
        Confirmar Chegada
      </button>
    </template>
  </div>
</template>
