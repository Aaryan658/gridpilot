import { motion } from 'framer-motion'
import StatusBadge from '../common/StatusBadge'

const zoneClass = {
  A: 'border-[#7c5cbf66] bg-[#7c5cbf22] text-[#b49cff]',
  B: 'border-[#00d4aa66] bg-[#00d4aa22] text-[#00d4aa]',
  C: 'border-[#f9ca2466] bg-[#f9ca2422] text-[#f9ca24]',
  D: 'border-[#27ae6066] bg-[#27ae6022] text-[#27ae60]',
}

export default function FleetTable({ rows }) {
  return (
    <div className="glass-card h-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] p-5">
        <div className="text-base font-semibold">Fleet Status</div>
        <StatusBadge label="READY" />
      </div>
      <div className="grid grid-cols-[64px_1fr_72px_72px_72px_88px] bg-[#111827] px-4 py-3 text-xs text-[var(--text-secondary)]">
        <div>Zone</div>
        <div>Vehicle</div>
        <div>Arrival</div>
        <div>Ready By</div>
        <div>Energy</div>
        <div>Status</div>
      </div>
      <div className="max-h-[560px] overflow-auto">
        {rows.slice(0, 120).map((row, index) => (
          <motion.div
            key={row.vehicle_id}
            className="grid h-11 grid-cols-[64px_1fr_72px_72px_72px_88px] items-center border-b border-[#2d3f5580] px-4 text-xs hover:bg-[#7c5cbf0d]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index, 12) * 0.025 }}
          >
            <div>
              <span className={`rounded-md border px-2 py-1 ${zoneClass[row.zone]}`}>{row.zone}</span>
            </div>
            <div className="font-medium text-[var(--text-primary)]">{row.vehicle_id}</div>
            <div className="text-[var(--text-secondary)]">{row.arrival}</div>
            <div className="text-[var(--text-secondary)]">{row.ready_at || row.deadline}</div>
            <div>
              <div className="h-1 w-[60px] rounded bg-[#2d3f55]">
                <motion.div className="h-full rounded bg-[#4ecdc4]" initial={{ width: 0 }} animate={{ width: `${row.soc || 80}%` }} />
              </div>
            </div>
            <div>
              <StatusBadge label={row.status || 'SCHEDULED'} pulse={row.status === 'CHARGING'} />
            </div>
          </motion.div>
        ))}
      </div>
      <div className="border-t border-[var(--border-primary)] p-4 text-sm text-[#4ecdc4]">500 vehicles · All ready by 07:00</div>
    </div>
  )
}
