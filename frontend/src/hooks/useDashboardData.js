import { useEffect, useState } from 'react'
import { mockDashboardData } from '../api/mockData'

const API_BASE = 'http://localhost:8000'

/**
 * Normalise the raw /dashboard_data JSON into the shape the UI expects.
 * All field paths come from the API spec in the task brief.
 */
function normalise(json) {
  const depot = json.depot || {}
  const national = json.national || {}
  const signalBridge = json.signal_bridge || {}

  // Normalize carbon forecast — API returns depot.carbon_signal.forecast_48h
  // Each entry may be { timestamp, predicted_intensity, signal } from FirstFlight
  // or { hour, intensity, signal } from mock — normalise to { hour, intensity, signal }
  const rawForecast = depot.carbon_signal?.forecast_48h || []
  const carbonHours = rawForecast.length
    ? rawForecast.map((h) => ({
        hour: h.hour || (h.timestamp ? h.timestamp.slice(11, 16) : ''),
        intensity: h.intensity ?? h.predicted_intensity ?? 0.82,
        signal: h.signal || 'NEUTRAL',
        ev_action: h.ev_action || 'CHARGE_SCHEDULED',
      }))
    : mockDashboardData.carbonHours

  // Normalize national forecast — each region array: [{ timestamp, predicted_mw }]
  const forecastAllRegions =
    national.forecast_all_regions || mockDashboardData.national.forecast_all_regions

  return {
    // Pass depot/national/signal_bridge through verbatim for page-level access
    depot,
    national: {
      ...national,
      grid_stability_score: national.grid_stability_score ?? 90.11,
      forecast_all_regions: forecastAllRegions,
    },
    signal_bridge: signalBridge,
    // Convenience flat fields consumed by chart components
    loadProfile: mockDashboardData.loadProfile, // replaced by useSchedule after Run Schedule
    carbonHours,
    fleetRows: mockDashboardData.fleetRows,
  }
}

export function useDashboardData() {
  const [data, setData] = useState(mockDashboardData)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/dashboard_data`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (mounted) {
          setData(normalise(json))
          setDemoMode(false)
          setLoading(false)
        }
      } catch (err) {
        console.warn('[useDashboardData] API unreachable — using mock fallback', err.message)
        if (mounted) {
          setData(mockDashboardData)
          setDemoMode(true)
          setLoading(false)
        }
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30_000)

    // When Run Schedule completes it dispatches schedule_updated with the
    // full API response — merge comparison values back into dashboard state
    const handleScheduleUpdate = (e) => {
      if (!mounted || !e.detail) return
      const detail = e.detail
      const comparison = detail.schedule_summary?.comparison || detail.comparison
      if (comparison) {
        setData((prev) => ({
          ...prev,
          depot: {
            ...prev.depot,
            schedule_summary: {
              ...prev.depot?.schedule_summary,
              comparison,
            },
          },
          loadProfile: detail.loadProfile || prev.loadProfile,
        }))
      }
    }

    window.addEventListener('schedule_updated', handleScheduleUpdate)

    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener('schedule_updated', handleScheduleUpdate)
    }
  }, [])

  return { data, loading, demoMode }
}
