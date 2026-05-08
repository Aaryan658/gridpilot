import { motion } from 'framer-motion'

export default function SignalBridge({ signal }) {
  return (
    <motion.div
      className="glass-card border-[#00d4aa66] p-5 shadow-[0_0_20px_rgba(0,212,170,0.10)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-sm font-semibold text-[#00d4aa]">Signal to Corporate EV Depot, Gurugram</div>
      <div className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
        {signal?.recommended_action || signal?.ev_action_now || 'CHARGE_SCHEDULED'}
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {signal?.rationale || 'FirstFlight routes national grid intelligence into GridPilot depot charging decisions.'}
      </p>
    </motion.div>
  )
}
