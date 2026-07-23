<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { embarqueApi, conferenciaApi } from '../services/api'

const route = useRoute()
const router = useRouter()
const embarqueId = Number(route.params.embarqueId)

const embarque = ref(null)
const conf = ref(null)
const carregando = ref(false)
const salvando = ref(false)
const finalizando = ref(false)
const erro = ref('')

const nf = ref('')
const gta = ref('')

const form = ref({
  valorTotalNegociacao: null,
  valorTotalIcms: null,
  comissaoCb: null,
  icmsCb: null,
  freteCb: null,
  despesaCb: null,
  observacaoOcorrencias: ''
})

const qtdTotal = computed(() => embarque.value?.itens?.reduce((s, i) => s + i.qtdEmbarcada, 0) || 0)
const totalMorte = computed(() => embarque.value?.itens?.reduce((s, i) => s + Math.max(0, i.qtdEmbarcada - (i.qtdChegou || 0)), 0) || 0)
const totalDebilitados = computed(() => embarque.value?.itens?.reduce((s, i) => s + (i.animaisDebilitados || 0), 0) || 0)

async function carregar() {
  carregando.value = true
  try {
    const [resEmb, resConf] = await Promise.all([
      embarqueApi.obter(embarqueId),
      conferenciaApi.obter(embarqueId)
    ])
    embarque.value = resEmb.data
    conf.value = resConf.data
    nf.value = resEmb.data.nf || ''
    gta.value = resEmb.data.gta || ''
    form.value = {
      valorTotalNegociacao: resConf.data.valorTotalNegociacao,
      valorTotalIcms: resConf.data.valorTotalIcms,
      comissaoCb: resConf.data.comissaoCb,
      icmsCb: resConf.data.icmsCb,
      freteCb: resConf.data.freteCb,
      despesaCb: resConf.data.despesaCb,
      observacaoOcorrencias: resConf.data.observacaoOcorrencias || ''
    }
  } catch (e) {
    erro.value = e.response?.status === 403
      ? 'Esta tela é restrita ao Master/administrativo.'
      : (e.response?.data?.mensagem || 'Erro ao carregar a conferência.')
  } finally {
    carregando.value = false
  }
}

