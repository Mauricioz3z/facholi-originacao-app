<script setup>
import { ref, onMounted } from 'vue'
import { icmsApi } from '../../services/api'

const icms = ref([])
const carregando = ref(false)
const salvando = ref(false)
const mensagem = ref('')

function calcEfetivo(item) {
  item.icmsEfetivo = (item.aliquota / 100) * (1 - item.recuperacao / 100)
}

async function carregar() {
  carregando.value = true
  try { const res = await icmsApi.listar(); icms.value = JSON.parse(JSON.stringify(res.data)) }
  finally { carregando.value = false }
}

async function salvar(item) {
  salvando.value = true
  mensagem.value = ''
  try {
    await icmsApi.atualizar(item.uf, { uf: item.uf, aliquota: item.aliquota, recuperacao: item.recuperacao })
    mensagem.value = `ICMS ${item.uf} atualizado!`
    setTimeout(() => mensagem.value = '', 3000)
    calcEfetivo(item)
  } catch { mensagem.value = 'Erro ao salvar.' }
  finally { salvando.value = false }
}

onMounted(carregar)
</script>

<template>
  <div>
    <h4 class="fw-bold mb-2">Tabela de ICMS por UF</h4>
    <p class="text-muted small mb-4">ICMS Efetivo = Alíquota × (1 − Recuperação). Dentro de SP = 0%. RS e SC: 7%, recuperação 70%.</p>

    <div v-if="mensagem" class="alert alert-success py-2 small">{{ mensagem }}</div>

    <div class="card">
      <div class="card-body p-0">
        <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>
        <div v-else class="table-responsive">
          <table class="table align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>UF</th>
                <th class="text-end">Alíquota (%)</th>
                <th class="text-end">Recuperação (%)</th>
                <th class="text-end">ICMS Efetivo (%)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in icms" :key="item.uf">
                <td class="fw-semibold"><span class="badge bg-light text-dark border">{{ item.uf }}</span></td>
                <td class="text-end">
                  <input v-model.number="item.aliquota" type="number" step="0.01" min="0" max="100"
                         class="form-control form-control-sm text-end d-inline-block"
                         style="width:80px" @input="calcEfetivo(item)" />
                </td>
                <td class="text-end">
                  <input v-model.number="item.recuperacao" type="number" step="0.01" min="0" max="100"
                         class="form-control form-control-sm text-end d-inline-block"
                         style="width:80px" @input="calcEfetivo(item)" />
                </td>
                <td class="text-end fw-semibold">
                  {{ (item.icmsEfetivo * 100).toFixed(4).replace('.', ',') }}%
                </td>
                <td>
                  <button class="btn btn-sm btn-primary" @click="salvar(item)" :disabled="salvando">Salvar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
