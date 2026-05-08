import Header from '../components/layout/Header'
import ForecastChart from '../components/charts/ForecastChart'
import SignalBridge from '../components/cards/SignalBridge'
import AnomalyCard from '../components/cards/AnomalyCard'
import StatusBadge from '../components/common/StatusBadge'
import { useDashboardData } from '../hooks/useDashboardData'

// Region baseline demand in GW (fallback when API has no forecast)
const REGION_BASELINE_GW = { NR: 68, SR: 52, ER: 26, WR: 65, NER: 4 }

export default function NationalGrid() {
  const { data, demoMode } = useDashboardData()
  const national = data.national || {}
  const forecastRegions = national.forecast_all_regions || {}
  const gridScore = national.grid_stability_score ?? 90.11
  const recommendation =
    national.optimization_snapshot?.recommendation ||
    'Shift 2,000 MW across national corridors to balance SR deficit. Clean window 02:00–05:00 optimal for EV fleet charging.'

  const forecast = mergeForecast(forecastRegions)

  return (
    <div>
      <Header title="FirstFlight" subtitle="National Grid Intelligence · Backend signals powering GridPilot" demoMode={demoMode} />

      {/* 5-region demand tiles */}
      <div className="mb-4 grid grid-cols-5 gap-3 max-xl:grid-cols-2">
        {['NR', 'SR', 'ER', 'WR', 'NER'].map((region, index) => {
          const firstRow = forecastRegions[region]?.[0]
          const mw = firstRow?.predicted_mw
          const gw = mw ? Math.round(mw / 1000) : REGION_BASELINE_GW[region]
          return (
            <div key={region} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{region}</div>
                <StatusBadge label={index === 0 ? 'NEUTRAL' : 'STABLE'} />
              </div>
              <div className="mt-4 text-2xl font-semibold">{gw.toLocaleString('en-IN')} GW</div>
              <div className="mt-1 text-xs text-[var(--text-secondary)]">
                Stability {gridScore}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-[60fr_40fr] gap-4 max-xl:grid-cols-1">
        <div className="space-y-4">
          <div className="glass-card p-5">
            <div className="mb-4 text-base font-semibold">5-region demand forecast</div>
            <ForecastChart data={forecast} />
          </div>

          {/* Signal Bridge with real rationale */}
          <SignalBridge
            signal={{
              ...data.signal_bridge,
              recommended_action: data.signal_bridge?.recommended_action || 'CHARGE_SCHEDULED',
              rationale: recommendation,
            }}
          />
        </div>

        <div className="space-y-4">
          {/* India Grid map (static visual) */}
          <div className="glass-card relative h-[300px] overflow-hidden p-5">
            <div className="text-base font-semibold">India Grid Map</div>
            <div className="absolute left-[42%] top-[38%] h-4 w-4 rounded-full bg-[#f9ca24] shadow-[0_0_0_10px_rgba(249,202,36,0.10),0_0_0_22px_rgba(249,202,36,0.06)]" />
            <div className="absolute left-[46%] top-[44%] text-xs text-[#f9ca24]">EV Fleet Depot</div>
            {['NR', 'WR', 'SR', 'ER', 'NER'].map((r, i) => (
              <div
                key={r}
                className="absolute rounded-md border border-[#2d3f55] bg-[#111827] px-2 py-1 text-xs"
                style={{ left: `${20 + i * 13}%`, top: `${22 + (i % 3) * 18}%` }}
              >
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
  if (!base.length) return []
  return base.slice(0, 24).map((row, index) => ({
    timestamp:
      typeof row.timestamp === 'string'
        ? row.timestamp.slice(11, 16) || row.timestamp
        : String(index),
    NR:  all.NR?.[index]?.predicted_mw  ?? 68000,
    SR:  all.SR?.[index]?.predicted_mw  ?? 52000,
    WR:  all.WR?.[index]?.predicted_mw  ?? 65000,
    ER:  all.ER?.[index]?.predicted_mw  ?? 26000,
    NER: all.NER?.[index]?.predicted_mw ?? 4200,
  }))
}
