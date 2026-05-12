import { useEffect, useState } from 'react'
import { submitMood, getMoodHistory } from '../services/api'

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
  const [message, setMessage] = useState('')

  useEffect(() => {
    getMoodHistory().then((res) => setHistory(res.data.history || []))
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      await submitMood({ mood: selectedMood, note })
      setMessage('Mood entry saved.')
      setNote('')
      setHistory(await getMoodHistory().then((res) => res.data.history || []))
    } catch (error) {
      setMessage('Unable to save mood right now.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="card-glass p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Mood Tracker</p>
            <h2 className="text-3xl font-semibold">Daily emotional check-in</h2>
            <p className="mt-3 text-slate-300">Choose how you feel and review your mood history over time.</p>
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-4 text-slate-300">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Wellness score</p>
            <p className="mt-2 text-xl font-semibold">{history.length > 0 ? `${history.length * 7}%` : '—'}</p>
          </div>
        </div>
      </div>
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
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
