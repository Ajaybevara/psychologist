import { useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from './hooks/useAuth'
import AuthPanel from './components/AuthPanel'
import Dashboard from './components/Dashboard'
import ChatPanel from './components/ChatPanel'
import MoodTracker from './components/MoodTracker'
import WellnessTools from './components/WellnessTools'
import AdminPanel from './components/AdminPanel'
import Sidebar from './components/Sidebar'

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

function AppContent() {
  const { user, loading, logout } = useAuth()
  const [theme, setTheme] = useState('dark')
  const [language, setLanguage] = useState('en')
  const location = useLocation()
  const isAuthPage = location.pathname.startsWith('/auth')

  const appClass = useMemo(() => {
    return theme === 'light' ? 'bg-[#f6f9ff] text-slate-900' : 'bg-[#07111f] text-slate-100'
  }, [theme])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className={`${appClass} min-h-screen transition-colors duration-500`}>
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {!isAuthPage && <Sidebar theme={theme} setTheme={setTheme} user={user} language={language} setLanguage={setLanguage} logout={logout} />}
          <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <Routes>
              <Route path="/auth/*" element={<AuthPanel />} />
              <Route path="/" element={user ? <Dashboard language={language} /> : <Navigate to="/auth/login" />} />
              <Route path="/chat" element={user ? <ChatPanel language={language} /> : <Navigate to="/auth/login" />} />
              <Route path="/mood" element={user ? <MoodTracker language={language} /> : <Navigate to="/auth/login" />} />
              <Route path="/tools" element={user ? <WellnessTools /> : <Navigate to="/auth/login" />} />
              <Route path="/admin" element={user ? <AdminPanel /> : <Navigate to="/auth/login" />} />
              <Route path="*" element={<Navigate to={user ? '/' : '/auth/login'} />} />
            </Routes>
          </motion.main>
        </div>
      </div>
    </div>
  )
}

export default App
