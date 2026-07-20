import { config } from './config';

export async function apiFetch(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  let authStr = token;
  if (!authStr && typeof window !== 'undefined') {
    authStr = localStorage.getItem('gridpilot_token') || undefined;
    if (!authStr) {
      const match = document.cookie.match(/(?:^|;\s*)gridpilot_token=([^;]*)/);
      if (match) {
        authStr = match[1];
        localStorage.setItem('gridpilot_token', authStr);
      }
    }
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(authStr && { Authorization: `Bearer ${authStr}` }),
    ...options.headers,
  }

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `API error: ${response.status}`)
  }

  return response.json()
}

export async function fetchDashboardData() {
  try {
    return await apiFetch('/dashboard_data', { next: { revalidate: 30 } });
  } catch (e) {
    console.warn("API offline, using mock data");
    return null;
  }
}

export async function runSchedule(params: {
  date?: string;
  n_vehicles?: number;
  enable_v2g?: boolean;
}, token?: string) {
  try {
    return await apiFetch('/depot/schedule', {
      method: "POST",
      body: JSON.stringify({
        date: params.date || "2024-01-15",
        n_vehicles: params.n_vehicles || 40,
        enable_v2g: params.enable_v2g || false,
      }),
    }, token);
  } catch (e) {
    console.warn("Schedule API failed:", e);
    return null;
  }
}

export async function fetchCarbonSignal(token?: string) {
  try {
    return await apiFetch('/depot/carbon_signal', { next: { revalidate: 60 } }, token);
  } catch (e) {
    return null;
  }
}

export const MOCK_DATA = {
  kpis: {
    n_vehicles: 40,
    unmanaged_peak_kw: 293.8,
    managed_peak_kw: 135.0,
    scheduled_peak_kw: 135.0,
    peak_reduction_pct: 54.0,
    unmanaged_overload_events: 5,
    scheduled_overload_events: 0,
    overloads_avoided: 5,
    dvvnl_monthly_saving_inr: 55573,
    carbon_saved_kg: 138,
    solve_time_ms: 161,
    all_ready: true,
    all_ready_on_time: true,
    transformer_utilisation_pct: 108.8,
  },
  carbon_signal: "NEUTRAL",
  ev_action: "CHARGE_SCHEDULED",
};
