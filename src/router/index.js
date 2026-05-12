import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import PwaLayout from '../components/PwaLayout.vue'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue'), meta: { public: true } },

  {
    path: '/',
    redirect: () => {
      const auth = useAuthStore()
      if (auth.isAuthenticated && !auth.isAdmin) return '/app/simulacao'
      return '/dashboard'
    }
  },

  // Desktop routes
  { path: '/dashboard', name: 'Dashboard', component: () => import('../views/DashboardView.vue'), meta: { title: 'Dashboard' } },
  { path: '/simulacao', name: 'Simulacao', component: () => import('../views/SimulacaoRapidaView.vue'), meta: { title: 'Simulação Rápida' } },
  { path: '/negociacoes', name: 'Negociacoes', component: () => import('../views/NegociacoesView.vue'), meta: { title: 'Negociações' } },
  { path: '/negociacoes/nova', name: 'NovaNegociacao', component: () => import('../views/NegociacaoFormView.vue'), meta: { title: 'Nova Negociação' } },
  { path: '/negociacoes/:id/editar', name: 'EditarNegociacao', component: () => import('../views/NegociacaoFormView.vue'), meta: { title: 'Editar Negociação' } },
  { path: '/negociacoes/:id', name: 'DetalheNegociacao', component: () => import('../views/NegociacaoDetalheView.vue'), meta: { title: 'Detalhes da Negociação' } },
  { path: '/admin/usuarios', name: 'Usuarios', component: () => import('../views/admin/UsuariosView.vue'), meta: { adminOnly: true, title: 'Compradores' } },
  { path: '/admin/corretores', name: 'Corretores', component: () => import('../views/admin/CorretoresView.vue'), meta: { adminOnly: true, title: 'Corretores' } },
  { path: '/admin/municipios-origem', name: 'MunicipiosOrigem', component: () => import('../views/admin/MunicipiosOrigemView.vue'), meta: { adminOnly: true, title: 'Municípios de Origem' } },
  { path: '/admin/municipios-destino', name: 'MunicipiosDestino', component: () => import('../views/admin/MunicipiosDestinoView.vue'), meta: { adminOnly: true, title: 'Municípios de Destino' } },
  { path: '/admin/categorias', name: 'Categorias', component: () => import('../views/admin/CategoriasView.vue'), meta: { adminOnly: true, title: 'Categorias / Pesos' } },
  { path: '/admin/icms', name: 'Icms', component: () => import('../views/admin/IcmsView.vue'), meta: { adminOnly: true, title: 'ICMS por UF' } },
  { path: '/admin/cotacoes', name: 'Cotacoes', component: () => import('../views/admin/CotacoesView.vue'), meta: { adminOnly: true, title: 'Cotação Regional' } },
  { path: '/admin/config-comissao', name: 'ConfigComissao', component: () => import('../views/admin/ConfigComissaoView.vue'), meta: { adminOnly: true, title: 'Comissão / Config.' } },
  { path: '/admin/auditoria', name: 'Auditoria', component: () => import('../views/admin/AuditoriaView.vue'), meta: { adminOnly: true, title: 'Histórico' } },
  { path: '/oportunidades', name: 'Oportunidades', component: () => import('../views/OportunidadesView.vue'), meta: { title: 'Mapa de Oportunidades' } },

  // PWA routes (mobile, compradores)
  {
    path: '/app',
    component: PwaLayout,
    meta: { pwa: true },
    children: [
      { path: '', redirect: '/app/simulacao' },
      {
        path: 'dashboard',
        name: 'PwaDashboard',
        component: () => import('../views/pwa/DashboardView.vue'),
        meta: { pwa: true, title: 'Dashboard' }
      },
      {
        path: 'simulacao',
        name: 'PwaSimulacao',
        component: () => import('../views/pwa/SimulacaoView.vue'),
        meta: { pwa: true, title: 'Simulação' }
      },
      {
        path: 'negociacoes',
        name: 'PwaNegociacoes',
        component: () => import('../views/pwa/NegociacoesView.vue'),
        meta: { pwa: true, title: 'Negociações' }
      },
      {
        path: 'negociacoes/nova',
        name: 'PwaNovaNegociacao',
        component: () => import('../views/pwa/NegociacaoFormView.vue'),
        meta: { pwa: true, title: 'Nova Negociação' }
      },
      {
        path: 'negociacoes/:id/editar',
        name: 'PwaEditarNegociacao',
        component: () => import('../views/pwa/NegociacaoFormView.vue'),
        meta: { pwa: true, title: 'Editar Negociação' }
      },
      {
        path: 'negociacoes/:id',
        name: 'PwaDetalheNegociacao',
        component: () => import('../views/pwa/NegociacaoDetalheView.vue'),
        meta: { pwa: true, title: 'Detalhes' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) return '/login'
  if (to.meta.adminOnly && !auth.isAdmin) return '/dashboard'
})

export default router
