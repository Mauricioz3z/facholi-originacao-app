import { ref, readonly } from 'vue'

const versao = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev'
const verificando = ref(false)
const mensagem = ref('')

let _updateSW = null

export function registerUpdateFn(fn) {
  _updateSW = fn
}

async function verificarAtualizacao() {
  verificando.value = true
  mensagem.value = ''
  try {
    if (!('serviceWorker' in navigator)) {
      mensagem.value = 'Service worker não suportado neste navegador.'
      return
    }
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) {
      mensagem.value = 'Service worker não registrado.'
      return
    }

    await reg.update()
    // Dá um tempo para o estado mudar
    await new Promise(r => setTimeout(r, 1200))

    if (reg.installing || reg.waiting) {
      mensagem.value = 'Nova versão encontrada! Atualizando...'
      // onNeedRefresh no main.js cuidará do reload automático.
      // Como fallback, força reload em 1.5s caso o auto não dispare.
      setTimeout(() => {
        if (_updateSW) _updateSW(true)
        else window.location.reload()
      }, 1500)
    } else {
      mensagem.value = 'Você já está na versão mais recente.'
    }
  } catch (e) {
    mensagem.value = 'Erro ao verificar: ' + (e?.message || 'desconhecido')
  } finally {
    verificando.value = false
    setTimeout(() => { mensagem.value = '' }, 6000)
  }
}

export function useAppVersion() {
  return {
    versao,
    verificando: readonly(verificando),
    mensagem: readonly(mensagem),
    verificarAtualizacao
  }
}
