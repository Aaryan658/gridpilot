import { apiFetch } from './api';

export type ChargingPeriod = { timeslot: number; power_kw: number };

export type FleetVehicle = {
  vehicle_id: string;
  vehicle_model: string;
  battery_kwh: number;
  charger_kw: number;
};

export type DemoVehicle = {
  vehicle_id: string;
  vehicle_model: string;
  charger_id: string;
  battery_kwh: number;
  charger_kw: number;
  energy_needed_kwh: number;
  energy_delivered_kwh: number;
  starting_soc_pct: number;
  target_soc_pct: number;
  soc_percent: number;
  charging_periods: ChargingPeriod[];
};

export type DemoLoadCurveRow = { t: string; ev_kw: number; building_kw: number; total_kw: number };

// Depot capacity figures, sized proportionally to the fleet the demo was run
// with (see GridPilotScheduler.REFERENCE_FLEET_SIZE) — never hardcode these.
export type DemoCapacity = {
  transformer_kva: number;
  transformer_kw: number;
  dvvnl_kva: number;
  dvvnl_kw: number;
  managed_target_kw: number;
  hard_cap_kw: number;
};

export type DemoScheduleResult = {
  depot: string;
  n_vehicles: number;
  soc_pct: number;
  target_soc_pct: number;
  fleet_profile: Record<string, unknown>;
  unmanaged: { status: string; peak_kw: number; overload_events: number; overload_excursions: number; load_curve: DemoLoadCurveRow[] };
  managed: { status: string; peak_kw: number; overload_events: number; overload_excursions: number; load_curve: DemoLoadCurveRow[] };
  comparison: {
    unmanaged_peak_kw: number;
    scheduled_peak_kw: number;
    peak_reduction_pct: number;
    unmanaged_overload_events: number;
    scheduled_overload_events: number;
    unmanaged_overload_excursions: number;
    scheduled_overload_excursions: number;
  };
  vehicles: DemoVehicle[];
  vehicles_unmanaged: DemoVehicle[];
  capacity: DemoCapacity;
  timestamp: string;
};

export async function fetchDemoFleet(params: { date?: string; n_vehicles: number }): Promise<{ n_vehicles: number; vehicles: FleetVehicle[]; capacity: DemoCapacity }> {
  const q = new URLSearchParams({
    date: params.date || '2024-01-15',
    n_vehicles: String(params.n_vehicles),
  });
  return apiFetch(`/demo/fleet?${q.toString()}`);
}

export async function runDemoSchedule(params: {
  date?: string;
  n_vehicles: number;
  soc_pct: number;
  vehicle_soc?: Record<string, number>;
}): Promise<DemoScheduleResult> {
  return apiFetch('/demo/schedule', {
    method: 'POST',
    body: JSON.stringify({
      date: params.date || '2024-01-15',
      n_vehicles: params.n_vehicles,
      soc_pct: params.soc_pct,
      vehicle_soc: params.vehicle_soc || null,
    }),
  });
}
