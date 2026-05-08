import { buildCarbonHours, buildFleetRows, buildLoadProfile } from '../utils/dataGenerators'

export const mockDashboardData = {
  depot: {
    status: {
      transformer_loading_pct: 50.9,
      active_evs: 500,
      current_ev_load_kw: 2034,
      solar_kw: 0,
      net_load_kw: 2434,
      baseline_load_kw: 400,
      carbon_intensity_now: 0.82,
      carbon_signal: 'NEUTRAL',
      ev_action: 'CHARGE_SCHEDULED',
      dvvnl_penalty_risk: false,
      grid_status: 'STABLE',
    },
    schedule_summary: {
      peak_kw: 2034,
      total_carbon_kg: 16384,
      comparison: {
        unmanaged_peak_kw: 3700,
        scheduled_peak_kw: 2034,
        peak_reduction_pct: 46,
        unmanaged_overload_events: 7,
        scheduled_overload_events: 0,
        unmanaged_carbon_kg: 20049,
        scheduled_carbon_kg: 16384,
        carbon_reduction_pct: 18.3,
      },
    },
    carbon_signal: {
      carbon_intensity_now: 0.82,
      ev_action_now: 'CHARGE_SCHEDULED',
      carbon_forecast_48h: buildCarbonHours(),
      clean_windows: [{ start: '02:00', end: '05:00', avg_intensity: 0.73, label: 'CLEAN' }],
      rationale:
        'NCR grid running 78% coal tonight. Cleanest window: 02:00-05:00 at 0.73 kg CO2/kWh. GridPilot shifting maximum charging to clean window. Estimated saving: 3,665 kg CO2 vs unmanaged.',
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
    grid_stability_score: 91.4,
    active_anomalies: [],
    at_c_loss_today_crore: 48.7,
    forecast_all_regions: {
      NR: buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 68000 + d.hour * 95 })),
      SR: buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 52000 + d.hour * 65 })),
      ER: buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 26000 + d.hour * 35 })),
      WR: buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 65000 + d.hour * 80 })),
      NER: buildLoadProfile().map((d) => ({ timestamp: d.time, predicted_mw: 4200 + d.hour * 8 })),
    },
  },
  signal_bridge: {
    current_signal: 'NEUTRAL',
    rationale:
      'FirstFlight converts national demand and Haryana carbon intensity into GridPilot charging limits for the Gurugram fleet.',
    clean_window_next: { start: '02:00', end: '05:00', avg_intensity: 0.73, label: 'CLEAN' },
    recommended_action: 'CHARGE_SCHEDULED',
  },
  loadProfile: buildLoadProfile(),
  carbonHours: buildCarbonHours(),
  fleetRows: buildFleetRows(500),
}

export const mockScheduleResult = {
  comparison: {
    unmanaged_peak_kw: 3700,
    scheduled_peak_kw: 2034,
    peak_reduction_pct: 46,
    unmanaged_overload_events: 7,
    scheduled_overload_events: 0,
    unmanaged_carbon_kg: 20049,
    scheduled_carbon_kg: 16384,
    carbon_reduction_pct: 18.3,
  },
  fleet_summary: { all_ready_on_time: true, vehicles_delayed: 0, peak_load_kw: 2034, overload_events: 0 },
  status: 'edf_fallback',
  solve_time_ms: 187,
}
