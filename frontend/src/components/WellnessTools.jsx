import { useEffect, useState } from 'react'
import { getWellness, getBreathingExercises, completeBreathingExercise, getBreathingHistory } from '../services/api'

const practices = [
  { title: 'Breathing exercise', subtitle: '4-7-8 breath', action: 'Inhale for 4 seconds, hold for 7 seconds, exhale slowly for 8 seconds.' },
  { title: 'Gratitude journal', subtitle: 'Write one thing', action: 'List one thing you are thankful for today.' },
  { title: 'Sleep wellness', subtitle: 'Wind-down tip', action: 'Reduce screen time 30 minutes before bed for better rest.' }
]

export default function WellnessTools() {
  const [wellness, setWellness] = useState({ quote: '', affirmation: '', tips: [] })
  const [exercises, setExercises] = useState([])
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [isBreathing, setIsBreathing] = useState(false)
  const [breathingTime, setBreathingTime] = useState(0)
  const [breathingHistory, setBreathingHistory] = useState([])

  useEffect(() => {
    getWellness().then((res) => setWellness(res.data || wellness))
    loadExercises()
    loadBreathingHistory()
  }, [])

  const loadExercises = async () => {
    try {
      const { data } = await getBreathingExercises()
      setExercises(data.exercises || [])
    } catch (error) {
      console.error('Failed to load exercises:', error)
    }
  }

  const loadBreathingHistory = async () => {
    try {
      const { data } = await getBreathingHistory()
      setBreathingHistory(data.history || [])
    } catch (error) {
      console.error('Failed to load breathing history:', error)
    }
  }

  const startBreathingExercise = (exercise) => {
    setSelectedExercise(exercise)
    setIsBreathing(true)
    setBreathingTime(0)

    // Simple timer for breathing exercise (5 minutes = 300 seconds)
    const interval = setInterval(() => {
      setBreathingTime((prev) => prev + 1)
    }, 1000)

    // Auto-stop after 5 minutes
    const timeout = setTimeout(() => {
      clearInterval(interval)
      completeExercise(exercise.name)
    }, 300000) // 5 minutes

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }

  const completeExercise = async (exerciseName) => {
    try {
      await completeBreathingExercise({
        exerciseName,
        duration: breathingTime
      })
      setIsBreathing(false)
      setSelectedExercise(null)
      setBreathingTime(0)
      await loadBreathingHistory()
    } catch (error) {
      console.error('Failed to save exercise:', error)
    }
  }

  const stopBreathing = () => {
    if (selectedExercise) {
      completeExercise(selectedExercise.name)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (isBreathing && selectedExercise) {
    return (
      <div className="space-y-6">
        <div className="card-glass p-8 text-center">
          <h2 className="text-3xl font-semibold mb-6">{selectedExercise.name}</h2>
          
          {/* Breathing Circle Animation */}
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-48">
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"
                style={{
                  animation: 'breathing 8s ease-in-out infinite'
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-900">
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-400">{formatTime(breathingTime)}</p>
                  <p className="text-slate-400 mt-2">Keep breathing</p>
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes breathing {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.1); opacity: 0.5; }
            }
          `}</style>

          <p className="text-slate-300 mb-6">{selectedExercise.description}</p>

          <button
            onClick={stopBreathing}
            className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
          >
            Stop Exercise
          </button>
        </div>

        {/* Steps Display */}
        <div className="card-glass p-6">
          <h3 className="font-semibold mb-4">Steps:</h3>
          <ol className="space-y-3">
            {selectedExercise.steps.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-slate-300">
                <span className="text-blue-400 font-semibold">{idx + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card-glass p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Wellness tools</p>
        <h2 className="text-3xl font-semibold">Calming practices and self-care guides</h2>
        <p className="mt-3 text-slate-300">Explore guided breathing, affirmations, and positive habits designed to support your mental wellness.</p>
      </div>

      {/* Quick Practices */}
      <section className="grid gap-5 lg:grid-cols-3">
        {practices.map((item) => (
          <div key={item.title} className="card-glass p-6">
            <p className="text-lg font-semibold">{item.title}</p>
            <p className="mt-2 text-slate-400">{item.subtitle}</p>
            <p className="mt-4 text-slate-300">{item.action}</p>
          </div>
        ))}
      </section>

      {/* Breathing Exercises */}
      {exercises.length > 0 && (
        <section className="card-glass p-6">
          <h3 className="text-2xl font-semibold mb-6">Guided Breathing Exercises</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {exercises.map((exercise, idx) => (
              <div key={idx} className="bg-slate-800 rounded-lg p-6 space-y-3">
                <h4 className="text-lg font-semibold text-blue-400">{exercise.name}</h4>
                <p className="text-slate-300 text-sm">{exercise.description}</p>
                <ol className="space-y-2 text-sm text-slate-400">
                  {exercise.steps.slice(0, 3).map((step, i) => (
                    <li key={i}>• {step}</li>
                  ))}
                  {exercise.steps.length > 3 && <li>• ... and more</li>}
                </ol>
                <button
                  onClick={() => startBreathingExercise(exercise)}
                  className="w-full mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
                >
                  Start Exercise
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Affirmations and Quotes */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card-glass p-6">
          <h3 className="text-2xl font-semibold">Daily affirmation</h3>
          <p className="mt-4 text-slate-300">{wellness.affirmation || 'I am calm, capable, and connected.'}</p>
        </div>
        <div className="card-glass p-6">
          <h3 className="text-2xl font-semibold">Motivational quote</h3>
          <p className="mt-4 text-slate-300">{wellness.quote || 'A small moment of care can change your whole day.'}</p>
        </div>
      </section>

      {/* Breathing History */}
      {breathingHistory.length > 0 && (
        <section className="card-glass p-6">
          <h3 className="text-2xl font-semibold mb-4">Your Breathing Practice ({breathingHistory.length})</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {breathingHistory.slice(0, 10).map((record, idx) => (
              <div key={idx} className="flex justify-between p-3 bg-slate-800 rounded-lg text-sm">
                <span className="text-slate-300">{record.exerciseName}</span>
                <span className="text-blue-400">{formatTime(record.duration)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Crisis Support */}
      <div className="card-glass p-6">
        <h3 className="text-2xl font-semibold">Crisis support</h3>
        <p className="mt-3 text-slate-300">If you feel overwhelmed, please reach out to a trusted professional or emergency contact.</p>
        <ul className="mt-4 space-y-3 text-slate-200">
          <li>• National helpline: 1800-123-4567</li>
          <li>• Local support: +91 12345 67890</li>
          <li>• If in danger, contact emergency services immediately.</li>
        </ul>
      </div>
    </div>
  )
}
