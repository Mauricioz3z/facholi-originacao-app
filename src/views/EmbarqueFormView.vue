<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { negociacaoApi, produtorApi, embarqueApi, municipiosDestinoApi } from '../services/api'

const router = useRouter()
const route = useRoute()
const isEdicao = computed(() => !!route.params.embarqueId)

const negociacaoId = ref(Number(route.params.id) || null)
const neg = ref(null)
const lotes = ref([])
const destinos = ref([])
const carregando = ref(false)
const salvando = ref(false)
const erro = ref('')
const embarqueExistente = ref(null)

const produtorOrigem = ref('')
const form = ref({
  municipioDestinoId: '',
  dataEmbarque: '',
  nf: '',
  gta: ''
})

// Uma linha por categoria negociada. Cada linha ou usa um lote já existente
// (produtor já desmembrado antes) ou cria um lote novo na hora (produtor
// digitado agora, sem passar pela tela de Desmembramento).
const itensForm = ref([])

const nomesProdutoresConhecidos = computed(() => [...new Set(lotes.value.map(l => l.produtorOrigem))])

function normaliza(s) {
  return (s || '').trim().toLowerCase()
}

function montarItensForm() {
  const nome = produtorOrigem.value
  if (!neg.value) { itensForm.value = []; return }

  itensForm.value = neg.value.itens.map(item => {
    const loteExistente = lotes.value.find(l => l.categoriaId === item.categoriaId && normaliza(l.produtorOrigem) === normaliza(nome))
    const itemEmbarqueExistente = embarqueExistente.value?.itens?.find(i =>
      loteExistente ? i.negociacaoProdutorId === loteExistente.id : i.categoriaId === item.categoriaId)

    if (loteExistente) {
      const saldoOutrosEmbarques = loteExistente.saldoEmbarque + (itemEmbarqueExistente?.qtdEmbarcada || 0)
      return {
        categoriaId: item.categoriaId,
        categoriaNome: item.categoriaNome,
        modo: 'existente',
        negociacaoProdutorId: loteExistente.id,
        saldoDisponivel: saldoOutrosEmbarques,
        ativo: !!itemEmbarqueExistente,
        qtdEmbarcada: itemEmbarqueExistente?.qtdEmbarcada || null
      }
    }

    const somaTodosLotes = lotes.value.filter(l => l.categoriaId === item.categoriaId).reduce((s, l) => s + l.qtdCb, 0)
    const saldoNaoDesmembrado = (item.qtdNegociada || 0) - somaTodosLotes
    return {
      categoriaId: item.categoriaId,
      categoriaNome: item.categoriaNome,
      modo: 'novo',
      saldoNaoDesmembrado,
      ativo: !!itemEmbarqueExistente,
      qtdTotalProdutor: itemEmbarqueExistente?.qtdEmbarcada || saldoNaoDesmembrado || null,
      qtdEmbarcada: itemEmbarqueExistente?.qtdEmbarcada || null
    }
  })
}

watch(produtorOrigem, montarItensForm)

async function carregar() {
  carregando.value = true
  try {
    if (isEdicao.value) {
      const resEmb = await embarqueApi.obter(route.params.embarqueId)
      embarqueExistente.value = resEmb.data
      negociacaoId.value = resEmb.data.negociacaoId
      form.value.municipioDestinoId = resEmb.data.municipioDestinoId
      form.value.dataEmbarque = resEmb.data.dataEmbarque ? resEmb.data.dataEmbarque.substring(0, 10) : ''
      form.value.nf = resEmb.data.nf || ''
      form.value.gta = resEmb.data.gta || ''
    }

    const [resNeg, resLotes, resDestinos] = await Promise.all([
      negociacaoApi.obter(negociacaoId.value),
      produtorApi.listar(negociacaoId.value),
      municipiosDestinoApi.listar()
    ])
    neg.value = resNeg.data
    lotes.value = resLotes.data
    destinos.value = resDestinos.data

    if (isEdicao.value) {
      produtorOrigem.value = embarqueExistente.value.produtorOrigem
    } else if (!form.value.municipioDestinoId) {
      form.value.municipioDestinoId = neg.value.municipioDestinoId
    }
    montarItensForm()
  } finally {
    carregando.value = false
  }
}

