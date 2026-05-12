<script setup>
import { ref, onMounted } from 'vue'
import { categoriasApi } from '../../services/api'

const categorias = ref([])
const carregando = ref(false)
const salvando = ref(false)
const mensagem = ref('')
const erro = ref('')

const criando = ref(false)
const formNova = ref({
  nome: '',
  pesoMin: null,
  pesoMax: null,
  pesoMedio: null,
  cabCaminhao: null,
  ordem: null,
  agioPadrao: 0
})

function resetarForm() {
  formNova.value = {
    nome: '',
    pesoMin: null,
    pesoMax: null,
    pesoMedio: null,
    cabCaminhao: null,
    ordem: proximaOrdem(),
    agioPadrao: 0
  }
}

function proximaOrdem() {
  if (!categorias.value.length) return 1
  return Math.max(...categorias.value.map(c => c.ordem || 0)) + 1
}

async function carregar() {
  carregando.value = true
  try {
    const res = await categoriasApi.listar()
    categorias.value = JSON.parse(JSON.stringify(res.data))
  } finally {
    carregando.value = false
  }
}

async function salvar(cat) {
  salvando.value = true
  mensagem.value = ''
  erro.value = ''
  try {
    await categoriasApi.atualizar(cat.id, cat)
    mensagem.value = 'Categoria atualizada com sucesso!'
    setTimeout(() => mensagem.value = '', 3000)
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar.'
  } finally {
    salvando.value = false
  }
}

function abrirFormNova() {
  resetarForm()
  criando.value = true
  erro.value = ''
  mensagem.value = ''
}

function cancelarNova() {
  criando.value = false
  erro.value = ''
}

async function salvarNova() {
  erro.value = ''
  mensagem.value = ''

  const f = formNova.value
  if (!f.nome?.trim()) { erro.value = 'Informe o nome da categoria.'; return }
  if (f.pesoMin === null || f.pesoMax === null || f.pesoMedio === null) {
    erro.value = 'Informe peso mínimo, máximo e médio.'
    return
  }
  if (Number(f.pesoMax) <= Number(f.pesoMin)) {
    erro.value = 'Peso máximo deve ser maior que o mínimo.'
    return
  }
  if (Number(f.pesoMedio) < Number(f.pesoMin) || Number(f.pesoMedio) > Number(f.pesoMax)) {
    erro.value = 'Peso médio deve estar dentro da faixa.'
    return
  }
  if (!f.cabCaminhao || Number(f.cabCaminhao) <= 0) {
    erro.value = 'Informe quantas cabeças cabem por caminhão.'
    return
  }
  if (f.ordem === null || f.ordem === '') {
    erro.value = 'Informe a ordem.'
    return
  }

  salvando.value = true
  try {
    await categoriasApi.criar({
      nome: f.nome.trim(),
      pesoMin: Number(f.pesoMin),
      pesoMax: Number(f.pesoMax),
      pesoMedio: Number(f.pesoMedio),
      cabCaminhao: Number(f.cabCaminhao),
      ordem: Number(f.ordem),
      agioPadrao: Number(f.agioPadrao) || 0
    })
    criando.value = false
    mensagem.value = 'Categoria criada com sucesso!'
    setTimeout(() => mensagem.value = '', 3000)
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao criar categoria.'
  } finally {
    salvando.value = false
  }
}

async function excluir(cat) {
  if (!confirm(`Excluir a categoria "${cat.nome} (${cat.pesoMin}–${cat.pesoMax} kg)"?\n\nEsta ação não pode ser desfeita. Os ágios associados a esta categoria em todas as cotações regionais também serão removidos.`)) {
    return
  }

  erro.value = ''
  mensagem.value = ''
  try {
    await categoriasApi.excluir(cat.id)
    mensagem.value = 'Categoria excluída.'
    setTimeout(() => mensagem.value = '', 3000)
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao excluir categoria.'
  }
}

onMounted(carregar)
</script>

