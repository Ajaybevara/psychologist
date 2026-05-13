import { useEffect, useState } from 'react'
import { getAdminAnalytics, getAdminUsers, getAdminMoodAnalytics, getConversationLogs, exportReport } from '../services/api'
import { DocumentArrowDownIcon } from '@heroicons/react/24/solid'

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalChats: 0,
    totalMoodEntries: 0,
    todayLogins: 0,
    todayLogouts: 0,
    moodStatistics: {},
    sentimentStatistics: {}
  })
  const [moodAnalytics, setMoodAnalytics] = useState({})
  const [conversationLogs, setConversationLogs] = useState([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      const [usersRes, analyticsRes, moodRes, logsRes] = await Promise.all([
        getAdminUsers(),
        getAdminAnalytics(),
        getAdminMoodAnalytics(),
        getConversationLogs(null, 50)
      ])

      setUsers(usersRes.data.users || [])
      setAnalytics(analyticsRes.data || {})
      setMoodAnalytics(moodRes.data || {})
      setConversationLogs(logsRes.data.logs || [])
    } catch (err) {
      setError('Admin access only or data unavailable.')
      console.error('Admin panel error:', err)
    }
  }

  const handleExportReport = async (reportType) => {
    setIsExporting(true)
    try {
      const res = await exportReport(reportType)
      const dataStr = JSON.stringify(res.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mindcare-report-${reportType}-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export report')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Admin panel</p>
        <h2 className="text-3xl font-semibold">User engagement and platform statistics</h2>
        <p className="mt-3 text-slate-300">Monitor users, conversations, moods, and platform health.</p>
      </div>

      {error && <div className="rounded-3xl bg-rose-500/10 border border-rose-400/20 p-5 text-rose-100">{error}</div>}

      {/* Tab Navigation */}
      <div className="card-glass p-2 flex gap-2 overflow-x-auto">
        {['overview', 'moods', 'conversations', 'export'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* Key Metrics */}
          <div className="rounded-3xl bg-slate-950/70 p-6 border border-slate-700">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Total users</p>
            <p className="mt-3 text-4xl font-semibold text-blue-400">{analytics.totalUsers}</p>
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6 border border-slate-700">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Total chats</p>
            <p className="mt-3 text-4xl font-semibold text-green-400">{analytics.totalChats}</p>
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6 border border-slate-700">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Mood entries</p>
            <p className="mt-3 text-4xl font-semibold text-purple-400">{analytics.totalMoodEntries}</p>
          </div>

          <div className="rounded-3xl bg-slate-950/70 p-6 border border-slate-700">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Today logins</p>
            <p className="mt-3 text-4xl font-semibold text-yellow-400">{analytics.todayLogins}</p>
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6 border border-slate-700">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Today logouts</p>
            <p className="mt-3 text-4xl font-semibold text-red-400">{analytics.todayLogouts}</p>
          </div>
        </div>
      )}

      {/* Sentiment & Mood Stats */}
      {activeTab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Sentiment Distribution */}
          <div className="card-glass p-6">
            <h3 className="text-xl font-semibold mb-4">Sentiment Distribution</h3>
            <div className="space-y-3">
              {Object.entries(analytics.sentimentStatistics || {}).map(([sentiment, count]) => (
                <div key={sentiment} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-slate-300">{sentiment}</span>
                    <span className="text-blue-400">{count}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      style={{
                        width: `${((count / (analytics.totalChats || 1)) * 100).toFixed(0)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mood Distribution */}
          <div className="card-glass p-6">
            <h3 className="text-xl font-semibold mb-4">Mood Distribution</h3>
            <div className="space-y-3">
              {Object.entries(analytics.moodStatistics || {}).map(([mood, count]) => (
                <div key={mood} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize text-slate-300">{mood}</span>
                    <span className="text-green-400">{count}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                      style={{
                        width: `${((count / (analytics.totalMoodEntries || 1)) * 100).toFixed(0)}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      {activeTab === 'overview' && (
        <div className="card-glass p-6 overflow-x-auto">
          <h3 className="text-xl font-semibold mb-4">Registered Users</h3>
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-3">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 15).map((user) => (
                <tr key={user.email} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="py-3">{user.name}</td>
                  <td>{user.email}</td>
                  <td className="capitalize">{user.role}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-4 text-slate-500">
                    No users available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Moods Tab */}
      {activeTab === 'moods' && (
        <div className="space-y-6">
          <div className="card-glass p-6">
            <h3 className="text-xl font-semibold mb-6">Mood Analytics</h3>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Mood by User */}
              <div>
                <h4 className="font-semibold mb-4 text-slate-300">Mood Distribution by User</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(moodAnalytics.moodByUser || {}).map(([email, moods]) => (
                    <div key={email} className="p-3 bg-slate-800 rounded-lg text-sm">
                      <p className="font-medium text-blue-300">{email}</p>
                      <div className="mt-2 text-xs space-y-1">
                        {Object.entries(moods).map(([mood, count]) => (
                          <div key={`${email}-${mood}`} className="flex justify-between text-slate-400">
                            <span className="capitalize">{mood}</span>
                            <span>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daily Trends */}
              <div>
                <h4 className="font-semibold mb-4 text-slate-300">Daily Mood Trends</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Object.entries(moodAnalytics.dailyTrends || {})
                    .sort()
                    .reverse()
                    .slice(0, 14)
                    .map(([date, moods]) => (
                      <div key={date} className="p-3 bg-slate-800 rounded-lg text-sm">
                        <p className="font-medium text-purple-300">{date}</p>
                        <div className="mt-2 text-xs space-y-1">
                          {Object.entries(moods).map(([mood, count]) => (
                            <div key={`${date}-${mood}`} className="flex justify-between text-slate-400">
                              <span className="capitalize">{mood}</span>
                              <span>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversations Tab */}
      {activeTab === 'conversations' && (
        <div className="card-glass p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Conversations</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {conversationLogs.slice(0, 50).map((log, idx) => (
              <div key={idx} className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-2">
                <div className="flex justify-between items-start">
                  <p className="font-medium text-blue-300">{log.email}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    log.sentiment === 'positive' ? 'bg-green-900 text-green-200' :
                    log.sentiment === 'challenged' ? 'bg-red-900 text-red-200' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {log.sentiment}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  <strong>User:</strong> {log.message.substring(0, 100)}...
                </p>
                <p className="text-sm text-slate-400">
                  <strong>AI:</strong> {log.reply.substring(0, 100)}...
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="card-glass p-8 space-y-4">
          <h3 className="text-2xl font-semibold mb-6">Export Reports</h3>
          <p className="text-slate-300 mb-6">Download platform data and analytics reports in JSON format.</p>

          <div className="grid gap-4 lg:grid-cols-2">
            {['full', 'users', 'moods', 'chats', 'journals'].map((type) => (
              <button
                key={type}
                onClick={() => handleExportReport(type)}
                disabled={isExporting}
                className="p-6 rounded-lg border border-slate-600 hover:border-blue-500 hover:bg-slate-800 transition disabled:opacity-50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <DocumentArrowDownIcon className="h-5 w-5 text-blue-400" />
                  <span className="font-medium capitalize">{type} Report</span>
                </div>
                <p className="text-xs text-slate-400">
                  {type === 'full' && 'Complete platform data'}
                  {type === 'users' && 'All registered users'}
                  {type === 'moods' && 'Mood tracking data'}
                  {type === 'chats' && 'Chat conversation logs'}
                  {type === 'journals' && 'Journal entries'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
