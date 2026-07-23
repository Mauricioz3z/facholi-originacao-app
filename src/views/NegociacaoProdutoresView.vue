<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { negociacaoApi, produtorApi } from '../services/api'

const route = useRoute()
const negociacaoId = Number(route.params.id)

const neg = ref(null)
const lotes = ref([])
const carregando = ref(false)
const modalAberto = ref(false)
const editando = ref(null)
const erro = ref('')
const salvando = ref(false)

const form = ref({ categoriaId: '', produtorOrigem: '', qtdCb: null, observacoes: '' })

async function carregar() {
  carregando.value = true
  try {
    const [resNeg, resLotes] = await Promise.all([
      negociacaoApi.obter(negociacaoId),
      produtorApi.listar(negociacaoId)
    ])
    neg.value = resNeg.data
    lotes.value = resLotes.data
  } finally {
    carregando.value = false
  }
}

function abrirNovo() {
  editando.value = null
  form.value = { categoriaId: '', produtorOrigem: '', qtdCb: null, observacoes: '' }
  erro.value = ''
  modalAberto.value = true
}

function abrirEditar(lote) {
  editando.value = lote
  form.value = { categoriaId: lote.categoriaId, produtorOrigem: lote.produtorOrigem, qtdCb: lote.qtdCb, observacoes: lote.observacoes }
  erro.value = ''
  modalAberto.value = true
}

async function salvar() {
  erro.value = ''
  if (!form.value.categoriaId || !form.value.produtorOrigem?.trim() || !form.value.qtdCb) {
    erro.value = 'Preencha categoria, produtor/origem e quantidade.'
    return
  }
  salvando.value = true
  try {
    const payload = {
      categoriaId: Number(form.value.categoriaId),
      produtorOrigem: form.value.produtorOrigem.trim(),
      qtdCb: Number(form.value.qtdCb),
      observacoes: form.value.observacoes?.trim() || null
    }
    if (editando.value) await produtorApi.atualizar(editando.value.id, payload)
    else await produtorApi.criar(negociacaoId, payload)
    modalAberto.value = false
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar lote.'
  } finally {
    salvando.value = false
  }
}

async function excluir(lote) {
  if (!confirm(`Excluir o lote de "${lote.produtorOrigem}" (${lote.categoriaNome})?`)) return
  try {
    await produtorApi.excluir(lote.id)
    await carregar()
  } catch (e) {
    alert(e.response?.data?.mensagem || 'Erro ao excluir lote.')
  }
}

function saldoDisponivel(categoriaId) {
  const item = neg.value?.itens?.find(i => i.categoriaId === categoriaId)
  const qtdNegociada = item?.qtdNegociada || 0
  const somaLotes = lotes.value
    .filter(l => l.categoriaId === categoriaId && (!editando.value || l.id !== editando.value.id))
    .reduce((s, l) => s + l.qtdCb, 0)
  return qtdNegociada - somaLotes
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div class="d-flex align-items-center gap-2">
        <router-link :to="`/negociacoes/${negociacaoId}`" class="btn btn-sm btn-outline-secondary">
          <i class="bi bi-arrow-left"></i>
        </router-link>
        <div>
          <h4 class="fw-bold mb-0">Desmembramento por Produtor</h4>
          <span class="text-muted small" v-if="neg">Negociação {{ neg.numero }} — {{ neg.compradorNome }}</span>
        </div>
      </div>
      <button class="btn btn-primary" @click="abrirNovo">
        <i class="bi bi-plus-lg me-1"></i> Adicionar Produtor
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <div v-else-if="lotes.length === 0" class="text-center text-muted py-5">Nenhum lote cadastrado ainda.</div>
        <table v-else class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Produtor / Origem</th>
              <th>Categoria</th>
              <th class="text-end">Qtd (CB)</th>
              <th class="text-end">Embarcado</th>
              <th class="text-end">Recebido</th>
              <th class="text-end">Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lote in lotes" :key="lote.id">
              <td class="fw-semibold">{{ lote.produtorOrigem }}</td>
              <td>{{ lote.categoriaNome }}</td>
              <td class="text-end">{{ lote.qtdCb }}</td>
              <td class="text-end">{{ lote.qtdEmbarcada }}</td>
              <td class="text-end">{{ lote.qtdRecebida }}</td>
              <td class="text-end" :class="lote.saldoRecebido > 0 ? 'text-warning fw-semibold' : 'text-success'">{{ lote.saldoRecebido }}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" @click="abrirEditar(lote)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" @click="excluir(lote)"><i class="bi bi-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="modalAberto" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,0.4)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar Lote' : 'Adicionar Produtor' }}</h5>
            <button class="btn-close" @click="modalAberto = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">Categoria</label>
                <select v-model="form.categoriaId" class="form-select" :disabled="!!editando">
                  <option value="">Selecione...</option>
                  <option v-for="item in neg?.itens" :key="item.categoriaId" :value="item.categoriaId">
                    {{ item.categoriaNome }} (negociado: {{ item.qtdNegociada }} CB)
                  </option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Produtor / Origem</label>
                <input v-model="form.produtorOrigem" class="form-control" placeholder="Ex.: Jose da Silva, Fazenda Santana" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Qtd (CB)</label>
                <input v-model.number="form.qtdCb" type="number" min="1" class="form-control" />
                <small v-if="form.categoriaId" class="text-muted">Saldo disponível: {{ saldoDisponivel(Number(form.categoriaId)) }} CB</small>
              </div>
              <div class="col-12">
                <label class="form-label">Observações</label>
                <input v-model="form.observacoes" class="form-control" />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" @click="modalAberto = false">Cancelar</button>
            <button class="btn btn-primary" :disabled="salvando" @click="salvar">
              <span v-if="salvando" class="spinner-border spinner-border-sm me-1"></span>
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
