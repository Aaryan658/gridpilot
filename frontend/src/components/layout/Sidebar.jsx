import { motion } from 'framer-motion'
import { Activity, ChevronLeft, ChevronRight, Cpu, Gauge, Map, Play, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useSchedule } from '../../hooks/useSchedule'

const nav = [
  { to: '/', label: 'Depot Dashboard', icon: Gauge },
  { to: '/optimizer', label: 'Schedule Optimizer', icon: SlidersHorizontal },
  { to: '/grid', label: 'National Grid', icon: Map },
  { to: '/command', label: 'Command Center', icon: Activity },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { execute, loading } = useSchedule()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 border-r border-[var(--border-primary)] bg-[rgba(10,14,26,0.9)] backdrop-blur-[20px] transition-[width] duration-300"
      style={{ width: collapsed ? 72 : 260 }}
    >
      <div className="flex h-full flex-col">
        <div className="flex min-h-20 items-start justify-between px-4 py-4">
          <div className={collapsed ? 'hidden' : 'block'}>
            <div className="bg-gradient-to-r from-[#7c5cbf] to-[#00d4aa] bg-clip-text text-[22px] font-bold text-transparent">
              GridPilot
            </div>
            <div className="mt-1 text-[11px] text-[#00d4aa]">Powered by FirstFlight</div>
            <div className="mt-2 text-xs text-[var(--text-secondary)]">Corporate EV Depot</div>
            <div className="text-[11px] text-[var(--text-muted)]">Gurugram, Haryana</div>
          </div>
          <button
            className="rounded-lg border border-[var(--border-primary)] p-2 text-[var(--text-secondary)] hover:bg-[#7c5cbf1a]"
            onClick={() => setCollapsed((value) => !value)}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="relative mt-2 flex-1 space-y-1 px-2">
          {nav.map((item) => {
            const active = location.pathname === item.to
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
                  active
                    ? 'border border-[#7c5cbf33] bg-[#7c5cbf26] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[#7c5cbf1a] hover:text-[var(--text-primary)]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 h-9 w-[3px] -translate-y-1/2 rounded-sm bg-gradient-to-b from-[#7c5cbf] to-[#00d4aa]"
                  />
                )}
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          })}
        </nav>

        <div className={`space-y-4 border-t border-[var(--border-primary)] p-4 ${collapsed ? 'hidden' : ''}`}>
          <Control label="Fleet Size" value="500" />
          <Control label="Solar" value="500 kW" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-secondary)]">V2G</span>
            <span className="relative h-5 w-9 rounded-full bg-[#00d4aa33]">
              <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-[#00d4aa]" />
            </span>
          </div>
          <button onClick={() => execute()} disabled={loading} className="relative flex h-10 w-full items-center justify-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#7c5cbf] to-[#5a3f9e] text-sm font-semibold shadow-[0_4px_16px_rgba(124,92,191,0.4)] active:scale-[0.96] disabled:opacity-70 disabled:cursor-wait">
            <span className="absolute inset-y-0 w-1/2 -skew-x-12 bg-white/10" style={{ animation: 'shimmer 2.4s linear infinite' }} />
            <Play size={15} className={`mr-2 ${loading ? 'animate-pulse' : ''}`} />
            {loading ? 'Solving...' : 'Run Schedule'}
          </button>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full bg-[#4ecdc4]" style={{ animation: 'pulseRing 2s infinite' }} />
            API Connected
          </div>
        </div>

        <div className={`flex items-center gap-3 border-t border-[var(--border-primary)] p-4 ${collapsed ? 'justify-center' : ''}`}>
          <Cpu size={18} className="text-[#00d4aa]" />
          {!collapsed && <span className="text-xs text-[var(--text-secondary)]">Internal engine online</span>}
        </div>
      </div>
    </aside>
  )
}

function Control({ label, value }) {
  return (
    <label className="block">
      <div className="mb-2 flex justify-between text-xs">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="text-[var(--text-primary)]">{value}</span>
      </div>
      <input className="h-1 w-full accent-[#7c5cbf]" type="range" min="0" max="100" defaultValue="80" />
    </label>
  )
}
