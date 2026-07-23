import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../services/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(localStorage.getItem('precoboi_user') || 'null'))
  const token = ref(localStorage.getItem('precoboi_token') || null)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.perfil === 'Admin')
  const nomeUsuario = computed(() => user.value?.nome || '')

  async function login(email, senha) {
    const res = await authApi.login(email, senha)
    token.value = res.data.token
    user.value = { id: res.data.id, nome: res.data.nome, email: res.data.email, perfil: res.data.perfil }
    localStorage.setItem('precoboi_token', res.data.token)
    localStorage.setItem('precoboi_user', JSON.stringify(user.value))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('precoboi_token')
    localStorage.removeItem('precoboi_user')
  }

  // O evento "storage" só dispara em OUTRAS abas/janelas da mesma origem (nunca na
  // que fez a mudança). Sem isso, logar com uma conta diferente em outra aba deixa
  // esta aba com a UI mostrando o usuário antigo mas as requisições (que leem o
  // token direto do localStorage em services/api.js) já saindo com a identidade nova.
  window.addEventListener('storage', (e) => {
    if (e.key !== 'precoboi_token' && e.key !== 'precoboi_user') return
    token.value = localStorage.getItem('precoboi_token') || null
    user.value = JSON.parse(localStorage.getItem('precoboi_user') || 'null')
  })

  return { user, token, isAuthenticated, isAdmin, nomeUsuario, login, logout }
})
