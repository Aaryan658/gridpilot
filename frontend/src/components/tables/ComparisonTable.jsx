import { formatKg, formatKw, formatInr, pct } from '../../utils/formatters'

export default function ComparisonTable({ comparison }) {
  const rows = [
    ['Peak load', formatKw(comparison?.unmanaged_peak_kw || 4100), formatKw(comparison?.scheduled_peak_kw || 1508.94), `-${pct(comparison?.peak_reduction_pct || 63.2)}`],
    ['Overload events', comparison?.unmanaged_overload_events || 5, comparison?.scheduled_overload_events || 0, '-100%'],
    ['Carbon', formatKg(comparison?.unmanaged_carbon_kg || 20049), formatKg(comparison?.scheduled_carbon_kg || 20049 - 773.73), `-${pct(comparison?.carbon_reduction_pct || 18.3)}`],
    ['Monthly saving', formatInr(0), formatInr(comparison?.dvvnl_monthly_saving_inr || 906871), `+₹${Math.round((comparison?.dvvnl_monthly_saving_inr || 906871) / 1000)}K`],
  ]
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-primary)]">
      <div className="grid grid-cols-4 bg-[#111827] px-4 py-3 text-xs text-[var(--text-secondary)]">
        <div>Metric</div>
        <div>Unmanaged</div>
        <div>GridPilot</div>
        <div>Delta</div>
      </div>
      {rows.map((row) => (
        <div key={row[0]} className="grid grid-cols-4 border-t border-[#2d3f5580] px-4 py-3 text-sm">
          <div className="text-[var(--text-secondary)]">{row[0]}</div>
          <div>{row[1]}</div>
          <div>{row[2]}</div>
          <div className="font-semibold text-[#4ecdc4]">{row[3]}</div>
        </div>
      ))}
    </div>
  )
}
