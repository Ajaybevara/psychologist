import { useEffect, useRef, useState } from 'react'
import { sendChat, getChatHistory, getNextQuestion, getWellnessSuggestion } from '../services/api'
import TypingDots from './TypingDots'
import { PaperAirplaneIcon, SpeakerWaveIcon, MicrophoneIcon } from '@heroicons/react/24/solid'

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

const moods = [
  { key: 'sad', emoji: '😢', label: 'Sad' },
  { key: 'anxious', emoji: '😟', label: 'Anxious' },
  { key: 'angry', emoji: '😠', label: 'Angry' },
  { key: 'lonely', emoji: '😔', label: 'Lonely' },
  { key: 'stressed', emoji: '😰', label: 'Stressed' },
  { key: 'happy', emoji: '😊', label: 'Happy' },
]

const wellnessOptions = [
  { key: 'breathing', emoji: '🫁', label: 'Breathing Exercises', description: 'Calm techniques for anxiety' },
  { key: 'music', emoji: '🎵', label: 'Calming Music', description: 'Soothing playlists' },
  { key: 'journal', emoji: '📝', label: 'Journaling Prompts', description: 'Write your feelings' },
  { key: 'motivation', emoji: '💪', label: 'Motivation', description: 'Inspiring messages' },
  { key: 'meditation', emoji: '🧘', label: 'Meditation', description: 'Mindfulness guides' },
  { key: 'grounding', emoji: '🌱', label: 'Grounding', description: 'Reality check techniques' }
]

