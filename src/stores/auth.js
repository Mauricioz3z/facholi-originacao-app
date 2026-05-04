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

  return { user, token, isAuthenticated, isAdmin, nomeUsuario, login, logout }
})
