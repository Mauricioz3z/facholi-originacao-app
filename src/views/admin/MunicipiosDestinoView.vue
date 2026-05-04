<script setup>
import { ref, onMounted } from 'vue'
import { municipiosDestinoApi } from '../../services/api'

const municipios = ref([])
const carregando = ref(false)
const modalAberto = ref(false)
const editando = ref(null)
const erro = ref('')
const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const form = ref({ nome: '', uf: 'SP', padrao: false })

async function carregar() {
  carregando.value = true
  try { const res = await municipiosDestinoApi.listar(); municipios.value = res.data }
  finally { carregando.value = false }
}

function abrirNovo() {
  editando.value = null; form.value = { nome: '', uf: 'SP', padrao: false }; modalAberto.value = true; erro.value = ''
}

function abrirEditar(m) {
  editando.value = m; form.value = { nome: m.nome, uf: m.uf, padrao: m.padrao }; modalAberto.value = true; erro.value = ''
}

async function salvar() {
  erro.value = ''
  try {
    if (editando.value) await municipiosDestinoApi.atualizar(editando.value.id, form.value)
    else await municipiosDestinoApi.criar(form.value)
    modalAberto.value = false; await carregar()
  } catch (e) { erro.value = e.response?.data?.mensagem || 'Erro ao salvar.' }
}

async function excluir(m) {
  if (!confirm(`Excluir "${m.nome}-${m.uf}"?`)) return
  try { await municipiosDestinoApi.excluir(m.id); await carregar() }
  catch { alert('Não é possível excluir este destino.') }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">Municípios de Destino</h4>
      <button class="btn btn-primary" @click="abrirNovo"><i class="bi bi-plus-lg me-1"></i> Novo Destino</button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <table v-else class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr><th>Município</th><th>UF</th><th>Padrão</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="m in municipios" :key="m.id">
              <td class="fw-semibold">{{ m.nome }}</td>
              <td>{{ m.uf }}</td>
              <td><span v-if="m.padrao" class="badge bg-primary">Padrão</span></td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" @click="abrirEditar(m)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" @click="excluir(m)" :disabled="m.padrao"><i class="bi bi-trash"></i></button>
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
            <h5 class="modal-title">{{ editando ? 'Editar Destino' : 'Novo Destino' }}</h5>
            <button class="btn-close" @click="modalAberto = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>
            <div class="mb-3"><label class="form-label">Município</label><input v-model="form.nome" class="form-control" /></div>
            <div class="mb-3"><label class="form-label">UF</label>
              <select v-model="form.uf" class="form-select"><option v-for="uf in ufs" :key="uf">{{ uf }}</option></select>
            </div>
            <div class="form-check">
              <input v-model="form.padrao" type="checkbox" class="form-check-input" id="padrao" />
              <label class="form-check-label" for="padrao">Definir como destino padrão</label>
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
