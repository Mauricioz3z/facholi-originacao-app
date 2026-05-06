<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const titulo = computed(() => route.meta?.title || 'Originação de Gado')

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="pwa-root">
    <header class="pwa-topbar">
      <img src="/logo-facholi.png" alt="Facholi" />
      <span class="pwa-topbar-title">{{ titulo }}</span>
      <button class="pwa-topbar-btn" @click="logout" title="Sair">
        <i class="bi bi-box-arrow-right"></i>
      </button>
    </header>

    <main class="pwa-content">
      <router-view />
    </main>

    <nav class="pwa-bottom-nav">
      <router-link
        to="/app/dashboard"
        class="pwa-nav-item"
        :class="{ active: route.path === '/app/dashboard' }"
      >
        <i class="bi bi-grid-fill"></i>
        <span>Dashboard</span>
      </router-link>
      <router-link
        to="/app/simulacao"
        class="pwa-nav-item"
        :class="{ active: route.path === '/app/simulacao' }"
      >
        <i class="bi bi-calculator-fill"></i>
        <span>Simulação</span>
      </router-link>
      <router-link
        to="/app/negociacoes"
        class="pwa-nav-item"
        :class="{ active: route.path.startsWith('/app/negociacoes') }"
      >
        <i class="bi bi-clipboard-check-fill"></i>
        <span>Negociações</span>
      </router-link>
    </nav>
  </div>
</template>
