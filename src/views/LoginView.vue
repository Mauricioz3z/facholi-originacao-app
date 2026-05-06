<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const senha = ref('')
const erro = ref('')
const carregando = ref(false)
const mostrarSenha = ref(false)

async function entrar() {
  if (!email.value || !senha.value) {
    erro.value = 'Preencha o e-mail e a senha.'
    return
  }
  try {
    carregando.value = true
    erro.value = ''
    await auth.login(email.value, senha.value)
    router.push(auth.isAdmin ? '/dashboard' : '/app/simulacao')
  } catch {
    erro.value = 'E-mail ou senha inválidos. Verifique suas credenciais.'
  } finally {
    carregando.value = false
  }
}
</script>

<template>
  <div class="login-page d-flex align-items-center justify-content-center p-3">
    <!-- Decoração de fundo -->
    <div class="position-fixed top-0 start-0 w-100 h-100" style="pointer-events:none;overflow:hidden;">
      <div style="position:absolute;width:400px;height:400px;border-radius:50%;background:rgba(114,184,64,0.08);top:-100px;right:-100px;"></div>
      <div style="position:absolute;width:300px;height:300px;border-radius:50%;background:rgba(247,148,29,0.06);bottom:-80px;left:-80px;"></div>
    </div>

    <div class="login-card w-100" style="max-width:420px;position:relative;z-index:1">
      <!-- Cabeçalho com logo -->
      <div class="login-header">
        <img src="/logo-facholi.png" alt="Facholi" class="mb-2" />
        <div class="login-subtitle">Facholi — Gestão de Originação de Gado</div>
      </div>

      <!-- Corpo do formulário -->
      <div class="card-body p-4 bg-white">
        <p class="text-muted text-center mb-4" style="font-size:0.85rem">
          Faça login para acessar o sistema
        </p>

        <form @submit.prevent="entrar" autocomplete="on">
          <div class="mb-3">
            <label class="form-label fw-semibold" style="font-size:0.85rem;color:#333">E-mail</label>
            <div class="input-group">
              <span class="input-group-text bg-light border-end-0">
                <i class="bi bi-envelope" style="color:#72b840"></i>
              </span>
              <input
                v-model="email"
                type="email"
                class="form-control border-start-0 ps-0"
                placeholder="seu@email.com.br"
                autocomplete="email"
                required
              />
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label fw-semibold" style="font-size:0.85rem;color:#333">Senha</label>
            <div class="input-group">
              <span class="input-group-text bg-light border-end-0">
                <i class="bi bi-lock" style="color:#72b840"></i>
              </span>
              <input
                v-model="senha"
                :type="mostrarSenha ? 'text' : 'password'"
                class="form-control border-start-0 border-end-0 ps-0"
                placeholder="••••••••"
                autocomplete="current-password"
                required
              />
              <button type="button" class="input-group-text bg-light border-start-0"
                      @click="mostrarSenha = !mostrarSenha" tabindex="-1">
                <i :class="mostrarSenha ? 'bi bi-eye-slash' : 'bi bi-eye'" style="color:#aaa"></i>
              </button>
            </div>
          </div>

          <div v-if="erro" class="alert py-2 mb-3" style="background:#fff3cd;border-color:#ffe082;color:#7b4e00;font-size:0.85rem">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>{{ erro }}
          </div>

          <button
            type="submit"
            class="btn w-100 fw-semibold py-2"
            :disabled="carregando"
            style="background:linear-gradient(90deg,#1a5f2a,#237a37);color:white;border:none;border-radius:8px;font-size:0.95rem;letter-spacing:0.02em"
          >
            <span v-if="carregando" class="spinner-border spinner-border-sm me-2"></span>
            <i v-else class="bi bi-box-arrow-in-right me-2"></i>
            Entrar
          </button>
        </form>
      </div>

      <!-- Rodapé -->
      <div class="text-center py-2 px-4 bg-white" style="border-top:1px solid #e8f0e8;border-radius:0 0 14px 14px">
        <small class="text-muted" style="font-size:0.72rem">
          © {{ new Date().getFullYear() }} Grupo Facholi — Sementes e Nutrição
        </small>
      </div>
    </div>
  </div>
</template>
