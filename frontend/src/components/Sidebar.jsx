import { NavLink } from 'react-router-dom'
import { MoonIcon, SunIcon, ChatBubbleLeftRightIcon, ChartBarIcon, SparklesIcon, ShieldCheckIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

const links = [
  { to: '/', label: 'Dashboard', icon: ChartBarIcon },
  { to: '/chat', label: 'AI Support', icon: ChatBubbleLeftRightIcon },
  { to: '/mood', label: 'Mood Tracker', icon: SparklesIcon },
  { to: '/tools', label: 'Wellness', icon: ShieldCheckIcon },
  { to: '/admin', label: 'Admin', icon: Cog6ToothIcon }
]

export default function Sidebar({ theme, setTheme, user, language, setLanguage, logout }) {
  return (
    <aside className="card-glass p-6 w-full lg:w-80">
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Wellness AI</p>
            <h2 className="text-2xl font-semibold tracking-tight">MindCare Console</h2>
          </div>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 transition"
          >
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <nav className="space-y-2 mb-6">
        {links
          .filter((link) => link.to !== '/admin' || user?.role === 'admin')
          .map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-3xl px-4 py-3 transition ${
                    isActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{link.label}</span>
              </NavLink>
            )
          })}
      </nav>
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 hover:bg-white/10 transition"
      >
        <ArrowRightOnRectangleIcon className="h-5 w-5" />
        Logout
      </button>
      <div className="space-y-4">
        <div className="bg-slate-900/70 rounded-3xl p-4">
          <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400">Profile</h3>
          <p className="mt-3 text-lg font-semibold">{user ? user.name : 'Guest'}</p>
          <p className="text-sm text-slate-400">{user ? user.email : 'Please login to continue'}</p>
        </div>
        <div className="rounded-3xl border border-white/10 p-4 bg-white/5">
          <p className="text-sm text-slate-400 mb-3">Language</p>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm"
          >
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="te">Telugu</option>
          </select>
        </div>
      </div>
    </aside>
  )
}
