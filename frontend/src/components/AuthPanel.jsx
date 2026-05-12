import { useState } from 'react'
import { Link, Routes, Route } from 'react-router-dom'
import { login, register, forgotPassword, resetPassword } from '../services/api'
import { SparklesIcon, HeartIcon } from '@heroicons/react/24/outline'

const formClass = 'bg-slate-950/90 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl shadow-cyan-500/10 space-y-6 w-full max-w-md'
const inputClass = 'w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition'
const buttonClass = 'w-full rounded-3xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 py-3 px-4 text-white font-bold shadow-lg shadow-fuchsia-500/20 hover:scale-[1.01] transition-all duration-200'
const linkClass = 'text-cyan-300 hover:text-cyan-200 font-semibold'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const { data } = await login({ email: email.trim(), password })
      localStorage.setItem('jwtToken', data.token)
      window.location.href = '/'
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={formClass}>
      {error && <div className="rounded-3xl bg-rose-500/15 border border-rose-400/30 p-4 text-rose-100 text-sm">{error}</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          type="email"
          className={inputClass}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          className={inputClass}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className={buttonClass} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="space-y-3 text-center text-sm">
        <p className="text-slate-400">Don't have an account? <Link to="/auth/register" className={linkClass}>Create one</Link></p>
      </div>
    </div>
  )
}

function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const { data } = await register({ name: name.trim(), email: email.trim(), password })
      localStorage.setItem('jwtToken', data.token)
      window.location.href = '/'
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={formClass}>
      {error && <div className="rounded-3xl bg-rose-500/15 border border-rose-400/30 p-4 text-rose-100 text-sm">{error}</div>}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <input
          type="text"
          className={inputClass}
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
        />
        <input
          type="email"
          className={inputClass}
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          className={inputClass}
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />
        <input
          type="password"
          className={inputClass}
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className={buttonClass} disabled={loading}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <div className="space-y-3 text-center text-sm">
        <p className="text-slate-400">Already have an account? <Link to="/auth/login" className={linkClass}>Sign in</Link></p>
      </div>
    </div>
  )
}

export default function AuthPanel() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-20 px-4 bg-gradient-to-br from-[#081226] via-[#13203e] to-[#0f1b33] relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 text-white shadow-2xl shadow-cyan-500/30 animate-pulse">
            <SparklesIcon className="h-10 w-10" />
          </div>
        </div>
        <div className="mb-4">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/90 mb-2">MindCare</p>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
            Psychology Support
          </h1>
        </div>
        <p className="text-slate-300 text-lg leading-relaxed max-w-lg mx-auto">
          Your safe space for mental wellness, AI-powered chat support, and mood tracking.
        </p>
      </div>
      <Routes>
        <Route path="login" element={<LoginForm />} />
        <Route path="register" element={<RegisterForm />} />
        <Route path="*" element={<LoginForm />} />
      </Routes>
    </div>
  )
}
