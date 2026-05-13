import { useEffect, useState } from 'react'
import { submitMood, getMoodHistory, getMoodAnalytics } from '../services/api'

const moods = [
  { key: 'happy', emoji: '😊', label: 'Happy' },
  { key: 'calm', emoji: '😌', label: 'Calm' },
  { key: 'stressed', emoji: '😰', label: 'Stressed' },
  { key: 'anxious', emoji: '😟', label: 'Anxious' },
  { key: 'lonely', emoji: '😔', label: 'Lonely' },
  { key: 'motivated', emoji: '💪', label: 'Motivated' }
]

export default function MoodTracker() {
  const [selectedMood, setSelectedMood] = useState('calm')
  const [note, setNote] = useState('')
  const [history, setHistory] = useState([])
  const [analytics, setAnalytics] = useState({})
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadMoodData()
  }, [])

  const loadMoodData = async () => {
    try {
      const historyRes = await getMoodHistory()
      setHistory(historyRes.data.history || [])

      const analyticsRes = await getMoodAnalytics()
      setAnalytics(analyticsRes.data || {})
    } catch (error) {
      console.error('Failed to load mood data:', error)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await submitMood({ mood: selectedMood, note })
      setMessage('Mood entry saved.')
      setNote('')
      await loadMoodData()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Unable to save mood right now.')
    }
  }

  const getMoodStats = () => {
    const distribution = analytics.moodDistribution || {}
    return Object.entries(distribution).map(([mood, count]) => ({
      mood,
      count,
      percentage: ((count / (analytics.totalEntries || 1)) * 100).toFixed(1)
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-glass p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Mood Tracker</p>
            <h2 className="text-3xl font-semibold">Daily emotional check-in</h2>
            <p className="mt-3 text-slate-300">Choose how you feel and review your mood history over time.</p>
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-4 text-slate-300">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wellness score</p>
            <p className="mt-2 text-xl font-semibold">{analytics.wellnessScore ? `${analytics.wellnessScore}%` : '—'}</p>
          </div>
        </div>
      </div>

      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
        {/* Mood Input Form */}
        <div className="card-glass p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-4">How are you feeling today?</label>
              <div className="grid grid-cols-3 gap-2">
                {moods.map((mood) => (
                  <button
                    key={mood.key}
                    type="button"
                    onClick={() => setSelectedMood(mood.key)}
                    className={`p-3 rounded-lg transition text-center ${
                      selectedMood === mood.key
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="text-2xl">{mood.emoji}</div>
                    <div className="text-xs mt-1">{mood.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Add a note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What triggered this feeling?"
                rows="3"
                className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {message && <p className="text-sm text-green-400">{message}</p>}

            <button
              type="submit"
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
            >
              Save Mood Entry
            </button>
          </form>
        </div>

        {/* Statistics */}
        <div className="card-glass p-6 space-y-4">
          <h3 className="font-semibold">Mood Distribution</h3>
          <div className="space-y-3">
            {getMoodStats().length > 0 ? (
              getMoodStats().map((stat) => {
                const moodData = moods.find((m) => m.key === stat.mood)
                return (
                  <div key={stat.mood} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">
                        {moodData?.emoji} {moodData?.label}
                      </span>
                      <span className="text-blue-400">{stat.percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-slate-400 text-sm">No mood data yet. Start tracking to see your trends!</p>
            )}
          </div>
        </div>
      </section>

      {/* Recent History */}
      <div className="card-glass p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Mood Entries</h3>
        {history.length > 0 ? (
          <div className="grid gap-3">
            {history.slice(0, 10).map((entry, idx) => {
              const moodData = moods.find((m) => m.key === entry.mood)
              return (
                <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-slate-800 text-sm">
                  <div className="space-y-1 flex-1">
                    <p className="text-slate-200">
                      {moodData?.emoji} {moodData?.label}
                      <span className="text-slate-400 ml-2">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </p>
                    {entry.note && <p className="text-slate-400">{entry.note}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No mood entries yet.</p>
        )}
      </div>
    </div>
  )
}
        <div className="card-glass p-6 space-y-5">
          <div>
            <h3 className="text-2xl font-semibold">How are you feeling now?</h3>
            <p className="text-slate-400 mt-2">Pick an emoji and write a small note about your experience.</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {moods.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedMood(item.key)}
                className={`rounded-3xl border p-4 text-2xl transition ${selectedMood === item.key ? 'border-teal-300 bg-teal-500/10' : 'border-white/10 bg-white/5'}`}
              >
                <span>{item.emoji}</span>
                <p className="text-xs mt-2 text-slate-300">{item.label}</p>
              </button>
            ))}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <textarea
              rows="4"
              className="w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Write a short reflection or gratitude note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="w-full rounded-3xl bg-gradient-to-r from-teal-400 to-blue-500 py-3 text-slate-950 font-semibold">Save mood</button>
          </form>
          {message && <p className="text-teal-200">{message}</p>}
        </div>
        <div className="card-glass p-6 space-y-4">
          <div>
            <h3 className="text-2xl font-semibold">Mood history</h3>
            <p className="text-slate-400 mt-2">Your weekly feelings, visualized for self-awareness.</p>
          </div>
          <div className="space-y-3">
            {history.slice(0, 8).map((entry) => (
              <div key={entry._id} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-100">{entry.mood}</span>
                  <span className="text-sm text-slate-400">{new Date(entry.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-2 text-slate-300">{entry.note || 'No note added.'}</p>
              </div>
            ))}
            {history.length === 0 && <p className="text-slate-400">Track your mood daily to see trends.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}
