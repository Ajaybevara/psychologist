import { useEffect, useState } from 'react'
import { getProfile, logout as apiLogout } from '../services/api'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('jwtToken')
    if (!token) {
      setLoading(false)
      return
    }
    getProfile()
      .then((res) => {
        if (res.data.profile) {
          setUser({
            name: res.data.name,
            email: res.data.email,
            role: res.data.role,
            ...res.data.profile
          })
        } else {
          setUser(res.data)
        }
      })
      .catch((err) => {
        console.error('Auth error:', err)
        localStorage.removeItem('jwtToken')
      })
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    try {
      await apiLogout()
    } catch (err) {
      console.warn('Logout API failed', err)
    }
    localStorage.removeItem('jwtToken')
    setUser(null)
    window.location.href = '/auth/login'
  }

  return { user, setUser, loading, logout }
}
