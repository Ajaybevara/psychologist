export default function TypingDots() {
  return (
    <div className="flex items-center gap-2 pt-3 text-slate-400">
      <div className="h-3 w-3 rounded-full bg-teal-400 animate-bounce" />
      <div className="h-3 w-3 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
      <div className="h-3 w-3 rounded-full bg-teal-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
    </div>
  )
}
