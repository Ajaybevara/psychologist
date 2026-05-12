import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwtToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const register = (payload) => api.post('/auth/register', payload)
export const login = (payload) => api.post('/auth/login', payload)
export const forgotPassword = (payload) => api.post('/auth/forgot-password', payload)
export const resetPassword = (payload) => api.post('/auth/reset-password', payload)
export const getProfile = () => api.get('/profile')
export const updateProfile = (payload) => api.put('/profile', payload)
export const submitMood = (payload) => api.post('/mood', payload)
export const getMoodHistory = () => api.get('/mood/history')
export const sendChat = (payload) => api.post('/chat', payload)
export const getChatHistory = () => api.get('/chat/history')
export const getWellness = () => api.get('/wellness')
export const logout = () => api.post('/auth/logout')
export const getAdminUsers = () => api.get('/admin/users')
export const getAdminAnalytics = () => api.get('/admin/analytics')
export default api