function fmtMoeda(v) {
  if (v === null || v === undefined) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

async function salvarDocumentos() {
  erro.value = ''
  try {
    await embarqueApi.atualizarDocumentos(embarqueId, { nf: nf.value?.trim() || null, gta: gta.value?.trim() || null })
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar documentos.'
  }
}

async function salvar() {
  erro.value = ''
  salvando.value = true
  try {
    const res = await conferenciaApi.salvar(embarqueId, form.value)
    conf.value = res.data
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar conferência.'
  } finally {
    salvando.value = false
  }
}

async function finalizar() {
  if (!confirm('Finalizar a conferência? Os valores calculados serão travados.')) return
  erro.value = ''
  finalizando.value = true
  try {
    await salvar()
    const res = await conferenciaApi.finalizar(embarqueId)
    conf.value = res.data
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao finalizar conferência.'
  } finally {
    finalizando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex align-items-center gap-2 mb-4">
      <router-link :to="embarque ? `/negociacoes/${embarque.negociacaoId}/embarques` : '/negociacoes'" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left"></i>
      </router-link>
      <h4 class="fw-bold mb-0">Conferência da Recepção</h4>
    </div>

    <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <div v-else-if="erro && !embarque" class="alert alert-danger py-2 small">{{ erro }}</div>

    <template v-else-if="embarque">
      <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>
      <div v-if="conf?.status === 'Finalizada'" class="alert alert-success py-2 small">
        Conferência finalizada em {{ new Date(conf.finalizadaEm).toLocaleString('pt-BR') }}.
      </div>

      <!-- Identificação -->
      <div class="card mb-4">
        <div class="card-header bg-white fw-semibold">Identificação</div>
        <div class="card-body">
          <div class="row g-3 small">
            <div class="col-md-2"><span class="text-muted d-block">Embarque</span><span class="fw-semibold">{{ embarque.numero }}</span></div>
            <div class="col-md-2"><span class="text-muted d-block">Negociação</span><span class="fw-semibold">{{ embarque.negociacaoNumero }}</span></div>
            <div class="col-md-2"><span class="text-muted d-block">Produtor</span><span class="fw-semibold">{{ embarque.produtorOrigem }}</span></div>
            <div class="col-md-2"><span class="text-muted d-block">Qtd. Embarcada</span><span class="fw-semibold">{{ qtdTotal }} CB</span></div>
            <div class="col-md-2"><span class="text-muted d-block">Morte/Quebra</span><span class="fw-semibold text-danger">{{ totalMorte }}</span></div>
            <div class="col-md-2"><span class="text-muted d-block">Debilitados</span><span class="fw-semibold">{{ totalDebilitados }}</span></div>
          </div>
        </div>
      </div>

      <!-- Documentos -->
      <div class="card mb-4">
        <div class="card-header bg-white fw-semibold">Documentos</div>
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <div class="col-md-4">
              <label class="form-label small">NF</label>
              <input v-model="nf" class="form-control form-control-sm" />
            </div>
            <div class="col-md-4">
              <label class="form-label small">GTA</label>
              <input v-model="gta" class="form-control form-control-sm" />
            </div>
            <div class="col-md-4">
              <button class="btn btn-outline-secondary btn-sm" @click="salvarDocumentos">Salvar Documentos</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Financeiro / CB / KG -->
      <div class="card mb-4">
        <div class="card-header bg-white fw-semibold">Apuração Financeira</div>
        <div class="card-body">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label small fw-semibold">R$ Total da Negociação</label>
              <input v-model.number="form.valorTotalNegociacao" type="number" step="0.01" class="form-control" :disabled="conf?.status === 'Finalizada'" />
            </div>
            <div class="col-md-6">
              <label class="form-label small fw-semibold">Total ICMS</label>
              <input v-model.number="form.valorTotalIcms" type="number" step="0.01" class="form-control" :disabled="conf?.status === 'Finalizada'" />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold">Comissão / CB</label>
              <input v-model.number="form.comissaoCb" type="number" step="0.01" class="form-control" :disabled="conf?.status === 'Finalizada'" />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold">ICMS / CB</label>
              <input v-model.number="form.icmsCb" type="number" step="0.01" class="form-control" :disabled="conf?.status === 'Finalizada'" />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold">Frete / CB</label>
              <input v-model.number="form.freteCb" type="number" step="0.01" class="form-control" :disabled="conf?.status === 'Finalizada'" />
            </div>
            <div class="col-md-3">
              <label class="form-label small fw-semibold">Despesa / CB</label>
              <input v-model.number="form.despesaCb" type="number" step="0.01" class="form-control" :disabled="conf?.status === 'Finalizada'" />
            </div>
            <div class="col-12">
              <label class="form-label small fw-semibold">Observação de Ocorrências</label>
              <input v-model="form.observacaoOcorrencias" class="form-control" placeholder="Ex.: dois animais debilitados" :disabled="conf?.status === 'Finalizada'" />
            </div>
          </div>

          <hr />

          <div class="row g-3 small">
            <div class="col-md-3"><span class="text-muted d-block">R$/CB</span><span class="fw-bold">{{ fmtMoeda(conf?.rsCb) }}</span></div>
            <div class="col-md-3"><span class="text-muted d-block">Total Final/CB</span><span class="fw-bold">{{ fmtMoeda(conf?.totalFinalCb) }}</span></div>
            <div class="col-md-3"><span class="text-muted d-block">R$/KG Negociação</span><span class="fw-bold">{{ fmtMoeda(conf?.rsKgNegociacao) }}</span></div>
            <div class="col-md-3"><span class="text-muted d-block">R$/KG Colocado</span><span class="fw-bold">{{ fmtMoeda(conf?.rsKgColocado) }}</span></div>
            <div class="col-12">
              <span class="text-muted d-block">% Quebra / Desvio (peso)</span>
              <span class="fw-bold" :class="(conf?.percentualQuebraDesvio || 0) < 0 ? 'text-danger' : 'text-success'">
                {{ conf?.percentualQuebraDesvio ?? '—' }}{{ conf?.percentualQuebraDesvio !== null && conf?.percentualQuebraDesvio !== undefined ? '%' : '' }}
              </span>
            </div>
          </div>
        </div>
        <div class="card-footer bg-white d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm" :disabled="salvando || conf?.status === 'Finalizada'" @click="salvar">
            <span v-if="salvando" class="spinner-border spinner-border-sm me-1"></span>
            Salvar
          </button>
          <button class="btn btn-success btn-sm" :disabled="finalizando || conf?.status === 'Finalizada'" @click="finalizar">
            <span v-if="finalizando" class="spinner-border spinner-border-sm me-1"></span>
            Finalizar Conferência
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
