<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  opcoes: { type: Array, default: () => [] },
  idField: { type: String, default: 'id' },
  labelField: { type: [String, Function], default: 'nome' },
  groupField: { type: String, default: null },
  placeholder: { type: String, default: 'Selecione...' },
  titulo: { type: String, default: 'Selecione' },
  permitirLimpar: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

const aberto = ref(false)
const termo = ref('')
const inputBusca = ref(null)

const itemAtual = computed(() =>
  props.opcoes.find(o => o[props.idField] === props.modelValue) || null
)

function getLabel(item) {
  if (!item) return ''
  if (typeof props.labelField === 'function') return props.labelField(item)
  return item[props.labelField]
}

const grupos = computed(() => {
  const t = (termo.value || '').toLowerCase().trim()
  const filtradas = !t
    ? props.opcoes
    : props.opcoes.filter(o => {
        const label = getLabel(o).toLowerCase()
        const grupo = props.groupField
          ? String(o[props.groupField] || '').toLowerCase()
          : ''
        return label.includes(t) || grupo.includes(t)
      })

  if (!props.groupField) return [{ titulo: '', itens: filtradas }]

  const map = {}
  for (const item of filtradas) {
    const key = item[props.groupField] || '—'
    if (!map[key]) map[key] = []
    map[key].push(item)
  }
  return Object.keys(map).sort().map(k => ({ titulo: k, itens: map[k] }))
})

const totalResultados = computed(() =>
  grupos.value.reduce((s, g) => s + g.itens.length, 0)
)

async function abrir() {
  if (props.disabled) return
  termo.value = ''
  aberto.value = true
  await nextTick()
  if (inputBusca.value) inputBusca.value.focus()
}

function fechar() {
  aberto.value = false
}

function selecionar(item) {
  emit('update:modelValue', item[props.idField])
  emit('change', item)
  fechar()
}

function limpar() {
  emit('update:modelValue', null)
  emit('change', null)
  fechar()
}
</script>

<template>
  <div>
    <div
      role="button"
      tabindex="0"
      class="pwa-select-busca-trigger"
      :class="{ 'is-empty': !itemAtual, 'is-disabled': disabled }"
      @click="abrir"
      @keydown.enter.prevent="abrir"
      @keydown.space.prevent="abrir"
    >
      <span v-if="itemAtual" class="texto">{{ getLabel(itemAtual) }}</span>
      <span v-else class="placeholder">{{ placeholder }}</span>
      <i class="bi bi-chevron-down chevron"></i>
    </div>

    <Teleport to="body">
      <div v-if="aberto" class="pwa-select-busca-overlay" @click.self="fechar">
        <div class="pwa-select-busca-sheet">
          <div class="pwa-select-busca-grip"></div>

          <div class="pwa-select-busca-header">
            <button type="button" class="pwa-select-busca-btn" @click="fechar">
              <i class="bi bi-x-lg"></i>
            </button>
            <strong>{{ titulo }}</strong>
            <button
              v-if="permitirLimpar && itemAtual"
              type="button"
              class="pwa-select-busca-btn pwa-select-busca-btn-clear"
              @click="limpar"
            >Limpar</button>
            <span v-else class="pwa-select-busca-btn-spacer"></span>
          </div>

          <div class="pwa-select-busca-search">
            <i class="bi bi-search"></i>
            <input
              ref="inputBusca"
              v-model="termo"
              type="text"
              placeholder="Buscar..."
              autocomplete="off"
              spellcheck="false"
            />
            <button
              v-if="termo"
              type="button"
              class="pwa-select-busca-clear-text"
              @click="termo = ''"
              aria-label="Limpar busca"
            >
              <i class="bi bi-x-circle-fill"></i>
            </button>
          </div>

          <div class="pwa-select-busca-list">
            <template v-for="grupo in grupos" :key="grupo.titulo || 'sem-grupo'">
              <div
                v-if="groupField && grupo.titulo"
                class="pwa-select-busca-grupo"
              >{{ grupo.titulo }}</div>
              <button
                v-for="item in grupo.itens"
                :key="item[idField]"
                type="button"
                class="pwa-select-busca-item"
                :class="{ ativo: item[idField] === modelValue }"
                @click="selecionar(item)"
              >
                <span>{{ getLabel(item) }}</span>
                <i v-if="item[idField] === modelValue" class="bi bi-check2"></i>
              </button>
            </template>
            <div
              v-if="totalResultados === 0"
              class="pwa-select-busca-vazio"
            >
              <i class="bi bi-search" style="font-size:1.6rem;display:block;margin-bottom:6px;opacity:0.6"></i>
              Nenhum resultado para "{{ termo }}".
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.pwa-select-busca-trigger {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  background-color: #ffffff !important;
  background-image: none !important;
  border: 1.5px solid var(--pwa-borda);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--pwa-texto);
  -webkit-tap-highlight-color: transparent;
  box-shadow: none;
  line-height: 1.2;
  position: relative;
  box-sizing: border-box;
  user-select: none;
}
.pwa-select-busca-trigger:focus-visible { outline: 2px solid var(--pwa-verde); outline-offset: 2px; }
.pwa-select-busca-trigger .placeholder,
.pwa-select-busca-trigger .texto {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: transparent !important;
}
.pwa-select-busca-trigger .placeholder {
  color: #8a8f98 !important;
  font-weight: 400;
}
.pwa-select-busca-trigger .texto {
  font-weight: 600;
  color: var(--pwa-texto) !important;
}
.pwa-select-busca-trigger .chevron {
  color: var(--pwa-texto-suave);
  flex-shrink: 0;
  font-size: 0.9rem;
}
.pwa-select-busca-trigger.is-disabled { opacity: 0.6; cursor: not-allowed; }

