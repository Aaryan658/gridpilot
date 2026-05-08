import { motion } from 'framer-motion'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function MainLoadChart({ data }) {
  return (
    <div className="glass-card relative h-[460px] p-5">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-base font-semibold">Depot Load Profile</div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            500 Tata Nexon EVs | Corporate Fleet, Gurugram | DVVNL HT-2 Tariff
          </div>
        </div>
        <div className="rounded-md border border-[#4ecdc455] bg-[#4ecdc422] px-2 py-1 text-xs font-medium text-[#4ecdc4]">
          STABLE
        </div>
      </div>
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, bottom: 5, left: 20 }}>
            <CartesianGrid stroke="#2d3f55" strokeDasharray="3 3" vertical={false} />
            <ReferenceArea x1="20:00" x2="01:00" fill="rgba(231,76,60,0.07)" label={{ value: 'Overload Zone', fill: '#e74c3c', fontSize: 11 }} />
            <ReferenceArea x1="02:00" x2="05:00" fill="rgba(39,174,96,0.05)" label={{ value: 'Clean Window', fill: '#27ae60', fontSize: 11 }} />
            <ReferenceLine y={4000} stroke="#ff6b35" strokeDasharray="6 3" label={{ value: 'Transformer Limit 4,000 kW', position: 'right', fill: '#ff6b35', fontSize: 11 }} />
            <ReferenceLine y={4500} stroke="#f9ca24" strokeDasharray="3 3" label={{ value: 'DVVNL Penalty 4,500 kW', position: 'right', fill: '#f9ca24', fontSize: 11 }} />
            <XAxis dataKey="time" tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={{ stroke: '#2d3f55' }} tickLine={false} domain={['20:00', '08:00']} />
            <YAxis tick={{ fill: '#8892a4', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 5200]} label={{ value: 'Total Load (kW)', angle: -90, position: 'insideLeft', fill: '#8892a4', fontSize: 11 }} />
            <Tooltip content={<LoadTooltip />} />
            <Legend content={<LoadLegend />} />
            <Line name="Without GridPilot" dataKey="unmanaged" stroke="#e74c3c" strokeWidth={2.5} dot={false} animationDuration={2000} strokeLinecap="round" />
            <Line name="With GridPilot" dataKey="managed" stroke="#7c5cbf" strokeWidth={2.5} dot={false} animationDuration={2200} strokeLinecap="round" className="managed-glow" />
            <Line name="Solar Generation" dataKey="solar" stroke="#00d4aa" strokeWidth={1.5} strokeDasharray="5 4" dot={false} animationDuration={1800} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <motion.div className="pointer-events-none absolute left-[68%] top-[102px] text-xs font-semibold text-[#e74c3c]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>
        4,100 kW ⚠
      </motion.div>
      <motion.div className="pointer-events-none absolute left-[42%] top-[244px] text-xs font-semibold text-[#b49cff]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.7 }}>
        1,509 kW ✓
      </motion.div>
    </div>
  )
}

function LoadTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="rounded-lg border border-[var(--border-primary)] bg-[#1e2d40] p-3 text-xs shadow-xl">
      <div className="mb-2 font-semibold text-[var(--text-primary)]">{label} IST</div>
      <div className="space-y-1 text-[var(--text-secondary)]">
        <div>With GridPilot: <span className="text-[var(--color-managed)] font-bold">{row.managed} kW</span></div>
        <div>Without GridPilot: <span className="text-[var(--color-unmanaged)]">{row.unmanaged} kW</span></div>
        <div>Carbon: <span className="text-[var(--text-primary)]">{row.carbon} kg CO2/kWh</span></div>
        <div>Status: <span className={row.status === 'CRITICAL' ? 'text-[var(--color-dirty)]' : 'text-[var(--color-success)]'}>{row.status}</span></div>
      </div>
    </div>
  )
}

function LoadLegend() {
  const items = [
    ['#e74c3c', 'Without GridPilot'],
    ['#7c5cbf', 'With GridPilot'],
    ['#00d4aa', 'Solar Generation'],
  ]
  return (
    <div className="flex justify-end gap-2 pr-8">
      <div className="flex gap-3 rounded-full border border-[var(--border-primary)] bg-[rgba(30,45,64,0.9)] px-3 py-1.5 text-xs">
        {items.map(([color, label]) => (
          <span key={label} className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
