import { useEffect, useState } from 'react'
import { getWellness } from '../services/api'

const practices = [
  { title: 'Breathing exercise', subtitle: '4-7-8 breath', action: 'Inhale for 4 seconds, hold for 7 seconds, exhale slowly for 8 seconds.' },
  { title: 'Gratitude journal', subtitle: 'Write one thing', action: 'List one thing you are thankful for today.' },
  { title: 'Sleep wellness', subtitle: 'Wind-down tip', action: 'Reduce screen time 30 minutes before bed for better rest.' }
]

export default function WellnessTools() {
  const [wellness, setWellness] = useState({ quote: '', affirmation: '', tips: [] })

  useEffect(() => {
    getWellness().then((res) => setWellness(res.data || wellness))
  }, [])

  return (
    <div className="space-y-6">
      <div className="card-glass p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Wellness tools</p>
        <h2 className="text-3xl font-semibold">Calming practices and self-care guides</h2>
        <p className="mt-3 text-slate-300">Explore guided breathing, affirmations, and positive habits designed to support your mental wellness.</p>
      </div>
      <section className="grid gap-5 lg:grid-cols-3">
        {practices.map((item) => (
          <div key={item.title} className="card-glass p-6">
            <p className="text-lg font-semibold">{item.title}</p>
            <p className="mt-2 text-slate-400">{item.subtitle}</p>
            <p className="mt-4 text-slate-300">{item.action}</p>
          </div>
        ))}
      </section>
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
