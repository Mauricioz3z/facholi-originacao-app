<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

function logout() {
  auth.logout()
  router.push('/login')
}

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <div class="d-flex">
    <!-- Sidebar -->
    <nav class="sidebar d-flex flex-column">

      <!-- Brand -->
      <div class="sidebar-brand">
        <img src="/logo-facholi.png" alt="Facholi" class="d-block" />
        <div class="sidebar-system-label mt-1">Originação de Gado</div>
      </div>

      <!-- Menu -->
      <ul class="nav flex-column flex-grow-1 px-1 mt-2 pb-1">

        <!-- Principal -->
        <li class="nav-item">
          <router-link to="/dashboard" class="nav-link" :class="{ active: isActive('/dashboard') }">
            <i class="bi bi-grid-fill"></i>
            <span>Dashboard</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/simulacao" class="nav-link" :class="{ active: isActive('/simulacao') }">
            <i class="bi bi-calculator-fill"></i>
            <span>Simulação Rápida</span>
          </router-link>
        </li>
        <li class="nav-item">
          <router-link to="/negociacoes" class="nav-link" :class="{ active: isActive('/negociacoes') }">
            <i class="bi bi-briefcase-fill"></i>
            <span>Negociações</span>
          </router-link>
        </li>

        <!-- Admin -->
        <template v-if="auth.isAdmin">
          <div class="sidebar-section">Administração</div>

          <li class="nav-item">
            <router-link to="/admin/usuarios" class="nav-link" :class="{ active: isActive('/admin/usuarios') }">
              <i class="bi bi-people-fill"></i>
              <span>Compradores</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/admin/corretores" class="nav-link" :class="{ active: isActive('/admin/corretores') }">
              <i class="bi bi-person-badge-fill"></i>
              <span>Corretores</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/admin/municipios-origem" class="nav-link" :class="{ active: isActive('/admin/municipios-origem') }">
              <i class="bi bi-geo-alt-fill"></i>
              <span>Municípios Origem</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/admin/municipios-destino" class="nav-link" :class="{ active: isActive('/admin/municipios-destino') }">
              <i class="bi bi-geo-fill"></i>
              <span>Municípios Destino</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/admin/categorias" class="nav-link" :class="{ active: isActive('/admin/categorias') }">
              <i class="bi bi-tag-fill"></i>
              <span>Categorias / Pesos</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/admin/icms" class="nav-link" :class="{ active: isActive('/admin/icms') }">
              <i class="bi bi-percent"></i>
              <span>ICMS por UF</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/admin/cotacoes" class="nav-link" :class="{ active: isActive('/admin/cotacoes') }">
              <i class="bi bi-graph-up-arrow"></i>
              <span>Cotação Regional</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/admin/config-comissao" class="nav-link" :class="{ active: isActive('/admin/config-comissao') }">
              <i class="bi bi-gear-fill"></i>
              <span>Comissão / Config.</span>
            </router-link>
          </li>
          <li class="nav-item">
            <router-link to="/admin/auditoria" class="nav-link" :class="{ active: isActive('/admin/auditoria') }">
              <i class="bi bi-clock-history"></i>
              <span>Histórico</span>
            </router-link>
          </li>
        </template>
      </ul>

      <!-- Footer / Logout -->
      <div class="sidebar-footer">
        <div class="d-flex align-items-center gap-2 px-1 mb-2">
          <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
               style="width:32px;height:32px;background:rgba(247,148,29,0.25);color:#f7941d;font-weight:700;font-size:0.8rem">
            {{ auth.nomeUsuario.charAt(0).toUpperCase() }}
          </div>
          <div class="overflow-hidden" style="min-width:0">
            <div class="text-white fw-semibold text-truncate" style="font-size:0.82rem">{{ auth.nomeUsuario }}</div>
            <div style="font-size:0.68rem;color:rgba(255,255,255,0.45)">{{ auth.user?.perfil }}</div>
          </div>
        </div>
        <button class="nav-link w-100 text-start btn btn-link p-0" style="color:rgba(255,255,255,0.5);font-size:0.82rem" @click="logout">
          <i class="bi bi-box-arrow-left me-2"></i>Sair
        </button>
      </div>
    </nav>

    <!-- Main -->
    <div class="main-content flex-grow-1">
      <!-- Topbar -->
      <div class="topbar">
        <span class="topbar-title">
          <i class="bi bi-chevron-right me-1 text-muted small"></i>
          {{ route.meta?.title || 'Originação de Gado' }}
        </span>
        <div class="d-flex align-items-center gap-2">
          <img src="/logo-facholi.png" alt="Facholi" style="height:22px;opacity:0.7" />
          <span class="badge rounded-pill" style="background:#f7941d;font-size:0.7rem">
            {{ auth.user?.perfil }}
          </span>
        </div>
      </div>

      <!-- Page content -->
      <div class="p-4">
        <router-view />
      </div>
    </div>
  </div>
</template>
