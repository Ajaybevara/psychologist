import { useEffect, useState } from 'react'
import { getAdminAnalytics, getAdminUsers } from '../services/api'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [analytics, setAnalytics] = useState({ totalUsers: 0, totalChats: 0, todayLogins: 0, todayLogouts: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminUsers()
      .then((res) => setUsers(res.data.users || []))
      .catch(() => setError('Admin access only.'))
    getAdminAnalytics()
      .then((res) => setAnalytics(res.data || {}))
      .catch(() => setError('Unable to fetch analytics.'))
  }, [])

  return (
    <div className="space-y-6">
      <div className="card-glass p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin panel</p>
        <h2 className="text-3xl font-semibold">User engagement and chatbot statistics</h2>
        <p className="mt-3 text-slate-300">Monitor registered users, conversations, and mental health activity across the platform.</p>
      </div>
      {error && <div className="rounded-3xl bg-rose-500/10 border border-rose-400/20 p-5 text-rose-100">{error}</div>}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card-glass p-6">
          <h3 className="text-xl font-semibold">Platform overview</h3>
          <div className="mt-6 grid gap-4">
            <div className="rounded-3xl bg-slate-950/70 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Total users</p>
              <p className="mt-3 text-3xl font-semibold">{analytics.totalUsers}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Total sessions</p>
              <p className="mt-3 text-3xl font-semibold">{analytics.totalChats}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Logins today</p>
              <p className="mt-3 text-3xl font-semibold">{analytics.todayLogins}</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Logouts today</p>
              <p className="mt-3 text-3xl font-semibold">{analytics.todayLogouts}</p>
            </div>
          </div>
        </div>
        <div className="card-glass p-6 overflow-x-auto">
          <h3 className="text-xl font-semibold">Registered users</h3>
          <table className="mt-5 w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-3">Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 10).map((user) => (
                <tr key={user.email} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="py-3">{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan="3" className="py-4 text-slate-500">No users available or admin access not granted.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
