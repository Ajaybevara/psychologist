import { MicrophoneIcon } from '@heroicons/react/24/outline'

export default function VoiceInput({ onTranscript }) {
  const handleStart = async () => {
    const { webkitSpeechRecognition } = window
    const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onTranscript(transcript)
    }
    recognition.start()
  }

  return (
    <button type="button" onClick={handleStart} className="rounded-3xl bg-slate-900/80 px-4 py-3 text-slate-100 hover:bg-slate-900 transition flex items-center justify-center gap-2">
      <MicrophoneIcon className="h-5 w-5" />
      Voice
    </button>
  )
}