export default function ChatPanel({ language }) {
  const [messages, setMessages] = useState([{ role: 'assistant', text: getInitialMessage(language), sentiment: 'neutral' }])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [mood, setMood] = useState('neutral')
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voices, setVoices] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const [showMoodSelection, setShowMoodSelection] = useState(true)
  const [showWellnessOptions, setShowWellnessOptions] = useState(false)
  const messageEndRef = useRef(null)
  const recognitionRef = useRef(null)

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
    const fetchChatHistory = async () => {
      try {
        const { data } = await getChatHistory()
        const historyData = data.history || []
        setChatHistory(historyData)
        if (historyData.length > 0) {
          const historicalMessages = [{ role: 'assistant', text: getInitialMessage(language), sentiment: 'neutral' }]
          const reversedHistory = [...historyData].reverse()
          reversedHistory.forEach(chat => {
            historicalMessages.push({ role: 'user', text: chat.message, sentiment: 'neutral' })
            historicalMessages.push({ role: 'assistant', text: chat.reply, sentiment: chat.sentiment })
          })
          setMessages(historicalMessages)
        }
      } catch (error) {
        console.error('Failed to fetch chat history:', error)
      }
    }
    fetchChatHistory()
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

  const handleMoodSelection = async (selectedMood) => {
    setMood(selectedMood)
    setShowMoodSelection(false)

    // Add mood selection message
    const moodLabel = moods.find(m => m.key === selectedMood)?.label || selectedMood
    setMessages(prev => [...prev, {
      role: 'user',
      text: `I'm feeling ${moodLabel}`,
      sentiment: 'neutral'
    }])

    // Get next question from psychology database
    try {
      setIsTyping(true)
      const { data } = await getNextQuestion({ mood: selectedMood, type: 'follow_up' })
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: data.question,
        sentiment: 'neutral'
      }])
    } catch (error) {
      console.error('Error getting next question:', error)
    } finally {
      setIsTyping(false)
    }
  }

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
      
      // Auto-speak the AI response
      speakMessageText(data.reply)
      
      // Refresh chat history after sending a message
      const historyResponse = await getChatHistory()
      setChatHistory(historyResponse.data.history || [])

      // Show wellness options after a few messages
      if (messages.length > 6 && !showWellnessOptions) {
        setTimeout(() => {
          setShowWellnessOptions(true)
        }, 2000)
      }
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

  const speakMessageText = (text) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
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

  const speakLastMessage = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'assistant') return
    speakMessageText(lastMessage.text)
  }

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      
      recognition.onstart = () => setIsListening(true)
      
      recognition.onresult = (event) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
           setInput((prev) => prev + (prev ? ' ' : '') + finalTranscript)
        }
      }
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
      }
      
      recognition.onend = () => setIsListening(false)
      
      recognitionRef.current = recognition
    }
  }, [])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : language === 'te' ? 'te-IN' : 'en-US'
        recognitionRef.current.start()
      } else {
        alert("Speech recognition is not supported in your browser.")
      }
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Mood Selection Modal */}
      {showMoodSelection && (
        <div className="card-glass p-8 space-y-6">
          <div>
            <h2 className="text-3xl font-bold">How are you feeling today?</h2>
            <p className="text-slate-300 mt-2">Select your current emotional state to get personalized support</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {moods.map((m) => (
              <button
                key={m.key}
                onClick={() => handleMoodSelection(m.key)}
                className="p-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 transition space-y-2 group"
              >
                <div className="text-3xl group-hover:scale-125 transition-transform">{m.emoji}</div>
                <p className="text-sm font-medium text-slate-200">{m.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Header */}
      {!showMoodSelection && (
        <div className="card-glass p-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-teal-300 to-blue-300 bg-clip-text text-transparent">AI Wellness Chat</h2>
          <p className="text-slate-300 mt-2">Talk to MindCare - your compassionate AI support companion</p>
          <p className="text-sm text-slate-400 mt-2">Current mood: <span className="font-semibold capitalize text-blue-400">{mood}</span></p>
        </div>
      )}

      {!showMoodSelection && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 flex-1 overflow-hidden">
          {/* Chat Area */}
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

            {/* Input Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Share what's on your mind..."
                  className="flex-1 rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`rounded-3xl px-4 py-3 font-bold transition-all ${
                    isListening
                      ? 'bg-red-500/30 border border-red-400 text-red-200 animate-pulse'
                      : 'bg-white/10 border border-white/10 text-slate-100 hover:bg-white/20'
                  }`}
                  title="Voice Input"
                >
                  <MicrophoneIcon className="h-5 w-5" />
                </button>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="rounded-3xl bg-gradient-to-r from-teal-400 to-blue-500 px-4 py-3 text-slate-950 font-bold hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  title="Send Message"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={speakLastMessage}
                  className={`rounded-3xl px-4 py-3 font-bold transition-all ${
                    isSpeaking
                      ? 'bg-teal-500/30 border border-teal-400 text-teal-200'
                      : 'bg-white/10 border border-white/10 text-slate-100 hover:bg-white/20'
                  }`}
                  title="Read Last Message"
                >
                  <SpeakerWaveIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 min-h-0 flex flex-col overflow-y-auto">
            {/* Chat History */}
            <div className="card-glass p-5 rounded-3xl">
              <h3 className="font-bold text-lg mb-3">💬 Chat History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {chatHistory.length > 0 ? (
                  chatHistory.slice(0, 8).map((chat, idx) => (
                    <div key={idx} className="bg-slate-800/50 p-2 rounded-lg text-xs">
                      <p className="text-slate-400 mb-1">{new Date(chat.createdAt).toLocaleDateString()}</p>
                      <p className="text-slate-300 truncate">
                        <strong>You:</strong> {chat.message.substring(0, 40)}...
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs">Start a conversation</p>
                )}
              </div>
            </div>

            {/* Wellness Suggestions */}
            {showWellnessOptions && (
              <div className="card-glass p-5 rounded-3xl flex-1 min-h-0 flex flex-col">
                <h3 className="font-bold text-lg mb-3">✨ Wellness Options</h3>
                <div className="space-y-2 overflow-y-auto text-xs">
                  {wellnessOptions.map((option) => (
                    <div key={option.key} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 cursor-pointer hover:border-blue-500 hover:bg-slate-700 transition">
                      <p className="font-medium text-slate-200">
                        {option.emoji} {option.label}
                      </p>
                      <p className="text-slate-400 mt-1">{option.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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
                type="button"
                onClick={toggleListening}
                className={`rounded-3xl px-4 py-3 font-bold transition-all ${
                  isListening
                    ? 'bg-red-500/30 border border-red-400 text-red-200 animate-pulse'
                    : 'bg-white/10 border border-white/10 text-slate-100 hover:bg-white/20'
                }`}
              >
                <MicrophoneIcon className="h-5 w-5" />
              </button>
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
                    ? 'bg-teal-500/30 border border-teal-400 text-teal-200'
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
            <h3 className="font-bold text-lg mb-3">� Chat History</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {chatHistory.length > 0 ? (
                chatHistory.slice(0, 10).map((chat, idx) => (
                  <div key={idx} className="bg-slate-800/50 p-3 rounded-xl">
                    <p className="text-xs text-slate-400 mb-1">
                      {new Date(chat.createdAt).toLocaleDateString()} - {chat.mood}
                    </p>
                    <p className="text-sm text-slate-300 truncate">
                      <strong>You:</strong> {chat.message}
                    </p>
                    <p className="text-sm text-slate-300 truncate mt-1">
                      <strong>MindCare:</strong> {chat.reply}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No chat history yet.</p>
              )}
            </div>
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
