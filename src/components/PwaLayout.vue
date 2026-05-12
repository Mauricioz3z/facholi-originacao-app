<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAppVersion } from '../composables/useAppVersion'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { versao, verificando, mensagem, verificarAtualizacao } = useAppVersion()
const infoAberto = ref(false)
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
      <button class="pwa-topbar-btn" @click="infoAberto = true" title="Sobre / Atualizar">
        <i class="bi bi-info-circle"></i>
      </button>
      <button class="pwa-topbar-btn" @click="logout" title="Sair">
        <i class="bi bi-box-arrow-right"></i>
      </button>
    </header>

    <!-- Popover de versão e atualização -->
    <Teleport to="body">
      <div
        v-if="infoAberto"
        @click.self="infoAberto = false"
        style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:flex-end;justify-content:center"
      >
        <div style="width:100%;max-width:560px;background:white;border-radius:16px 16px 0 0;padding:1.25rem 1.25rem calc(1.25rem + env(safe-area-inset-bottom, 0));box-shadow:0 -8px 24px rgba(0,0,0,0.15)">
          <div style="width:38px;height:4px;border-radius:2px;background:#d8d8d8;margin:-0.5rem auto 0.75rem"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem">
            <strong style="font-size:1rem;color:var(--pwa-texto)">Sobre o aplicativo</strong>
            <button
              type="button"
              @click="infoAberto = false"
              style="background:none;border:none;color:var(--pwa-texto-suave);padding:4px 8px;font-size:1.1rem;cursor:pointer"
              aria-label="Fechar"
            ><i class="bi bi-x-lg"></i></button>
          </div>

          <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--pwa-fundo, #f5f7f5);border-radius:10px;margin-bottom:1rem">
            <i class="bi bi-tag-fill" style="color:var(--pwa-verde);font-size:1.1rem"></i>
            <div style="flex:1">
              <div style="font-size:0.7rem;color:var(--pwa-texto-suave);text-transform:uppercase;letter-spacing:0.04em;font-weight:700">Versão</div>
              <div style="font-family:ui-monospace,monospace;font-size:0.95rem;color:var(--pwa-texto);font-weight:700">v.{{ versao }}</div>
            </div>
          </div>

          <button
            type="button"
            class="pwa-btn pwa-btn-primary"
            :disabled="verificando"
            @click="verificarAtualizacao"
            style="margin-bottom:0.5rem"
          >
            <i :class="verificando ? 'bi bi-arrow-clockwise spin me-2' : 'bi bi-arrow-clockwise me-2'"></i>
            {{ verificando ? 'Verificando...' : 'Verificar atualização' }}
          </button>

          <div
            v-if="mensagem"
            style="margin-top:0.5rem;padding:0.65rem 0.85rem;background:rgba(46,160,67,0.1);border:1px solid rgba(46,160,67,0.3);border-radius:8px;font-size:0.85rem;color:var(--pwa-texto)"
          >
            <i class="bi bi-info-circle-fill me-1" style="color:var(--pwa-verde)"></i>
            {{ mensagem }}
          </div>

          <div style="text-align:center;font-size:0.72rem;color:var(--pwa-texto-suave);margin-top:1rem">
            Facholi — Originação de Gado
          </div>
        </div>
      </div>
    </Teleport>

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
