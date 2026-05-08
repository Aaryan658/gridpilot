import { motion } from 'framer-motion'
import CountUpNumber from '../common/CountUpNumber'

export default function KPICard({ icon: Icon, accent, value, prefix, unit, label, sub, index = 0 }) {
  return (
    <motion.div
      className="glass-card glass-card-hover relative overflow-hidden p-6"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
    >
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <div className="mb-7 flex items-center justify-between">
        <Icon size={20} style={{ color: accent }} />
        <span className="text-[11px] text-[var(--text-muted)]">LIVE</span>
      </div>
      <div className="text-4xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        <CountUpNumber value={value} prefix={prefix} unit={unit} />
      </div>
      <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">{label}</div>
      <div className="mt-1 text-xs text-[var(--text-secondary)]">{sub}</div>
    </motion.div>
  )
}
