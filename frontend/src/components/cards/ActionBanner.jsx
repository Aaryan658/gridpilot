import { motion } from 'framer-motion'

const copy = {
  CHARGE_MAX: 'CHARGE NOW - Clean window active',
  CHARGE_SCHEDULED: 'SCHEDULED - Optimizing load',
  MINIMIZE: 'PAUSE - Grid stress detected',
}

const styles = {
  CHARGE_MAX: 'border-[#27ae6080] bg-gradient-to-br from-[#27ae604d] to-[#4ecdc433]',
  CHARGE_SCHEDULED: 'border-[#7c5cbf80] bg-gradient-to-br from-[#7c5cbf4d] to-[#5a3f9e33]',
  MINIMIZE: 'border-[#e74c3c80] bg-gradient-to-br from-[#e74c3c4d] to-[#c0392b33]',
}

export default function ActionBanner({ action = 'CHARGE_SCHEDULED' }) {
  return (
    <motion.div
      key={action}
      className={`flex h-14 items-center justify-center rounded-xl border text-sm font-semibold ${styles[action]}`}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={action === 'MINIMIZE' ? { animation: 'urgentPulse 1.5s ease infinite' } : undefined}
    >
      {copy[action] || copy.CHARGE_SCHEDULED}
    </motion.div>
  )
}
