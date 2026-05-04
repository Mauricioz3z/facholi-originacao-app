<script setup>
import { ref, onMounted } from 'vue'
import { usuariosApi } from '../../services/api'

const usuarios = ref([])
const carregando = ref(false)
const modalAberto = ref(false)
const editando = ref(null)
const erro = ref('')

const form = ref({ nome: '', email: '', senha: '', telefone: '', perfil: 'Comprador', ativo: true })

async function carregar() {
  carregando.value = true
  try {
    const res = await usuariosApi.listar()
    usuarios.value = res.data
  } finally { carregando.value = false }
}

function abrirNovo() {
  editando.value = null
  form.value = { nome: '', email: '', senha: '', telefone: '', perfil: 'Comprador', ativo: true }
  modalAberto.value = true
  erro.value = ''
}

function abrirEditar(u) {
  editando.value = u
  form.value = { nome: u.nome, email: u.email, senha: '', telefone: u.telefone, perfil: u.perfil, ativo: u.ativo }
  modalAberto.value = true
  erro.value = ''
}

async function salvar() {
  erro.value = ''
  try {
    if (editando.value) {
      await usuariosApi.atualizar(editando.value.id, form.value)
    } else {
      if (!form.value.senha) { erro.value = 'Informe a senha para o novo usuário.'; return }
      await usuariosApi.criar(form.value)
    }
    modalAberto.value = false
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar.'
  }
}

async function excluir(u) {
  if (!confirm(`Excluir o usuário "${u.nome}"?`)) return
  await usuariosApi.excluir(u.id)
  await carregar()
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">Compradores (Usuários)</h4>
      <button class="btn btn-primary" @click="abrirNovo">
        <i class="bi bi-plus-lg me-1"></i> Novo Usuário
      </button>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <table v-else class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Perfil</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuarios" :key="u.id">
              <td class="fw-semibold">{{ u.nome }}</td>
              <td>{{ u.email }}</td>
              <td>{{ u.telefone || '—' }}</td>
              <td><span :class="u.perfil === 'Admin' ? 'badge bg-danger' : 'badge bg-primary'">{{ u.perfil }}</span></td>
              <td><span :class="u.ativo ? 'badge bg-success' : 'badge bg-secondary'">{{ u.ativo ? 'Ativo' : 'Inativo' }}</span></td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" @click="abrirEditar(u)"><i class="bi bi-pencil"></i></button>
                <button class="btn btn-sm btn-outline-danger" @click="excluir(u)"><i class="bi bi-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modalAberto" class="modal d-block" tabindex="-1" style="background:rgba(0,0,0,0.4)">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">{{ editando ? 'Editar Usuário' : 'Novo Usuário' }}</h5>
            <button class="btn-close" @click="modalAberto = false"></button>
          </div>
          <div class="modal-body">
            <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>
            <div class="mb-3">
              <label class="form-label">Nome completo</label>
              <input v-model="form.nome" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">E-mail</label>
              <input v-model="form.email" type="email" class="form-control" required />
            </div>
            <div class="mb-3">
              <label class="form-label">Senha{{ editando ? ' (deixe em branco para manter)' : '' }}</label>
              <input v-model="form.senha" type="password" class="form-control" :required="!editando" />
            </div>
            <div class="mb-3">
              <label class="form-label">Telefone</label>
              <input v-model="form.telefone" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Perfil</label>
              <select v-model="form.perfil" class="form-select">
                <option value="Comprador">Comprador</option>
                <option value="Admin">Administrador</option>
              </select>
            </div>
            <div class="form-check">
              <input v-model="form.ativo" type="checkbox" class="form-check-input" id="ativo" />
              <label class="form-check-label" for="ativo">Ativo</label>
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
