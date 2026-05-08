import Header from '../components/layout/Header'
import ForecastChart from '../components/charts/ForecastChart'
import SignalBridge from '../components/cards/SignalBridge'
import AnomalyCard from '../components/cards/AnomalyCard'
import StatusBadge from '../components/common/StatusBadge'
import { useDashboardData } from '../hooks/useDashboardData'

export default function NationalGrid() {
  const { data, demoMode } = useDashboardData()
  const forecast = mergeForecast(data.national?.forecast_all_regions || data.national)
  return (
    <div>
      <Header title="FirstFlight" subtitle="National Grid Intelligence · Backend signals powering GridPilot" demoMode={demoMode} />
      <div className="mb-4 grid grid-cols-5 gap-3 max-xl:grid-cols-2">
        {['NR', 'SR', 'ER', 'WR', 'NER'].map((region, index) => (
          <div key={region} className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{region}</div>
              <StatusBadge label={index === 0 ? 'NEUTRAL' : 'STABLE'} />
            </div>
            <div className="mt-4 text-2xl font-semibold">{(data.national?.forecast_all_regions?.[region]?.[0]?.predicted_mw ? Math.round(data.national.forecast_all_regions[region][0].predicted_mw / 1000) : (68 - index * 7)).toLocaleString('en-IN')} GW</div>
            <div className="mt-1 text-xs text-[var(--text-secondary)]">Score {data.national?.grid_stability_score || 91.4}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-[60fr_40fr] gap-4 max-xl:grid-cols-1">
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="mb-4 text-base font-semibold">5-region demand forecast</div>
            <ForecastChart data={forecast} />
          </div>
          <SignalBridge signal={data.signal_bridge} />
        </div>
        <div className="space-y-4">
          <div className="glass-card relative h-[300px] overflow-hidden p-5">
            <div className="text-base font-semibold">India Grid Map</div>
            <div className="absolute left-[42%] top-[38%] h-4 w-4 rounded-full bg-[#f9ca24] shadow-[0_0_0_10px_rgba(249,202,36,0.10),0_0_0_22px_rgba(249,202,36,0.06)]" />
            <div className="absolute left-[46%] top-[44%] text-xs text-[#f9ca24]">EV Fleet Depot</div>
            {['NR', 'WR', 'SR', 'ER', 'NER'].map((r, i) => (
              <div key={r} className="absolute rounded-md border border-[#2d3f55] bg-[#111827] px-2 py-1 text-xs" style={{ left: `${20 + i * 13}%`, top: `${22 + (i % 3) * 18}%` }}>
                {r}
              </div>
            ))}
          </div>
          <AnomalyCard />
        </div>
      </div>
    </div>
  )
}

function mergeForecast(all) {
  const base = all?.NR || []
  return base.slice(0, 24).map((row, index) => ({
    timestamp: typeof row.timestamp === 'string' ? row.timestamp.slice(11, 16) || row.timestamp : String(index),
    NR: all.NR?.[index]?.predicted_mw || 68000,
    SR: all.SR?.[index]?.predicted_mw || 52000,
    WR: all.WR?.[index]?.predicted_mw || 65000,
    ER: all.ER?.[index]?.predicted_mw || 26000,
    NER: all.NER?.[index]?.predicted_mw || 4200,
  }))
}
