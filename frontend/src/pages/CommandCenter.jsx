import { motion } from 'framer-motion'
import Particles from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { useCallback } from 'react'
import MainLoadChart from '../components/charts/MainLoadChart'
import KPICard from '../components/cards/KPICard'
import { Leaf, TrendingDown, TrendingUp } from 'lucide-react'
import { useDashboardData } from '../hooks/useDashboardData'

export default function CommandCenter() {
  const { data, loading, demoMode } = useDashboardData()
  const depot = data.depot || {}
  const comparison = depot.schedule_summary?.comparison || {}
  const signalBridge = data.signal_bridge || {}

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine)
  }, [])

  if (loading) return null

  // ── KPI values ─────────────────────────────────────────────────────────
  const peakReductionPct = comparison.peak_reduction_pct ?? 63.2
  const unmanagedPeakKw  = comparison.unmanaged_peak_kw  ?? 4100
  const managedPeakKw    = comparison.scheduled_peak_kw  ?? 1508.94
  const unmanagedCarbonKg = comparison.unmanaged_carbon_kg ?? 20049
  const scheduledCarbonKg = comparison.scheduled_carbon_kg ?? (20049 - 773.73)
  const carbonSavedKg    = unmanagedCarbonKg - scheduledCarbonKg
  const dvvnlMonthly     = comparison.dvvnl_monthly_saving_inr ?? 906871
  const dailySaving      = dvvnlMonthly / 30

  // ── Signal bridge banner ────────────────────────────────────────────────
  const rationale = signalBridge.rationale?.split('.')[0] || 'NCR grid 78% coal'
  const cleanStart = signalBridge.clean_window_next?.start || '02:00'
  const cleanEnd   = signalBridge.clean_window_next?.end   || '05:00'
  const totalEvs   = depot.fleet_summary?.total_evs ?? 500
  const bannerSegments = [
    `${rationale} →`,
    `Clean window ${cleanStart}–${cleanEnd} →`,
    `${totalEvs} EVs shifted →`,
    `${Math.round(carbonSavedKg).toLocaleString('en-IN')} kg CO₂ saved`,
  ]

  return (
    <div className="relative">
      <Particles
        id="command-particles"
        init={particlesInit}
        className="pointer-events-none fixed inset-0 z-0"
        options={{
          particles: {
            number: { value: 36 },
            color: { value: '#7c5cbf' },
            opacity: { value: 0.15 },
            size: { value: { min: 1, max: 2 } },
            move: { enable: true, speed: 0.25 },
          },
          interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
        }}
      />
      <div className="relative z-10">
        {/* ── Signal bridge ticker ── */}
        <div className="glass-card mb-4 flex h-20 items-center justify-center gap-4 border-[#00d4aa33] bg-gradient-to-br from-[#00d4aa26] to-[#7c5cbf26]">
          {bannerSegments.map((text, index) => (
            <motion.span
              key={index}
              className={
                index === 3
                  ? 'font-bold text-[#27ae60]'
                  : index === 1
                  ? 'text-[#00d4aa]'
                  : index === 2
                  ? 'text-[#b49cff]'
                  : 'text-[var(--text-secondary)]'
              }
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.4 }}
            >
              {text}
            </motion.span>
          ))}
        </div>

        <div className="grid grid-cols-[60fr_40fr] gap-4 max-xl:grid-cols-1">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <KPICard
                icon={TrendingDown}
                accent="#4ecdc4"
                value={peakReductionPct}
                unit="%"
                label="Peak Load Reduced"
                sub={`${unmanagedPeakKw.toLocaleString('en-IN')} → ${Math.round(managedPeakKw).toLocaleString('en-IN')} kW`}
              />
              <KPICard
                icon={Leaf}
                accent="#00d4aa"
                value={Math.round(carbonSavedKg)}
                unit=" kg"
                label="CO₂ Saved"
                sub="Clean-window shift"
              />
              <KPICard
                icon={TrendingUp}
                accent="#f9ca24"
                value={Math.round(dailySaving)}
                prefix="₹"
                label="Saved Today"
                sub="DVVNL avoided"
              />
            </div>
            <MainLoadChart
              data={data.loadProfile}
              unmanagedPeak={unmanagedPeakKw}
              managedPeak={managedPeakKw}
            />
          </div>

          {/* ── Decision Timeline ── */}
          <div className="glass-card h-[560px] p-5">
            <div className="text-base font-semibold">Decision Timeline</div>
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  )
}

function Timeline() {
  // Matches the real physics simulation managed rows keypoints
  const events = [
    ['20:00', '500 EVs queued',            '#8892a4'],
    ['20:30', 'Carbon DIRTY — buffer only', '#f9ca24'],
    ['02:00', 'Carbon CLEAN — 1,509 kW ramp', '#27ae60'],
    ['05:00', 'Clean window closing',       '#f9ca24'],
    ['06:30', '500/500 vehicles at 80% SoC', '#4ecdc4'],
    ['07:00', 'Dispatch ready — ₹30K saved', '#27ae60'],
  ]
  return (
    <div className="relative mt-20 h-80">
      <motion.div
        className="absolute left-8 right-8 top-1/2 h-[2px] origin-left bg-gradient-to-r from-[#2d3f55] to-[#7c5cbf]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
      />
      {events.map(([time, label, color], index) => (
        <motion.div
          key={time}
          className="absolute top-1/2"
          style={{ left: `${8 + index * 17}%` }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3 + index * 0.25 }}
        >
          <div
            className="h-3 w-3 rounded-full"
            style={{ background: color, boxShadow: index === 2 ? `0 0 0 8px ${color}33` : undefined }}
          />
          <div className={`absolute w-32 text-xs ${index % 2 ? 'top-6' : 'bottom-6'} -left-14 text-center`}>
            <div className="font-semibold" style={{ color }}>{time}</div>
            <div className="mt-1 text-[var(--text-secondary)]">{label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
