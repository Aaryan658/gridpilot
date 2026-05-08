import { motion } from 'framer-motion'

export default function TransformerGauge({ value = 51 }) {
  const clamped = Math.max(0, Math.min(120, value))
  const angle = -90 + (clamped / 120) * 180
  const color = clamped < 70 ? '#4ecdc4' : clamped < 90 ? '#f9ca24' : '#e74c3c'
  return (
    <div className="relative h-44">
      <svg viewBox="0 0 220 130" className="h-full w-full">
        <path d="M30 110 A80 80 0 0 1 190 110" fill="none" stroke="#2d3f55" strokeWidth="14" strokeLinecap="round" />
        <motion.path
          d="M30 110 A80 80 0 0 1 190 110"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped / 120 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
        <motion.line
          x1="110"
          y1="110"
          x2="110"
          y2="42"
          stroke="#e8eaf0"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          style={{ transformOrigin: '110px 110px' }}
        />
        <circle cx="110" cy="110" r="5" fill="#e8eaf0" />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <div className="text-3xl font-semibold">{Math.round(value)}%</div>
        <div className="text-xs text-[var(--text-secondary)]">Transformer Load</div>
      </div>
    </div>
  )
}
