import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
import App from './App.vue'
import router from './router'
import { registerUpdateFn } from './composables/useAppVersion'
import './style.css'
import './pwa.css'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Nova versão disponível — atualiza automaticamente
    updateSW(true)
  }
})

registerUpdateFn(updateSW)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