async function salvar() {
  erro.value = ''
  const ativos = itensForm.value.filter(i => i.ativo)
  if (!produtorOrigem.value.trim()) {
    erro.value = 'Informe o produtor/origem (pode ser "Não informado" se for uma entrega única).'
    return
  }
  if (ativos.length === 0) {
    erro.value = 'Marque ao menos uma categoria embarcada.'
    return
  }
  for (const item of ativos) {
    if (!item.qtdEmbarcada || item.qtdEmbarcada <= 0) {
      erro.value = `Informe a quantidade embarcada de ${item.categoriaNome}.`
      return
    }
    if (item.modo === 'novo' && (!item.qtdTotalProdutor || item.qtdTotalProdutor <= 0)) {
      erro.value = `Informe a quantidade total do produtor para ${item.categoriaNome}.`
      return
    }
  }

  salvando.value = true
  try {
    const payload = {
      produtorOrigem: produtorOrigem.value.trim(),
      municipioDestinoId: form.value.municipioDestinoId ? Number(form.value.municipioDestinoId) : null,
      dataEmbarque: form.value.dataEmbarque || null,
      nf: form.value.nf?.trim() || null,
      gta: form.value.gta?.trim() || null,
      itens: ativos.map(i => i.modo === 'existente'
        ? { negociacaoProdutorId: i.negociacaoProdutorId, qtdEmbarcada: Number(i.qtdEmbarcada) }
        : { categoriaId: i.categoriaId, qtdTotalProdutor: Number(i.qtdTotalProdutor), qtdEmbarcada: Number(i.qtdEmbarcada) }
      )
    }
    if (isEdicao.value) {
      await embarqueApi.atualizar(route.params.embarqueId, payload)
    } else {
      await embarqueApi.criar(negociacaoId.value, payload)
    }
    router.push(`/negociacoes/${negociacaoId.value}/embarques`)
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar embarque.'
  } finally {
    salvando.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex align-items-center gap-2 mb-4">
      <router-link :to="negociacaoId ? `/negociacoes/${negociacaoId}/embarques` : '/negociacoes'" class="btn btn-sm btn-outline-secondary">
        <i class="bi bi-arrow-left"></i>
      </router-link>
      <h4 class="fw-bold mb-0">{{ isEdicao ? 'Editar Embarque' : 'Novo Embarque' }}</h4>
    </div>

    <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <form v-else @submit.prevent="salvar">
      <div class="card mb-4">
        <div class="card-header bg-white fw-semibold">Dados do Embarque</div>
        <div class="card-body">
          <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold">Produtor / Origem <span class="text-danger">*</span></label>
              <input
                v-model="produtorOrigem"
                class="form-control"
                list="produtores-conhecidos"
                :disabled="isEdicao"
                placeholder='Ex.: Jose da Silva (ou "Não informado" pra entrega única)'
              />
              <datalist id="produtores-conhecidos">
                <option v-for="nome in nomesProdutoresConhecidos" :key="nome" :value="nome" />
              </datalist>
              <small class="text-muted">
                Se já existir lote desmembrado com esse nome, o saldo dele é usado. Se não existir, um lote novo é criado agora.
              </small>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold">Destino</label>
              <select v-model="form.municipioDestinoId" class="form-select">
                <option v-for="d in destinos" :key="d.id" :value="d.id">{{ d.nome }}-{{ d.uf }}</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">Data</label>
              <input v-model="form.dataEmbarque" type="date" class="form-control" />
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">NF</label>
              <input v-model="form.nf" class="form-control" placeholder="Pode ser preenchida na conferência" />
            </div>
            <div class="col-md-4">
              <label class="form-label fw-semibold">GTA</label>
              <input v-model="form.gta" class="form-control" placeholder="Pode ser preenchida na conferência" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="produtorOrigem.trim()" class="card mb-4">
        <div class="card-header bg-white fw-semibold">Categorias Embarcadas</div>
        <div class="card-body p-0">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th></th>
                <th>Categoria</th>
                <th class="text-end">Qtd. Total do Produtor</th>
                <th class="text-end">Saldo disponível</th>
                <th class="text-end">Qtd. Embarcada Agora</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in itensForm" :key="item.categoriaId">
                <td><input type="checkbox" class="form-check-input" v-model="item.ativo" /></td>
                <td class="fw-semibold">
                  {{ item.categoriaNome }}
                  <span v-if="item.modo === 'novo'" class="badge bg-light text-dark border ms-1" style="font-weight:400">lote novo</span>
                </td>
                <td class="text-end">
                  <input
                    v-if="item.ativo && item.modo === 'novo'"
                    v-model.number="item.qtdTotalProdutor"
                    type="number" min="1" :max="item.saldoNaoDesmembrado"
                    class="form-control form-control-sm text-end d-inline-block"
                    style="width: 100px"
                    title="Cria o lote deste produtor com esse tamanho"
                  />
                  <span v-else-if="item.modo === 'existente'" class="text-muted">já desmembrado</span>
                  <span v-else class="text-muted">—</span>
                </td>
                <td class="text-end text-muted">
                  {{ item.modo === 'existente' ? item.saldoDisponivel : item.saldoNaoDesmembrado }} CB
                </td>
                <td class="text-end">
                  <input
                    v-if="item.ativo"
                    v-model.number="item.qtdEmbarcada"
                    type="number" min="1" :max="item.modo === 'existente' ? item.saldoDisponivel : item.qtdTotalProdutor"
                    class="form-control form-control-sm text-end d-inline-block"
                    style="width: 100px"
                  />
                  <span v-else class="text-muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <button type="submit" class="btn btn-primary" :disabled="salvando">
        <span v-if="salvando" class="spinner-border spinner-border-sm me-1"></span>
        Salvar Embarque
      </button>
    </form>
  </div>
</template>
