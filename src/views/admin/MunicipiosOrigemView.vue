<script setup>
import { ref, onMounted } from 'vue'
import { municipiosOrigemApi } from '../../services/api'

const municipios = ref([])
const carregando = ref(false)
const modalAberto = ref(false)
const editando = ref(null)
const erro = ref('')

const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const form = ref({ nome: '', uf: '', distanciaKm: '', valorKm: '', ativo: true })

async function carregar() {
  carregando.value = true
  try { const res = await municipiosOrigemApi.listar(); municipios.value = res.data }
  finally { carregando.value = false }
}

function abrirNovo() {
  editando.value = null
  form.value = { nome: '', uf: '', distanciaKm: '', valorKm: '', ativo: true }
  modalAberto.value = true
  erro.value = ''
}

function abrirEditar(m) {
  editando.value = m
  form.value = { nome: m.nome, uf: m.uf, distanciaKm: m.distanciaKm, valorKm: m.valorKm, ativo: m.ativo }
  modalAberto.value = true
  erro.value = ''
}

async function salvar() {
  erro.value = ''
  try {
    const payload = { ...form.value, distanciaKm: Number(form.value.distanciaKm), valorKm: Number(form.value.valorKm) }
    if (editando.value) await municipiosOrigemApi.atualizar(editando.value.id, payload)
    else await municipiosOrigemApi.criar(payload)
    modalAberto.value = false
    await carregar()
  } catch (e) { erro.value = e.response?.data?.mensagem || 'Erro ao salvar.' }
}

async function excluir(m) {
  if (!confirm(`Excluir o município "${m.nome}-${m.uf}"?`)) return
  try { await municipiosOrigemApi.excluir(m.id); await carregar() }
  catch { alert('Não é possível excluir: município está vinculado a negociações.') }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">Municípios de Origem</h4>
      <button class="btn btn-primary" @click="abrirNovo">
        <i class="bi bi-plus-lg me-1"></i> Novo Município
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <table v-else class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr><th>Município</th><th>UF</th><th class="text-end">Distância (km)</th><th class="text-end">Valor/km (R$)</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="m in municipios" :key="m.id">
              <td class="fw-semibold">{{ m.nome }}</td>
              <td><span class="badge bg-light text-dark border">{{ m.uf }}</span></td>
              <td class="text-end">{{ Number(m.distanciaKm).toLocaleString('pt-BR', {minimumFractionDigits:1}) }}</td>
              <td class="text-end">R$ {{ Number(m.valorKm).toFixed(4).replace('.', ',') }}</td>
              <td><span :class="m.ativo ? 'badge bg-success' : 'badge bg-secondary'">{{ m.ativo ? 'Ativo' : 'Inativo' }}</span></td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" @click="abrirEditar(m)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" @click="excluir(m)"><i class="bi bi-trash"></i></button>
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
            <h5 class="modal-title">{{ editando ? 'Editar Município' : 'Novo Município de Origem' }}</h5>
            <button class="btn-close" @click="modalAberto = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Município</label>
                <input v-model="form.nome" class="form-control" required />
              </div>
              <div class="col-md-4">
                <label class="form-label">UF</label>
                <select v-model="form.uf" class="form-select" required>
                  <option value="">Selecione</option>
                  <option v-for="uf in ufs" :key="uf">{{ uf }}</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">Distância até destino (km)</label>
                <input v-model="form.distanciaKm" type="number" step="0.1" min="0" class="form-control" required />
              </div>
              <div class="col-md-6">
                <label class="form-label">Valor por km (R$)</label>
                <input v-model="form.valorKm" type="number" step="0.0001" min="0" class="form-control" required />
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input v-model="form.ativo" type="checkbox" class="form-check-input" id="ativoM" />
                  <label class="form-check-label" for="ativoM">Ativo</label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" @click="modalAberto = false">Cancelar</button>
            <button class="btn btn-primary" @click="salvar">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
