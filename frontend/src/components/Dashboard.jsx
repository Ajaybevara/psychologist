import { useEffect, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { getMoodHistory, getWellness } from '../services/api'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

export default function Dashboard({ language }) {
  const [history, setHistory] = useState([])
  const [wellness, setWellness] = useState({})
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageMood: 'Good',
    thisWeekEntries: 0
  })

  useEffect(() => {
    getMoodHistory()
      .then((res) => {
        const data = res.data.history || []
        setHistory(data)
        setStats({
          totalSessions: data.length,
          averageMood: data.length > 0 ? data[0].mood : 'Not tracked',
          thisWeekEntries: data.filter((h) => new Date(h.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length
        })
      })
      .catch(console.error)

    getWellness()
      .then((res) => setWellness(res.data || {}))
      .catch(console.error)
  }, [])

  const moodToScore = (mood) => {
    const mapping = { happy: 90, calm: 80, neutral: 60, stressed: 40, anxious: 35, sad: 30, lonely: 50, motivated: 95 }
    return mapping[mood] || 55
  }

  const chartData = {
    labels: history.slice(0, 7).reverse().map((item) => new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Mood Trend',
        data: history.slice(0, 7).reverse().map((item) => moodToScore(item.mood)),
        backgroundColor: 'rgba(120, 212, 216, 0.3)',
        borderColor: 'rgba(120, 212, 216, 1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ]
  }

  return (
    <div className="space-y-6">
      <section className="card-glass p-8 rounded-3xl">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-transparent">Welcome to MindCare</h1>
            <p className="text-slate-300 mt-3 text-lg">Your personal wellness companion for emotional support and daily mindfulness.</p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 border border-teal-400/30 p-6 text-center">
            <p className="text-sm uppercase tracking-wider text-teal-200 font-semibold">Daily Affirmation</p>
            <p className="mt-4 text-lg font-semibold text-slate-100">{wellness.quote || 'You are stronger than you think.'}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-glass p-6 rounded-3xl text-center">
          <p className="text-3xl font-bold text-teal-300">{stats.totalSessions}</p>
          <p className="text-slate-300 mt-2">Total Check-ins</p>
          <p className="text-sm text-slate-400 mt-1">All-time wellness records</p>
        </div>
        <div className="card-glass p-6 rounded-3xl text-center">
          <p className="text-3xl font-bold text-blue-300 capitalize">{stats.averageMood}</p>
          <p className="text-slate-300 mt-2">Current Mood</p>
          <p className="text-sm text-slate-400 mt-1">Based on latest entry</p>
        </div>
        <div className="card-glass p-6 rounded-3xl text-center">
          <p className="text-3xl font-bold text-purple-300">{stats.thisWeekEntries}</p>
          <p className="text-slate-300 mt-2">This Week</p>
          <p className="text-sm text-slate-400 mt-1">Weekly check-in streak</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card-glass p-6 rounded-3xl">
          <h2 className="text-2xl font-bold mb-4">📊 Your Mood Trend</h2>
          <div style={{ height: '300px' }}>
            {history.length > 0 ? (
              <Line data={chartData} options={{ maintainAspectRatio: false, responsive: true, plugins: { legend: { display: true, labels: { color: '#cbd5e1' } } }, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#cbd5e1' } }, x: { ticks: { color: '#cbd5e1' } } } }} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No mood data yet. Start tracking your mood!</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-glass p-6 rounded-3xl">
            <h3 className="font-bold text-lg mb-3">💡 Wellness Tip</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{wellness.affirmation || 'Remember to take breaks, drink water, and be kind to yourself today.'}</p>
          </div>
          <div className="card-glass p-6 rounded-3xl">
            <h3 className="font-bold text-lg mb-3">🎯 What's Next?</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>✓ Check in daily</li>
              <li>✓ Try breathing exercises</li>
              <li>✓ Chat with MindCare</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-glass p-6 rounded-3xl">
          <h3 className="font-bold text-xl mb-4">🌬️ Breathing Exercise</h3>
          <p className="text-slate-300 mb-4">The 4-7-8 Technique for instant calm:</p>
          <ol className="space-y-2 text-slate-300 text-sm">
            <li>1. Inhale for 4 seconds</li>
            <li>2. Hold for 7 seconds</li>
            <li>3. Exhale for 8 seconds</li>
            <li>4. Repeat 4 times</li>
          </ol>
        </div>
        <div className="card-glass p-6 rounded-3xl">
          <h3 className="font-bold text-xl mb-4">📋 Recent Entries</h3>
          <div className="space-y-2">
            {history.slice(0, 4).map((entry, index) => (
              <div key={`${entry.createdAt}-${index}`} className="bg-white/5 rounded-2xl p-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold capitalize text-teal-300">{entry.mood}</span>
                  <span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {history.length === 0 && <p className="text-slate-400">No mood entries yet. Start by tracking your mood!</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
