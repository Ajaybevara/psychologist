import { useEffect, useRef, useState } from 'react'
import { sendChat } from '../services/api'
import TypingDots from './TypingDots'
import { PaperAirplaneIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid'

const languageLabel = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu'
}

const getInitialMessage = (language) => {
  if (language === 'hi') {
    return 'नमस्ते! मैं माइंडकेयर हूँ, आपकी मानसिक भलाई के लिए आपका साथी। मैं आपकी भावनाओं को सुनने के लिए यहाँ हूँ और सरल, प्यार भरे सुझाव दूँगा। आप आज कैसा महसूस कर रहे हैं?'
  }
  if (language === 'te') {
    return 'నమస్కారం! నేను మైండ్‌కేర్. మీ మానసిక ఆరోగ్యం కోసం మీతో ఉన్నాను. నేను మీ భావనలను జాగ్రత్తగా వింటాను మరియు సరళమైన మార్గదర్శకాలను అందిస్తాను. మీరు ఈ రోజు ఎలా అనిపిస్తున్నారు?'
  }
  return 'Hello! I\'m MindCare, your AI wellness companion. I\'m here to listen and support you with empathy, CBT-based guidance, and practical coping strategies. How are you feeling today?'
}

export default function ChatPanel({ language }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: getInitialMessage(language), sentiment: 'neutral' }])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mood, setMood] = useState('neutral')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voices, setVoices] = useState([])
  const messageEndRef = useRef(null)

  useEffect(() => {
    const updateVoices = () => {
      const availableVoices = window.speechSynthesis ? window.speechSynthesis.getVoices() : []
      setVoices(availableVoices)
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      updateVoices()
      window.speechSynthesis.onvoiceschanged = updateVoices
    }
  }, [])

  useEffect(() => {
    if (messages.length === 1 && messages[0].role === 'assistant') {
      setMessages([{ role: 'assistant', text: getInitialMessage(language), sentiment: 'neutral' }])
    }
  }, [language])

  const getVoiceForLanguage = (locale) => {
    const langCode = locale.split('-')[0]
    return (
      voices.find((voice) => voice.lang.toLowerCase().startsWith(langCode)) ||
      voices.find((voice) => voice.lang.toLowerCase().includes('english')) ||
      voices[0] ||
      null
    )
  }

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = { role: 'user', text: input, sentiment: 'neutral' }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    try {
      const { data } = await sendChat({ message: input, mood, language })
      setMessages((prev) => [...prev, { role: 'assistant', text: data.reply, sentiment: data.sentiment }])
    } catch (error) {
      console.error('Chat error:', error)
      const fallbackText = language === 'hi'
        ? 'मैं आपकी मदद करने के लिए यहाँ हूँ। कृपया आराम से साँस लें और फिर से कोशिश करें।'
        : language === 'te'
        ? 'నేను మీకు సహాయం చేయడానికి ఇక్కడున్నాను. దయచేసి నిశ్శబ్దంగా ఊపిరి తీసుకోండి మరియు మళ్లీ ప్రయత్నించండి.'
        : 'I am here to help you. Please take a calm breath and try again.'
      setMessages((prev) => [...prev, { role: 'assistant', text: fallbackText, sentiment: 'neutral' }])
    } finally {
      setIsTyping(false)
    }
  }

  const speakLastMessage = () => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    if (!window.speechSynthesis) {
      alert('Speech synthesis not supported in your browser')
      return
    }

    const utterance = new SpeechSynthesisUtterance(lastMessage.text)
    const locale = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US'
    utterance.lang = locale
    const voice = getVoiceForLanguage(locale)
    if (voice) {
      utterance.voice = voice
    }
    utterance.rate = 0.95
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    setIsSpeaking(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="card-glass p-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-transparent">AI Wellness Chat</h2>
        <p className="text-slate-300 mt-2">Talk to MindCare - your compassionate AI support companion</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 flex-1 overflow-hidden">
        <div className="card-glass p-6 flex flex-col gap-4 min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 rounded-3xl bg-slate-950/40 p-4">
            {messages.map((message, idx) => (
              <div
                key={idx}
                className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-6 py-4 rounded-3xl ${
                    message.role === 'assistant'
                      ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100 border border-slate-700'
                      : 'bg-gradient-to-br from-teal-500 to-blue-500 text-white'
                  }`}
                >
                  <p className="text-sm opacity-75 mb-2 font-semibold">{
                    message.role === 'assistant' ? '🧠 MindCare' : '👤 You'
                  }</p>
                  <p className="leading-relaxed text-base">{message.text}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-4 rounded-3xl border border-slate-700">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <select
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full rounded-3xl border border-white/10 bg-white/10 px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              <option value="neutral">How are you feeling? - Neutral</option>
              <option value="calm">😌 Calm</option>
              <option value="happy">😊 Happy</option>
              <option value="stressed">😰 Stressed</option>
              <option value="anxious">😟 Anxious</option>
              <option value="lonely">😔 Lonely</option>
              <option value="motivated">💪 Motivated</option>
            </select>

            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Share what's on your mind..."
                className="flex-1 rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded-3xl bg-gradient-to-r from-teal-400 to-blue-500 px-4 py-3 text-slate-950 font-bold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={speakLastMessage}
                className={`rounded-3xl px-4 py-3 font-bold transition-all ${
                  isSpeaking
                    ? 'bg-red-500/30 border border-red-400 text-red-200'
                    : 'bg-white/10 border border-white/10 text-slate-100 hover:bg-white/20'
                }`}
              >
                <SpeakerWaveIcon className="h-5 w-5" />
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <div className="card-glass p-5 rounded-3xl">
            <h3 className="font-bold text-lg mb-3">💡 Quick Tips</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>• Be honest about your feelings</li>
              <li>• Take breaks when needed</li>
              <li>• Practice deep breathing</li>
              <li>• Reach out to professionals</li>
            </ul>
          </div>
          <div className="card-glass p-5 rounded-3xl">
            <h3 className="font-bold text-lg mb-3">🧘 I Can Help With</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>✓ Stress & anxiety</li>
              <li>✓ Sleep issues</li>
              <li>✓ Motivation</li>
              <li>✓ Loneliness</li>
              <li>✓ CBT techniques</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
