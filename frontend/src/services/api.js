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

// Auth endpoints
export const register = (payload) => api.post('/auth/register', payload)
export const login = (payload) => api.post('/auth/login', payload)
export const forgotPassword = (payload) => api.post('/auth/forgot-password', payload)
export const resetPassword = (payload) => api.post('/auth/reset-password', payload)
export const getProfile = () => api.get('/profile')
export const updateProfile = (payload) => api.put('/profile', payload)
export const logout = () => api.post('/auth/logout')

// Mood endpoints
export const submitMood = (payload) => api.post('/mood', payload)
export const getMoodHistory = () => api.get('/mood/history')
export const getMoodAnalytics = () => api.get('/mood/analytics')

// Chat endpoints
export const sendChat = (payload) => api.post('/chat', payload)
export const getChatHistory = () => api.get('/chat/history')

// Wellness endpoints
export const getWellness = () => api.get('/wellness')

// Journaling endpoints
export const createJournal = (payload) => api.post('/journal', payload)
export const getJournalHistory = () => api.get('/journal/history')
export const getJournal = (index) => api.get(`/journal/${index}`)

// Breathing exercises endpoints
export const getBreathingExercises = () => api.get('/breathing/exercises')
export const completeBreathingExercise = (payload) => api.post('/breathing/complete', payload)
export const getBreathingHistory = () => api.get('/breathing/history')

// Psychology questions endpoints
export const getNextQuestion = (payload) => api.post('/psychology/next-question', payload)
export const getWellnessSuggestion = () => api.get('/psychology/wellness-suggestion')

// Admin endpoints
export const getAdminUsers = () => api.get('/admin/users')
export const getAdminAnalytics = () => api.get('/admin/analytics')
export const getAdminMoodAnalytics = () => api.get('/admin/mood-analytics')
export const getConversationLogs = (email, limit = 100) => api.get('/admin/conversation-logs', { params: { email, limit } })
export const exportReport = (type = 'full') => api.get('/admin/export-report', { params: { type } })

export default api
