<script setup>
import { ref, onMounted } from 'vue'
import { configComissaoApi } from '../../services/api'

const config = ref({ percentual: 1.0, ativo: true })
const carregando = ref(false)
const salvando = ref(false)
const mensagem = ref('')

async function carregar() {
  carregando.value = true
  try {
    const res = await configComissaoApi.obter()
    if (res.data) config.value = { percentual: res.data.percentual, ativo: res.data.ativo }
  } finally { carregando.value = false }
}

async function salvar() {
  salvando.value = true
  mensagem.value = ''
  try {
    await configComissaoApi.salvar(config.value)
    mensagem.value = 'Configuração salva com sucesso!'
    setTimeout(() => mensagem.value = '', 3000)
  } catch { mensagem.value = 'Erro ao salvar.' }
  finally { salvando.value = false }
}

onMounted(carregar)
</script>

<template>
  <div>
    <h4 class="fw-bold mb-4">Comissão e Arredondamento</h4>

    <div v-if="carregando" class="text-center py-5"><div class="spinner-border text-primary"></div></div>

    <div v-else class="card" style="max-width: 500px">
      <div class="card-body">
        <div v-if="mensagem" class="alert alert-success py-2 small mb-3">{{ mensagem }}</div>

        <div class="mb-4">
          <h6 class="fw-semibold">Comissão do Corretor</h6>
          <div class="d-flex align-items-center gap-3 mb-2">
            <div class="form-check form-switch">
              <input v-model="config.ativo" class="form-check-input" type="checkbox" id="comissaoAtivo" role="switch" />
              <label class="form-check-label" for="comissaoAtivo">
                {{ config.ativo ? 'Comissão ativada' : 'Comissão desativada' }}
              </label>
            </div>
          </div>
          <div class="input-group" style="max-width: 200px">
            <span class="input-group-text">%</span>
            <input v-model.number="config.percentual" type="number" step="0.01" min="0" max="100"
                   class="form-control" :disabled="!config.ativo" />
          </div>
          <small class="text-muted d-block mt-1">Percentual calculado sobre o valor na compra (R$/kg negociado).</small>
        </div>

        <div class="mb-4 p-3 bg-light rounded">
          <h6 class="fw-semibold">Regra de Arredondamento</h6>
          <p class="mb-0 text-muted small">
            Sempre arredonda para <strong>baixo</strong> com <strong>1 casa decimal</strong>.<br/>
            Exemplo: R$ 10,97/kg → R$ 10,90/kg
          </p>
        </div>

        <button class="btn btn-primary" @click="salvar" :disabled="salvando">
          <span v-if="salvando" class="spinner-border spinner-border-sm me-2"></span>
          Salvar Configuração
        </button>
      </div>
    </div>
  </div>
</template>
