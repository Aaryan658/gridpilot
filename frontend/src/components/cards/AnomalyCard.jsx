import StatusBadge from '../common/StatusBadge'

export default function AnomalyCard({ title = 'No active national anomalies', severity = 'STABLE', message }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{title}</div>
        <StatusBadge label={severity} />
      </div>
      <p className="mt-2 text-xs text-[var(--text-secondary)]">
        {message || 'All monitored regions are within expected forecast bands.'}
      </p>
    </div>
  )
}