.pwa-select-busca-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: pwasb-fade 0.18s ease;
}
@keyframes pwasb-fade { from { opacity: 0 } to { opacity: 1 } }

.pwa-select-busca-sheet {
  width: 100%;
  max-width: 560px;
  background: white;
  border-radius: 16px 16px 0 0;
  height: 85vh;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: pwasb-up 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 -8px 24px rgba(0,0,0,0.15);
}
@keyframes pwasb-up { from { transform: translateY(100%) } to { transform: translateY(0) } }

.pwa-select-busca-grip {
  width: 38px;
  height: 4px;
  border-radius: 2px;
  background: #d8d8d8;
  margin: 8px auto 4px;
  flex-shrink: 0;
}

.pwa-select-busca-header {
  display: flex;
  align-items: center;
  padding: 6px 8px 10px;
  border-bottom: 1px solid var(--pwa-borda);
}
.pwa-select-busca-header strong {
  flex: 1;
  text-align: center;
  font-size: 0.98rem;
  color: var(--pwa-texto);
}
.pwa-select-busca-btn {
  background: none;
  border: none;
  padding: 8px 12px;
  min-height: 40px;
  font-size: 0.88rem;
  color: var(--pwa-verde);
  font-weight: 600;
  cursor: pointer;
}
.pwa-select-busca-btn-spacer { width: 64px; }
.pwa-select-busca-btn-clear { color: #c0392b; }

.pwa-select-busca-search {
  position: relative;
  padding: 10px 14px;
  border-bottom: 1px solid var(--pwa-borda);
  flex-shrink: 0;
}
.pwa-select-busca-search > i.bi-search {
  position: absolute;
  left: 26px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--pwa-texto-suave);
  pointer-events: none;
}
.pwa-select-busca-search input {
  width: 100%;
  min-height: 44px;
  padding: 0 36px 0 38px;
  background: #f5f7f5;
  border: 1px solid var(--pwa-borda);
  border-radius: 10px;
  font-size: 0.95rem;
  color: var(--pwa-texto);
}
.pwa-select-busca-search input:focus {
  outline: none;
  border-color: var(--pwa-verde);
  background: white;
}
.pwa-select-busca-clear-text {
  position: absolute;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--pwa-texto-suave);
  cursor: pointer;
  padding: 4px;
  font-size: 1.1rem;
}

.pwa-select-busca-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.pwa-select-busca-grupo {
  position: sticky;
  top: 0;
  background: #f7faf7;
  padding: 6px 16px;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pwa-texto-suave);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--pwa-borda);
  z-index: 1;
}

.pwa-select-busca-item {
  width: 100%;
  padding: 14px 18px;
  background: white;
  border: none;
  border-bottom: 1px solid #f0f3f0;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  color: var(--pwa-texto);
  cursor: pointer;
  min-height: 48px;
}
.pwa-select-busca-item.ativo {
  background: rgba(46,160,67,0.08);
  color: var(--pwa-verde);
  font-weight: 700;
}
.pwa-select-busca-item:active { background: #f0f3f0; }

.pwa-select-busca-vazio {
  padding: 36px 16px;
  text-align: center;
  color: var(--pwa-texto-suave);
  font-size: 0.92rem;
}
</style>
