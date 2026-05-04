<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { negociacaoApi } from '../../services/api'

const route = useRoute()
const router = useRouter()
const neg = ref(null)
const carregando = ref(false)
const salvandoEntrega = ref(false)
const fechando = ref(false)
const erro = ref('')
const entregaItens = ref([])
const confirmandoFechamento = ref(false)

async function carregar() {
  carregando.value = true
  erro.value = ''
  try {
    const res = await negociacaoApi.obter(route.params.id)
    neg.value = res.data
    entregaItens.value = res.data.itens.map(i => ({
      itemId: i.id,
      qtdEntregue: i.qtdEntregue || 0
    }))
  } finally {
    carregando.value = false
  }
}

async function fechar() {
  fechando.value = true
  confirmandoFechamento.value = false
  try {
    await negociacaoApi.fechar(route.params.id)
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao fechar negociação.'
  } finally {
    fechando.value = false
  }
}

async function salvarEntrega() {
  salvandoEntrega.value = true
  erro.value = ''
  try {
    await negociacaoApi.atualizarEntrega({
      negociacaoId: Number(route.params.id),
      itens: entregaItens.value
    })
    await carregar()
  } catch (e) {
    erro.value = e.response?.data?.mensagem || 'Erro ao salvar entrega.'
  } finally {
    salvandoEntrega.value = false
  }
}

function entregaItem(itemId) {
  return entregaItens.value.find(e => e.itemId === itemId)
}

function fmtData(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function fmtKg(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(4).replace('.', ',')}/kg`
}

function fmtKg2(v) {
  if (!v && v !== 0) return '—'
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}/kg`
}

const percentualTotal = computed(() => {
  if (!neg.value?.itens) return 0
  const qtdNeg = neg.value.itens.reduce((s, i) => s + (i.qtdNegociada || 0), 0)
  const qtdEnt = neg.value.itens.reduce((s, i) => s + (i.qtdEntregue || 0), 0)
  if (qtdNeg === 0) return 0
  return Math.round(qtdEnt / qtdNeg * 100)
})

onMounted(carregar)
</script>