<template>
  <div>
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4 class="fw-bold mb-0">Categorias e Faixas de Peso</h4>
      <button class="btn btn-primary" @click="abrirFormNova" :disabled="criando">
        <i class="bi bi-plus-lg me-1"></i> Nova Categoria
      </button>
    </div>

    <div v-if="mensagem" class="alert alert-success py-2 small">{{ mensagem }}</div>
    <div v-if="erro" class="alert alert-danger py-2 small">{{ erro }}</div>

    <!-- Form de criação -->
    <div v-if="criando" class="card mb-3 border-primary">
      <div class="card-header bg-primary text-white fw-semibold">
        <i class="bi bi-plus-circle me-1"></i> Nova Categoria
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Nome</label>
            <input v-model="formNova.nome" type="text" class="form-control form-control-sm" placeholder="Bezerro / Garrote / Boi" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Peso Mín. (kg)</label>
            <input v-model.number="formNova.pesoMin" type="number" step="0.1" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Peso Máx. (kg)</label>
            <input v-model.number="formNova.pesoMax" type="number" step="0.1" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Peso Médio (kg)</label>
            <input v-model.number="formNova.pesoMedio" type="number" step="0.1" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <label class="form-label small fw-semibold">Cab./Caminhão</label>
            <input v-model.number="formNova.cabCaminhao" type="number" min="1" class="form-control form-control-sm" />
          </div>
          <div class="col-md-1">
            <label class="form-label small fw-semibold">Ordem</label>
            <input v-model.number="formNova.ordem" type="number" min="1" class="form-control form-control-sm" />
          </div>
        </div>
        <div class="row g-3 mt-1">
          <div class="col-md-3">
            <label class="form-label small fw-semibold">Ágio padrão (%)</label>
            <input v-model.number="formNova.agioPadrao" type="number" step="0.01" min="0" class="form-control form-control-sm" />
            <small class="text-muted">Será aplicado em todas as cotações regionais existentes para esta categoria.</small>
          </div>
        </div>
        <div class="d-flex justify-content-end gap-2 mt-3">
          <button class="btn btn-outline-secondary btn-sm" @click="cancelarNova" :disabled="salvando">
            Cancelar
          </button>
          <button class="btn btn-success btn-sm" @click="salvarNova" :disabled="salvando">
            <span v-if="salvando" class="spinner-border spinner-border-sm me-1"></span>
            <i v-else class="bi bi-check-lg me-1"></i>
            Criar
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header bg-white">
        <small class="text-muted">A tabela de categorias define as faixas de peso, peso médio e capacidade por caminhão utilizados nos cálculos.</small>
      </div>
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <table v-else class="table align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Categoria</th>
              <th>Peso Mín. (kg)</th>
              <th>Peso Máx. (kg)</th>
              <th>Peso Médio (kg)</th>
              <th>Cab./Caminhão</th>
              <th>Ordem</th>
              <th class="text-end">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categorias" :key="cat.id">
              <td><input v-model="cat.nome" type="text" class="form-control form-control-sm" style="width:130px" /></td>
              <td><input v-model.number="cat.pesoMin" type="number" step="0.1" class="form-control form-control-sm" style="width:90px" /></td>
              <td><input v-model.number="cat.pesoMax" type="number" step="0.1" class="form-control form-control-sm" style="width:90px" /></td>
              <td><input v-model.number="cat.pesoMedio" type="number" step="0.1" class="form-control form-control-sm" style="width:90px" /></td>
              <td><input v-model.number="cat.cabCaminhao" type="number" min="1" class="form-control form-control-sm" style="width:80px" /></td>
              <td><input v-model.number="cat.ordem" type="number" min="1" class="form-control form-control-sm" style="width:70px" /></td>
              <td class="text-end">
                <button class="btn btn-sm btn-primary me-1" @click="salvar(cat)" :disabled="salvando" title="Salvar alterações">
                  <i class="bi bi-check-lg"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" @click="excluir(cat)" title="Excluir categoria">
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
