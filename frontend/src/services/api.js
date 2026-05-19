import axios from 'axios'

const BASE_URL = `${import.meta.env.VITE_API_URL}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request Interceptor: Her istekte JWT token ekle ──────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('finans_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor: Hataları Türkçe mesaja çevir ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const serverMessage = error.response?.data?.message || error.response?.data?.error

    let userMessage = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'

    if (!error.response) {
      userMessage = 'Sunucuya bağlanılamıyor. İnternet bağlantınızı kontrol edin.'
    } else if (status === 400) {
      userMessage = serverMessage || 'Geçersiz istek. Lütfen bilgileri kontrol edin.'
    } else if (status === 401) {
      userMessage = 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.'
      // Token'ı temizle ve login'e yönlendir
      localStorage.removeItem('finans_token')
      localStorage.removeItem('finans_user')
      if (window.location.pathname !== '/auth') {
        window.location.href = '/auth'
      }
    } else if (status === 403) {
      userMessage = 'Bu işlem için yetkiniz bulunmuyor.'
    } else if (status === 404) {
      userMessage = 'Aradığınız içerik bulunamadı.'
    } else if (status === 409) {
      userMessage = serverMessage || 'Bu bilgi zaten kayıtlı.'
    } else if (status === 422) {
      userMessage = serverMessage || 'Girdiğiniz bilgileri kontrol edin.'
    } else if (status === 429) {
      userMessage = 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.'
    } else if (status >= 500) {
      userMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.'
    }

    // Hata objesine Türkçe mesajı ekle
    error.userMessage = userMessage
    return Promise.reject(error)
  }
)

// ── Auth Servisleri ───────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

// ── Chat Servisleri ───────────────────────────────────────────────────────────
export const chatAPI = {
  send: (message) => api.post('/chat', { message }),
  getModules: () => api.get('/chat/modules'),
}

// ── Upload Servisleri ─────────────────────────────────────────────────────────
export const uploadAPI = {
  uploadFile: (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) {
          const pct = Math.round((e.loaded * 100) / e.total)
          onProgress(pct)
        }
      },
    })
  },
}

// ── Forensic (Harcama Analizi) ────────────────────────────────────────────────
export const forensicAPI = {
  getSummary: () => api.get('/forensic/summary'),
  getTransactions: (params) => api.get('/forensic/transactions', { params }),
  getPatterns: () => api.get('/forensic/patterns'),
  getHistory: () => api.get('/forensic/history'),
}

// ── Söz Aynası (Intentions) ───────────────────────────────────────────────────
export const intentionsAPI = {
  create: (data) => api.post('/intentions', data),
  getByMonth: (month, year) => api.get(`/intentions/${month}/${year}`),
  getReport: (month, year) => api.get(`/intentions/report/${month}/${year}`),
  downloadPDF: (month, year) => api.get(`/intentions/report/${month}/${year}/pdf`, { responseType: 'blob' }),
  getSuggestions: () => api.get('/intentions/suggestions'),
  delete: (id) => api.delete(`/intentions/${id}`),
}

// ── Future Self & What-If ─────────────────────────────────────────────────────
export const futureSelfAPI = {
  chat: (message) => api.post('/future-self/chat', { message }),
  simulate: (data) => api.post('/future-self/simulate', data),
  getProjection: () => api.get('/future-self/projection'),
  getHistory: () => api.get('/future-self/history'),
}

// ── Finansal Sağlık Skoru ─────────────────────────────────────────────────────
export const healthAPI = {
  getScore: () => api.get('/health/score'),
}

// ── Para Kişiliği ─────────────────────────────────────────────────────────────
export const personaAPI = {
  getMoneyType: () => api.get('/persona/money-type'),
}

// ── Seed (Sadece Dev) ─────────────────────────────────────────────────────────
export const seedAPI = {
  seedMockData: () => api.post('/seed/mock-data'),
}

export default api
