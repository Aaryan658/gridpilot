export default function GanttChart({ rows }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[#11182799] p-4">
      <div className="absolute inset-y-0 left-[42%] w-[25%] bg-[#27ae6014]" />
      <div className="mb-3 grid grid-cols-[80px_1fr] text-xs text-[var(--text-secondary)]">
        <div>Zone</div>
        <div className="flex justify-between">
          {['20:00', '23:00', '02:00', '05:00', '08:00'].map((t) => <span key={t}>{t}</span>)}
        </div>
      </div>
      <div className="space-y-2">
        {['A', 'B', 'C', 'D'].map((zone, index) => (
          <div key={zone} className="grid grid-cols-[80px_1fr] items-center">
            <div className="text-xs text-[var(--text-secondary)]">Zone {zone}</div>
            <div className="h-7 rounded bg-[#0a0e1a99]">
              <div
                className="h-full rounded bg-gradient-to-r from-[#3d2b66] to-[#7c5cbf]"
                style={{ marginLeft: `${30 + index * 3}%`, width: `${42 - index * 2}%` }}
                title={`${rows?.length || 500} vehicles scheduled`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
