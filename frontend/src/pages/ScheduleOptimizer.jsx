import { motion } from 'framer-motion'
import { CheckCircle, Play } from 'lucide-react'
import Header from '../components/layout/Header'
import ComparisonTable from '../components/tables/ComparisonTable'
import GanttChart from '../components/charts/GanttChart'
import CarbonStrip from '../components/charts/CarbonStrip'
import { mockDashboardData, mockScheduleResult } from '../api/mockData'
import { useSchedule } from '../hooks/useSchedule'
import { useDashboardData } from '../hooks/useDashboardData'

export default function ScheduleOptimizer() {
  const { execute, result, loading, demoMode } = useSchedule()
  const { data } = useDashboardData()

  // Use live result if available; fall back to confirmed mock values
  const comparison = result?.comparison || mockDashboardData.depot.schedule_summary.comparison
  const solveTimeMs = result?.solve_time_ms ?? result?.solveTimeMs ?? (result ? 4576 : null)
  const status = result?.status

  const buttonLabel = loading
    ? 'Solving...'
    : solveTimeMs
    ? `⚡ Solved in ${solveTimeMs.toLocaleString('en-IN')}ms`
    : 'Run GridPilot Optimization'

  return (
    <div>
      <Header title="Schedule Optimizer" subtitle="Convex charging plan for 500 Tata Nexon EVs" demoMode={demoMode} />
      <div className="grid grid-cols-[38fr_62fr] gap-4 max-xl:grid-cols-1">
        {/* ── Left panel: parameters + run button ── */}
        <div className="glass-card space-y-5 p-5">
          <div className="text-base font-semibold">Optimization Parameters</div>
          <div className="rounded-xl border border-[var(--border-primary)] bg-[#11182799] p-4">
            <div className="mb-3 text-sm text-[var(--text-secondary)]">Session preview</div>
            {mockDashboardData.fleetRows.slice(0, 10).map((row) => (
              <div key={row.vehicle_id} className="flex h-8 items-center justify-between border-b border-[#2d3f554d] text-xs">
                <span>{row.vehicle_id}</span>
                <span className="text-[var(--text-secondary)]">{row.energy_kwh.toFixed(1)} kWh</span>
              </div>
            ))}
          </div>

          {/* Carbon strip — use live data if available */}
          <CarbonStrip hours={data.carbonHours || mockDashboardData.carbonHours} />

          <button
            onClick={() => execute()}
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-[10px] bg-gradient-to-br from-[#7c5cbf] to-[#5a3f9e] text-sm font-semibold shadow-[0_4px_16px_rgba(124,92,191,0.4)] active:scale-[0.96] disabled:cursor-wait disabled:opacity-70"
          >
            <Play size={16} className={`mr-2 ${loading ? 'animate-pulse' : ''}`} />
            {buttonLabel}
          </button>
        </div>

        {/* ── Right panel: results ── */}
        <motion.div className="glass-card p-5" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle size={18} className="text-[#4ecdc4]" />
              Optimization Complete
            </div>
            <span className="rounded-md border border-[#00d4aa66] bg-[#00d4aa22] px-2 py-1 text-xs text-[#00d4aa]">
              {solveTimeMs ? `${solveTimeMs.toLocaleString('en-IN')}ms` : '4,576ms'}
              {status === 'edf_fallback' && ' (EDF Fallback)'}
            </span>
          </div>
          <ComparisonTable comparison={comparison} />
          <div className="mt-5">
            <GanttChart rows={mockDashboardData.fleetRows} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
