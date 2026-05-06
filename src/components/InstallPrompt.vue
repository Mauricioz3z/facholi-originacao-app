<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const deferredPrompt = ref(null)
const showButton = ref(false)
const isIos = ref(false)
const showIosHint = ref(false)

const DISMISS_KEY = 'pwa-install-dismissed-at'
const DISMISS_DAYS = 7

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
}

function wasRecentlyDismissed() {
  const ts = localStorage.getItem(DISMISS_KEY)
  if (!ts) return false
  const days = (Date.now() - Number(ts)) / (1000 * 60 * 60 * 24)
  return days < DISMISS_DAYS
}

function handleBeforeInstall(e) {
  e.preventDefault()
  deferredPrompt.value = e
  if (!wasRecentlyDismissed()) {
    showButton.value = true
  }
}

function handleInstalled() {
  showButton.value = false
  deferredPrompt.value = null
}

async function install() {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const choice = await deferredPrompt.value.userChoice
  if (choice.outcome === 'accepted') {
    showButton.value = false
  }
  deferredPrompt.value = null
}

function dismiss() {
  showButton.value = false
  showIosHint.value = false
  localStorage.setItem(DISMISS_KEY, String(Date.now()))
}

onMounted(() => {
  if (isStandalone()) return

  const ua = window.navigator.userAgent
  isIos.value = /iPad|iPhone|iPod/.test(ua) && !window.MSStream

  if (isIos.value && !wasRecentlyDismissed()) {
    showIosHint.value = true
  }

  window.addEventListener('beforeinstallprompt', handleBeforeInstall)
  window.addEventListener('appinstalled', handleInstalled)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  window.removeEventListener('appinstalled', handleInstalled)
})
</script>

<template>
  <div v-if="showButton" class="install-banner">
    <div class="install-content">
      <strong>Instalar PrecoBoi</strong>
      <small>Acesso rápido direto da tela inicial</small>
    </div>
    <div class="install-actions">
      <button type="button" class="btn-install" @click="install">
        <i class="bi bi-download"></i> Instalar
      </button>
      <button type="button" class="btn-dismiss" @click="dismiss" aria-label="Fechar">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  </div>

  <div v-else-if="showIosHint" class="install-banner">
    <div class="install-content">
      <strong>Adicionar à tela de início</strong>
      <small>Toque em <i class="bi bi-box-arrow-up"></i> e depois em "Adicionar à Tela de Início"</small>
    </div>
    <button type="button" class="btn-dismiss" @click="dismiss" aria-label="Fechar">
      <i class="bi bi-x-lg"></i>
    </button>
  </div>
</template>

<style scoped>
.install-banner {
  position: fixed;
  bottom: 16px;
  left: 16px;
  right: 16px;
  max-width: 420px;
  margin: 0 auto;
  background: #1a5f2a;
  color: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 9999;
  animation: slide-up 0.25s ease-out;
}

@keyframes slide-up {
  from { transform: translateY(120%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.install-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.install-content strong {
  font-size: 0.95rem;
}

.install-content small {
  font-size: 0.8rem;
  opacity: 0.9;
}

.install-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}

.btn-install {
  background: #fff;
  color: #1a5f2a;
  border: none;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-install:hover {
  background: #f0f0f0;
}

.btn-dismiss {
  background: transparent;
  color: #fff;
  border: none;
  padding: 6px 8px;
  cursor: pointer;
  opacity: 0.85;
  font-size: 0.9rem;
}

.btn-dismiss:hover {
  opacity: 1;
}
</style>
