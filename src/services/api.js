import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('precoboi_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('precoboi_token')
      localStorage.removeItem('precoboi_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// Auth
export const authApi = {
  login: (email, senha) => api.post('/auth/login', { email, senha }),
  me: () => api.get('/auth/me'),
}

// Simulação
export const simulacaoApi = {
  calcular: (data) => api.post('/simulacao', data),
  rapida: (origemId, destinoId) => api.get(`/simulacao/rapida?origemId=${origemId}&destinoId=${destinoId}`),
}

// Negociações
export const negociacaoApi = {
  listar: (params) => api.get('/negociacoes', { params }),
  obter: (id) => api.get(`/negociacoes/${id}`),
  criar: (data) => api.post('/negociacoes', data),
  atualizar: (id, data) => api.put(`/negociacoes/${id}`, data),
  fechar: (id) => api.post(`/negociacoes/${id}/fechar`),
  atualizarEntrega: (data) => api.put('/negociacoes/entrega', data),
}

// Dashboard
export const dashboardApi = {
  porComprador: (params) => api.get('/dashboard/compradores', { params }),
  negociacoesPorComprador: (compradorId, params) => api.get(`/dashboard/compradores/${compradorId}/negociacoes`, { params }),
  porCorretor: (params) => api.get('/dashboard/corretores', { params }),
}

// Cadastros
export const usuariosApi = {
  listar: (params) => api.get('/usuarios', { params }),
  criar: (data) => api.post('/usuarios', data),
  atualizar: (id, data) => api.put(`/usuarios/${id}`, data),
  excluir: (id) => api.delete(`/usuarios/${id}`),
}

export const corretoresApi = {
  listar: (params) => api.get('/corretores', { params }),
  criar: (data) => api.post('/corretores', data),
  atualizar: (id, data) => api.put(`/corretores/${id}`, data),
  excluir: (id) => api.delete(`/corretores/${id}`),
}

export const municipiosOrigemApi = {
  listar: (params) => api.get('/municipios-origem', { params }),
  criar: (data) => api.post('/municipios-origem', data),
  atualizar: (id, data) => api.put(`/municipios-origem/${id}`, data),
  excluir: (id) => api.delete(`/municipios-origem/${id}`),
}

export const municipiosDestinoApi = {
  listar: () => api.get('/municipios-destino'),
  padrao: () => api.get('/municipios-destino/padrao'),
  criar: (data) => api.post('/municipios-destino', data),
  atualizar: (id, data) => api.put(`/municipios-destino/${id}`, data),
  excluir: (id) => api.delete(`/municipios-destino/${id}`),
}

export const categoriasApi = {
  listar: () => api.get('/categorias'),
  atualizar: (id, data) => api.put(`/categorias/${id}`, data),
}

export const icmsApi = {
  listar: () => api.get('/icms'),
  atualizar: (uf, data) => api.put(`/icms/${uf}`, data),
}

export const cotacoesApi = {
  listar: () => api.get('/cotacoes'),
  obter: (uf) => api.get(`/cotacoes/${uf}`),
  salvar: (data) => api.post('/cotacoes', data),
}

export const configComissaoApi = {
  obter: () => api.get('/config-comissao'),
  salvar: (data) => api.post('/config-comissao', data),
}

export const auditoriaApi = {
  listar: (params) => api.get('/auditoria', { params }),
}
