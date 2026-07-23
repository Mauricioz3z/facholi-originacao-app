<script setup>
import { ref, onMounted, computed } from 'vue'
import { embarqueApi } from '../services/api'

const pendentes = ref([])
const embarqueId = ref('')
const embarque = ref(null)
const itensForm = ref([])
const observacoes = ref('')
const carregando = ref(false)
const salvando = ref(false)
const erro = ref('')
const sucesso = ref('')

async function carregarPendentes() {
  carregando.value = true
  try {
    const res = await embarqueApi.listarPendentes()
    pendentes.value = res.data
  } finally {
    carregando.value = false
  }
}

async function selecionarEmbarque() {
  erro.value = ''
  sucesso.value = ''
  embarque.value = null
  if (!embarqueId.value) return
  const res = await embarqueApi.obter(embarqueId.value)
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
  if (temExcedente.value) {
    const ok = confirm('A quantidade que chegou excede a embarcada em pelo menos uma categoria. Confirma o excedente?')
    if (!ok) return
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
    embarqueId.value = ''
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
    <h4 class="fw-bold mb-4">Registro de Chegada</h4>

    <div class="card mb-4">
      <div class="card-body">
        <label class="form-label fw-semibold">Minuta / Embarque</label>
        <div v-if="carregando" class="text-muted small">Carregando...</div>
        <select v-else v-model="embarqueId" class="form-select" @change="selecionarEmbarque">
          <option value="">Selecione a minuta/embarque...</option>
          <option v-for="e in pendentes" :key="e.id" :value="e.id">
            Emb. {{ e.numero }} — Neg. {{ e.negociacaoNumero }} — {{ e.produtorOrigem }}
          </option>
        </select>
        <small v-if="!carregando && pendentes.length === 0" class="text-muted">
          Nenhum embarque pendente de chegada no momento.
        </small>
        <div class="alert alert-warning py-2 small mt-2 mb-0">Sem negociação registrada, o gado não é descarregado.</div>
      </div>
    </div>

    <div v-if="sucesso" class="alert alert-success py-2 small">{{ sucesso }}</div>
    <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>

    <div v-if="embarque" class="card">
      <div class="card-header bg-white fw-semibold">
        Embarque {{ embarque.numero }} — {{ embarque.produtorOrigem }}
      </div>
      <div class="card-body p-0">
        <table class="table align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Categoria</th>
              <th class="text-end">Embarcado</th>
              <th class="text-end">Chegou</th>
              <th class="text-end">Peso Médio (kg)</th>
              <th class="text-end">Debilitados</th>
              <th class="text-end">Morte/Quebra</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in itensForm" :key="item.embarqueItemId">
              <td class="fw-semibold">{{ item.categoriaNome }}</td>
              <td class="text-end text-muted">{{ item.qtdEmbarcada }}</td>
              <td class="text-end">
                <input v-model.number="item.qtdChegou" type="number" min="0" class="form-control form-control-sm text-end d-inline-block" style="width:90px" />
              </td>
              <td class="text-end">
                <input v-model.number="item.pesoMedioEntrada" type="number" step="0.1" min="0" class="form-control form-control-sm text-end d-inline-block" style="width:90px" />
              </td>
              <td class="text-end">
                <input v-model.number="item.animaisDebilitados" type="number" min="0" class="form-control form-control-sm text-end d-inline-block" style="width:80px" />
              </td>
              <td class="text-end" :class="quebra(item) > 0 ? 'text-danger fw-semibold' : 'text-muted'">{{ quebra(item) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer bg-white">
        <div class="mb-3">
          <label class="form-label small fw-semibold">Observações da Chegada</label>
          <input v-model="observacoes" class="form-control form-control-sm" placeholder="Ex.: dois bezerros ficaram em Cuiabá" />
        </div>
        <button class="btn btn-primary" :disabled="salvando" @click="confirmar">
          <span v-if="salvando" class="spinner-border spinner-border-sm me-1"></span>
          Confirmar Chegada
        </button>
      </div>
    </div>
  </div>
</template>
