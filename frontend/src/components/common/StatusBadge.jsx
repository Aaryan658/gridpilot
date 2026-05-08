const styles = {
  STABLE: 'border-[#4ecdc455] bg-[#4ecdc422] text-[#4ecdc4]',
  CLEAN: 'border-[#27ae6055] bg-[#27ae6022] text-[#27ae60]',
  NEUTRAL: 'border-[#f39c1255] bg-[#f39c1222] text-[#f9ca24]',
  DIRTY: 'border-[#c0392b55] bg-[#c0392b22] text-[#e74c3c]',
  READY: 'border-[#4ecdc455] bg-[#4ecdc422] text-[#4ecdc4]',
  CHARGING: 'border-[#00d4aa55] bg-[#00d4aa22] text-[#00d4aa]',
  SCHEDULED: 'border-[#7c5cbf55] bg-[#7c5cbf22] text-[#b49cff]',
  WARNING: 'border-[#f9ca2455] bg-[#f9ca2422] text-[#f9ca24]',
  CRITICAL: 'border-[#e74c3c55] bg-[#e74c3c22] text-[#e74c3c]',
}

export default function StatusBadge({ label, pulse = false }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium leading-none ${
        styles[label] || styles.STABLE
      } ${pulse ? 'animate-pulse' : ''}`}
    >
      {label}
    </span>
  )
}