<template>
  <div>
    <div v-if="carregando" class="text-center py-5">
      <div class="spinner-border" style="color:var(--pwa-verde)"></div>
    </div>

    <div v-else-if="neg">
      <!-- Cabeçalho -->
      <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.2rem">
        <button
          class="pwa-btn pwa-btn-outline pwa-btn-icon"
          @click="router.push('/app/negociacoes')"
        >
          <i class="bi bi-arrow-left"></i>
        </button>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.82rem;font-weight:700;color:var(--pwa-verde);letter-spacing:0.05em">
            {{ neg.numero }}
          </div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--pwa-texto);line-height:1.2">
            {{ neg.municipioOrigemNome }}-{{ neg.municipioOrigemUf }}
          </div>
        </div>
        <span
          class="pwa-badge"
          :class="neg.status === 'Fechado' ? 'pwa-badge-laranja' : 'pwa-badge-verde'"
        >
          {{ neg.status === 'Fechado' ? 'Fechado' : 'Em Andamento' }}
        </span>
      </div>

      <!-- Informações gerais -->
      <div class="pwa-card">
        <div class="pwa-card-header">
          <i class="bi bi-info-circle-fill me-2"></i>Informações
        </div>
        <div class="pwa-card-body" style="padding:0">
          <div class="pwa-info-row" style="padding:0.75rem 1rem">
            <span class="pwa-info-label">Corretor</span>
            <span class="pwa-info-value">{{ neg.corretorNome }}</span>
          </div>
          <div class="pwa-info-row" style="padding:0.75rem 1rem">
            <span class="pwa-info-label">Destino</span>
            <span class="pwa-info-value">{{ neg.municipioDestinoNome }}</span>
          </div>
          <div class="pwa-info-row" style="padding:0.75rem 1rem">
            <span class="pwa-info-label">Entrega Prevista</span>
            <span class="pwa-info-value">{{ fmtData(neg.dataPrevistaEntrega) }}</span>
          </div>
          <div class="pwa-info-row" style="padding:0.75rem 1rem">
            <span class="pwa-info-label">Criado em</span>
            <span class="pwa-info-value">{{ fmtData(neg.criadoEm) }}</span>
          </div>
        </div>
      </div>

      <!-- Categorias negociadas -->
      <div class="pwa-section-title">Categorias Negociadas</div>

      <div v-for="item in neg.itens" :key="item.id" class="pwa-sim-row">
        <div class="pwa-sim-categoria">{{ item.categoriaNome }}</div>
        <div class="pwa-sim-faixa">
          {{ item.pesoMin }}–{{ item.pesoMax }} kg &nbsp;·&nbsp;
          {{ item.qtdNegociada || 0 }} cabeças
        </div>
        <div class="pwa-sim-valores">
          <div class="pwa-sim-campo">
            <div class="pwa-sim-campo-label">R$/kg Praça</div>
            <div class="pwa-sim-campo-valor praca">{{ fmtKg2(item.precoNegociado) }}</div>
          </div>
          <div class="pwa-sim-campo">
            <div class="pwa-sim-campo-label">R$/kg Colocado</div>
            <div class="pwa-sim-campo-valor colocado">{{ fmtKg(item.precoColocado) }}</div>
          </div>
        </div>
      </div>

      <!-- Controle de entrega (só para fechadas) -->
      <template v-if="neg.status === 'Fechado'">
        <div class="pwa-section-title">Controle de Entrega</div>

        <div class="pwa-card" style="margin-bottom:1rem">
          <div class="pwa-card-body">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.6rem">
              <span style="font-size:0.95rem;font-weight:700">Conclusão Total</span>
              <span style="font-size:1.3rem;font-weight:800;color:var(--pwa-verde)">{{ percentualTotal }}%</span>
            </div>
            <div class="pwa-progress-wrap">
              <div class="pwa-progress-bar" :style="{ width: percentualTotal + '%' }"></div>
            </div>
          </div>
        </div>

        <div v-for="item in neg.itens" :key="item.id + '_e'" class="pwa-sim-row" style="margin-bottom:0.75rem">
          <div class="pwa-sim-categoria">{{ item.categoriaNome }}</div>
          <div class="pwa-sim-faixa">Negociadas: {{ item.qtdNegociada || 0 }} cabeças</div>
          <div style="margin:0.6rem 0 0.5rem">
            <label class="pwa-label">Qtd. Entregue</label>
            <input
              v-if="entregaItem(item.id)"
              v-model.number="entregaItem(item.id).qtdEntregue"
              type="number"
              min="0"
              :max="item.qtdNegociada"
              inputmode="numeric"
              class="pwa-num-input"
            />
          </div>
          <div class="pwa-progress-wrap">
            <div class="pwa-progress-bar" :style="{ width: (item.percentualConclusao || 0) + '%' }"></div>
          </div>
          <div style="font-size:0.8rem;color:var(--pwa-texto-suave);margin-top:3px">
            {{ item.percentualConclusao || 0 }}% entregue
          </div>
        </div>

        <div
          v-if="erro"
          style="color:#c0392b;padding:0.75rem 1rem;background:#fdecea;border-radius:10px;margin-bottom:1rem;font-size:0.9rem"
        >
          <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ erro }}
        </div>

        <button
          class="pwa-btn pwa-btn-primary"
          @click="salvarEntrega"
          :disabled="salvandoEntrega"
        >
          <span v-if="salvandoEntrega" class="spinner-border spinner-border-sm"></span>
          <i v-else class="bi bi-check-circle-fill"></i>
          Salvar Entrega
        </button>
      </template>

      <!-- Fechar negociação (só para em andamento) -->
      <template v-if="neg.status === 'EmNegociacao'">
        <div
          v-if="erro"
          style="color:#c0392b;padding:0.75rem 1rem;background:#fdecea;border-radius:10px;margin-bottom:1rem;font-size:0.9rem"
        >
          <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ erro }}
        </div>

        <div v-if="!confirmandoFechamento" style="margin-top:0.5rem">
          <button class="pwa-btn pwa-btn-laranja" @click="confirmandoFechamento = true">
            <i class="bi bi-lock-fill"></i>
            Fechar Negociação
          </button>
        </div>

        <div v-else class="pwa-card" style="margin-top:0.5rem">
          <div class="pwa-card-body">
            <p style="font-size:1.05rem;font-weight:700;margin-bottom:0.75rem;text-align:center">
              Confirmar fechamento?
            </p>
            <p style="font-size:0.9rem;color:var(--pwa-texto-suave);text-align:center;margin-bottom:1.5rem">
              Os valores serão congelados e não poderão ser alterados.
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
              <button
                class="pwa-btn pwa-btn-outline"
                @click="confirmandoFechamento = false"
              >Cancelar</button>
              <button
                class="pwa-btn pwa-btn-danger"
                @click="fechar"
                :disabled="fechando"
              >
                <span v-if="fechando" class="spinner-border spinner-border-sm"></span>
                <span v-else>Confirmar</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
