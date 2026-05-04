<script setup>
import { ref, onMounted } from 'vue'
import { corretoresApi } from '../../services/api'

const corretores = ref([])
const carregando = ref(false)
const modalAberto = ref(false)
const editando = ref(null)
const erro = ref('')

const form = ref({ nome: '', telefone: '', municipio: '', uf: '', propriedade: '', observacoes: '', ativo: true })

const ufs = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

async function carregar() {
  carregando.value = true
  try { const res = await corretoresApi.listar(); corretores.value = res.data }
  finally { carregando.value = false }
}

function abrirNovo() {
  editando.value = null
  form.value = { nome: '', telefone: '', municipio: '', uf: '', propriedade: '', observacoes: '', ativo: true }
  modalAberto.value = true
  erro.value = ''
}

function abrirEditar(c) {
  editando.value = c
  form.value = { nome: c.nome, telefone: c.telefone, municipio: c.municipio, uf: c.uf, propriedade: c.propriedade, observacoes: c.observacoes, ativo: c.ativo }
  modalAberto.value = true
  erro.value = ''
}

async function salvar() {
  erro.value = ''
  try {
    if (editando.value) await corretoresApi.atualizar(editando.value.id, form.value)
    else await corretoresApi.criar(form.value)
    modalAberto.value = false
    await carregar()
  } catch (e) { erro.value = e.response?.data?.mensagem || 'Erro ao salvar.' }
}

async function excluir(c) {
  if (!confirm(`Excluir o corretor "${c.nome}"?`)) return
  await corretoresApi.excluir(c.id)
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">Corretores / Fornecedores</h4>
      <button class="btn btn-primary" @click="abrirNovo">
        <i class="bi bi-plus-lg me-1"></i> Novo Corretor
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <table v-else class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr><th>Nome</th><th>Telefone</th><th>Município-UF</th><th>Propriedade</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="c in corretores" :key="c.id">
              <td class="fw-semibold">{{ c.nome }}</td>
              <td>{{ c.telefone || '—' }}</td>
              <td>{{ c.municipio ? `${c.municipio}-${c.uf}` : '—' }}</td>
              <td>{{ c.propriedade || '—' }}</td>
              <td><span :class="c.ativo ? 'badge bg-success' : 'badge bg-secondary'">{{ c.ativo ? 'Ativo' : 'Inativo' }}</span></td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" @click="abrirEditar(c)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" @click="excluir(c)"><i class="bi bi-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="modalAberto" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,0.4)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar Corretor' : 'Novo Corretor' }}</h5>
            <button class="btn-close" @click="modalAberto = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Nome</label>
                <input v-model="form.nome" class="form-control" required />
              </div>
              <div class="col-md-4">
                <label class="form-label">Telefone / WhatsApp</label>
                <input v-model="form.telefone" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Município</label>
                <input v-model="form.municipio" class="form-control" />
              </div>
              <div class="col-md-2">
                <label class="form-label">UF</label>
                <select v-model="form.uf" class="form-select">
                  <option value="">—</option>
                  <option v-for="uf in ufs" :key="uf">{{ uf }}</option>
                </select>
              </div>
              <div class="col-md-4">
                <label class="form-label">Propriedade / Fazenda</label>
                <input v-model="form.propriedade" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">Observações</label>
                <textarea v-model="form.observacoes" class="form-control" rows="2"></textarea>
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input v-model="form.ativo" type="checkbox" class="form-check-input" id="ativoC" />
                  <label class="form-check-label" for="ativoC">Ativo</label>
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
