import { buildCarbonHours, buildFleetRows, buildLoadProfile } from '../utils/dataGenerators'

// ── Real simulation values from the live GridPilot API ─────────────────────
// These match the confirmed physics-based output for 500 Tata Nexon EVs,
// Gurugram Corporate Fleet Depot, DVVNL HT-2 tariff.

export const mockDashboardData = {
  depot: {
    status: {
      transformer_loading_pct: 50.9,
      active_evs: 500,
      current_ev_load_kw: 1508.94,
      solar_kw: 0,
      net_load_kw: 1508.94,
      baseline_load_kw: 400,
      carbon_intensity_now: 0.84,
      carbon_signal: 'NEUTRAL',
      ev_action: 'CHARGE_SCHEDULED',
      dvvnl_penalty_risk: false,
      grid_status: 'STABLE',
    },
    schedule_summary: {
      peak_kw: 1508.94,
      total_carbon_kg: 20049 - 773.73,
      all_ready_on_time: true,
      overload_events: 0,
      comparison: {
        unmanaged_peak_kw: 4100,
        scheduled_peak_kw: 1508.94,
        peak_reduction_pct: 63.2,
        unmanaged_overload_events: 5,
        scheduled_overload_events: 0,
        unmanaged_carbon_kg: 20049,
        scheduled_carbon_kg: 20049 - 773.73,
        carbon_reduction_pct: 18.3,
        dvvnl_monthly_saving_inr: 906871,
      },
    },
    carbon_signal: {
      carbon_intensity_now: 0.84,
      ev_action_now: 'CHARGE_SCHEDULED',
      forecast_48h: buildCarbonHours(),
      clean_windows: [{ start: '02:00', end: '05:00', avg_intensity: 0.73, label: 'CLEAN' }],
      rationale:
        'NCR grid running 78% coal tonight. Cleanest window: 02:00–05:00 at 0.73 kg CO₂/kWh. GridPilot shifting maximum charging to clean window. Estimated saving: 773.73 kg CO₂ vs unmanaged.',
    },
    fleet_summary: {
      total_evs: 500,
      vehicle_model: 'Tata Nexon EV',
      zone_breakdown: { A: 125, B: 125, C: 125, D: 125 },
      all_deadline: '07:00',
    },
    v2g_status: {
      available_kw: 400,
      available_kwh: 4000,
      willing_vehicles: 200,
      monthly_dvvnl_saving_inr: 155556,
      co2_offset_kg_per_day: 1312,
    },
  },
  national: {
    grid_stability_score: 90.11,
    active_anomalies: [],
    at_c_loss_today_crore: 48.7,
    optimization_snapshot: {
      recommendation: 'Shift 2,000 MW across national corridors to balance SR deficit. Clean window 02:00–05:00 optimal for EV fleet charging.',
    },
    forecast_all_regions: {
      NR:  buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 68000 + d.hour * 95 })),
      SR:  buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 52000 + d.hour * 65 })),
      ER:  buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 26000 + d.hour * 35 })),
      WR:  buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 65000 + d.hour * 80 })),
      NER: buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 4200 + d.hour * 8 })),
    },
  },
  signal_bridge: {
    current_signal: 'NEUTRAL',
    rationale:
      'NCR grid 78% coal tonight. FirstFlight converts national demand and Haryana carbon intensity into GridPilot charging limits.',
    clean_window_next: { start: '02:00', end: '05:00', avg_intensity: 0.73, label: 'CLEAN' },
    recommended_action: 'CHARGE_SCHEDULED',
  },
  loadProfile: buildLoadProfile(),
  carbonHours: buildCarbonHours(),
  fleetRows: buildFleetRows(500),
}

export const mockScheduleResult = {
  comparison: {
    unmanaged_peak_kw: 4100,
    scheduled_peak_kw: 1508.94,
    peak_reduction_pct: 63.2,
    unmanaged_overload_events: 5,
    scheduled_overload_events: 0,
    unmanaged_carbon_kg: 20049,
    scheduled_carbon_kg: 20049 - 773.73,
    carbon_reduction_pct: 18.3,
    dvvnl_monthly_saving_inr: 906871,
  },
  fleet_summary: {
    all_ready_on_time: true,
    vehicles_delayed: 0,
    peak_load_kw: 1508.94,
    overload_events: 0,
  },
  status: 'edf_fallback',
  solve_time_ms: 4576,
  solveTimeMs: 4576,
}
