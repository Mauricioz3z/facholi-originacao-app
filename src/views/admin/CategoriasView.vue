<script setup>
import { ref, onMounted } from 'vue'
import { categoriasApi } from '../../services/api'

const categorias = ref([])
const carregando = ref(false)
const salvando = ref(false)
const mensagem = ref('')

async function carregar() {
  carregando.value = true
  try { const res = await categoriasApi.listar(); categorias.value = JSON.parse(JSON.stringify(res.data)) }
  finally { carregando.value = false }
}

async function salvar(cat) {
  salvando.value = true
  mensagem.value = ''
  try {
    await categoriasApi.atualizar(cat.id, cat)
    mensagem.value = 'Categoria atualizada com sucesso!'
    setTimeout(() => mensagem.value = '', 3000)
  } catch { mensagem.value = 'Erro ao salvar.' }
  finally { salvando.value = false }
}

onMounted(carregar)
</script>

<template>
  <div>
    <h4 class="fw-bold mb-4">Categorias e Faixas de Peso</h4>

    <div v-if="mensagem" class="alert alert-success py-2 small">{{ mensagem }}</div>

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
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categorias" :key="cat.id">
              <td class="fw-semibold">{{ cat.nome }}</td>
              <td><input v-model.number="cat.pesoMin" type="number" step="0.1" class="form-control form-control-sm" style="width:90px" /></td>
              <td><input v-model.number="cat.pesoMax" type="number" step="0.1" class="form-control form-control-sm" style="width:90px" /></td>
              <td><input v-model.number="cat.pesoMedio" type="number" step="0.1" class="form-control form-control-sm" style="width:90px" /></td>
              <td><input v-model.number="cat.cabCaminhao" type="number" min="1" class="form-control form-control-sm" style="width:80px" /></td>
              <td>
                <button class="btn btn-sm btn-primary" @click="salvar(cat)" :disabled="salvando">Salvar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
