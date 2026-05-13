import { useEffect, useState } from 'react'
import { createJournal, getJournalHistory, getJournal } from '../services/api'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid'

const moods = [
  { key: 'happy', emoji: '😊', label: 'Happy' },
  { key: 'calm', emoji: '😌', label: 'Calm' },
  { key: 'stressed', emoji: '😰', label: 'Stressed' },
  { key: 'anxious', emoji: '😟', label: 'Anxious' },
  { key: 'lonely', emoji: '😔', label: 'Lonely' },
  { key: 'motivated', emoji: '💪', label: 'Motivated' }
]

export default function JournalPanel() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedMood, setSelectedMood] = useState('calm')
  const [journals, setJournals] = useState([])
  const [message, setMessage] = useState('')
  const [selectedJournal, setSelectedJournal] = useState(null)
  const [isViewMode, setIsViewMode] = useState(false)

  useEffect(() => {
    fetchJournals()
  }, [])

  const fetchJournals = async () => {
    try {
      const { data } = await getJournalHistory()
      setJournals(data.journals || [])
    } catch (error) {
      console.error('Failed to fetch journals:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      setMessage('Please fill in both title and content.')
      return
    }

    try {
      await createJournal({
        title,
        content,
        mood: selectedMood
      })
      setMessage('Journal entry saved successfully!')
      setTitle('')
      setContent('')
      setSelectedMood('calm')
      await fetchJournals()
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      setMessage('Failed to save journal entry.')
      console.error('Error:', error)
    }
  }

  const handleViewJournal = (journal) => {
    setSelectedJournal(journal)
    setIsViewMode(true)
  }

  const handleCloseView = () => {
    setSelectedJournal(null)
    setIsViewMode(false)
  }

  const getMoodEmoji = (mood) => {
    const moodItem = moods.find((m) => m.key === mood)
    return moodItem ? moodItem.emoji : '😐'
  }

  if (isViewMode && selectedJournal) {
    return (
      <div className="space-y-6">
        <div className="card-glass p-8">
          <button
            onClick={handleCloseView}
            className="mb-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition"
          >
            ← Back to Journal
          </button>
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Journal Entry</p>
              <h2 className="text-3xl font-semibold mt-2">{selectedJournal.title}</h2>
              <p className="mt-2 text-slate-400">
                {new Date(selectedJournal.createdAt).toLocaleDateString()} {getMoodEmoji(selectedJournal.mood)}
              </p>
            </div>
            <div className="card-glass p-6">
              <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{selectedJournal.content}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Write New Entry */}
      <div className="card-glass p-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Daily Journal</p>
          <h2 className="text-3xl font-semibold">Express your thoughts and feelings</h2>
          <p className="mt-3 text-slate-300">Write freely to process emotions and track your emotional journey.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        {/* Write Entry Form */}
        <form onSubmit={handleSubmit} className="card-glass p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your entry a title..."
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">How are you feeling?</label>
            <div className="flex gap-2 flex-wrap">
              {moods.map((mood) => (
                <button
                  key={mood.key}
                  type="button"
                  onClick={() => setSelectedMood(mood.key)}
                  className={`px-4 py-2 rounded-lg transition ${
                    selectedMood === mood.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {mood.emoji} {mood.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Your thoughts</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your thoughts, feelings, and reflections here..."
              rows="8"
              className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
            />
          </div>

          {message && <p className="text-sm text-green-400">{message}</p>}

          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
          >
            Save Entry
          </button>
        </form>

        {/* Recent Entries */}
        <div className="card-glass p-6 h-fit max-h-[600px] overflow-y-auto">
          <h3 className="font-semibold mb-4">Recent Entries ({journals.length})</h3>
          <div className="space-y-3">
            {journals.length === 0 ? (
              <p className="text-slate-400 text-sm">No journal entries yet. Start writing!</p>
            ) : (
              journals.map((journal, idx) => (
                <button
                  key={idx}
                  onClick={() => handleViewJournal(journal)}
                  className="w-full text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition space-y-1 group"
                >
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-slate-200 group-hover:text-blue-400">{journal.title}</p>
                    <span className="text-lg">{getMoodEmoji(journal.mood)}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(journal.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{journal.content.substring(0, 50)}...</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
