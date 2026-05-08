import { Leaf, TrendingDown, TrendingUp } from 'lucide-react'
import Header from '../components/layout/Header'
import KPICard from '../components/cards/KPICard'
import MainLoadChart from '../components/charts/MainLoadChart'
import CarbonStrip from '../components/charts/CarbonStrip'
import FleetTable from '../components/tables/FleetTable'
import TransformerGauge from '../components/charts/TransformerGauge'
import ActionBanner from '../components/cards/ActionBanner'
import SkeletonLoader from '../components/common/SkeletonLoader'
import { useDashboardData } from '../hooks/useDashboardData'

export default function DepotDashboard() {
  const { data, loading, demoMode } = useDashboardData()
  const depot = data.depot || {}
  const comparison = depot.schedule_summary?.comparison || {}
  const status = depot.status || {}
  const carbonSignal = depot.carbon_signal || {}

  // ── KPI values ────────────────────────────────────────────────────────────
  const peakReductionPct = comparison.peak_reduction_pct ?? 63.2
  const unmanagedPeakKw  = comparison.unmanaged_peak_kw  ?? 4100
  const managedPeakKw    = comparison.scheduled_peak_kw  ?? 1508.94
  const unmanagedCarbonKg = comparison.unmanaged_carbon_kg ?? 20049
  const scheduledCarbonKg = comparison.scheduled_carbon_kg ?? (20049 - 773.73)
  const carbonSavedKg    = unmanagedCarbonKg - scheduledCarbonKg  // 773.73
  const carbonReductPct  = comparison.carbon_reduction_pct ?? 18.3
  const dvvnlMonthly     = comparison.dvvnl_monthly_saving_inr ?? 906871
  const dailySaving      = dvvnlMonthly / 30 // ₹30,229

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 w-1/3 animate-pulse rounded-lg bg-white/5" />
        <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-1">
          {[1, 2, 3].map((i) => (
            <SkeletonLoader key={i} className="h-44" />
          ))}
        </div>
        <SkeletonLoader className="h-[460px]" />
        <div className="grid grid-cols-2 gap-4">
          <SkeletonLoader className="h-96" />
          <SkeletonLoader className="h-96" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Depot Dashboard" subtitle="Corporate EV Fleet Depot, Gurugram" demoMode={demoMode} />
      {demoMode && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-500">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
          Demo Mode · Local Simulation
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-1">
        <KPICard
          icon={TrendingDown}
          accent="#4ecdc4"
          value={peakReductionPct}
          unit="%"
          label="Peak Load Reduced"
          sub={`${unmanagedPeakKw.toLocaleString('en-IN')} → ${managedPeakKw.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kW`}
          index={0}
        />
        <KPICard
          icon={Leaf}
          accent="#00d4aa"
          value={Math.round(carbonSavedKg)}
          unit=" kg"
          label="CO₂ Saved Tonight"
          sub={`${carbonReductPct.toFixed(1)}% footprint reduction`}
          index={1}
        />
        <KPICard
          icon={TrendingUp}
          accent="#f9ca24"
          value={Math.round(dailySaving)}
          prefix="₹"
          label="Saved Today"
          sub={`₹${(dvvnlMonthly / 100000).toFixed(2)} lakh/month potential`}
          index={2}
        />
      </div>

      {/* ── Main Load Chart ── */}
      <div className="mt-4">
        <MainLoadChart
          data={data.loadProfile}
          unmanagedPeak={unmanagedPeakKw}
          managedPeak={managedPeakKw}
        />
      </div>

      {/* ── Carbon Strip ── */}
      <div className="mt-4">
        <CarbonStrip hours={data.carbonHours} />
      </div>

      {/* ── Fleet Table + Status Panel ── */}
      <div className="mt-4 grid grid-cols-[55fr_45fr] gap-4 max-2xl:grid-cols-1">
        <FleetTable rows={data.fleetRows} />
        <div className="glass-card space-y-4 p-5">
          <TransformerGauge value={status.transformer_loading_pct ?? 51} />
          <div className="rounded-xl border border-[#f39c1280] bg-[#f39c1226] p-5 text-center">
            <div className="text-4xl font-semibold">
              {carbonSignal.carbon_intensity_now ?? status.carbon_intensity_now ?? 0.84}
            </div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">kg CO₂/kWh</div>
            <div className="mt-3 text-xs text-[var(--text-muted)]">Haryana NCR Grid · CEA 2022-23</div>
          </div>
          <ActionBanner action={carbonSignal.ev_action_now ?? status.ev_action ?? 'CHARGE_SCHEDULED'} />
          <div className="rounded-xl border border-[#00d4aa66] bg-[#00d4aa1f] p-4 text-sm text-[#00d4aa]">
            V2G: {depot.v2g_status?.available_kw ?? 400} kW available | ₹
            {Math.round((depot.v2g_status?.monthly_dvvnl_saving_inr ?? 155556) / 30).toLocaleString('en-IN')} daily value
          </div>
        </div>
      </div>
    </div>
  )
}
