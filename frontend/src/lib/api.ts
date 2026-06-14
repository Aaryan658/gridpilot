const API_BASE = process.env.NEXT_PUBLIC_API_URL
  || "http://localhost:8000";

export async function fetchDashboardData() {
  try {
    const res = await fetch(
      `${API_BASE}/dashboard_data`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) throw new Error(res.statusText);
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new TypeError("Expected JSON response from API");
    }
    return await res.json();
  } catch (e) {
    console.warn("API offline, using mock data");
    return null;
  }
}

export async function runSchedule(params: {
  date?: string;
  n_vehicles?: number;
  enable_v2g?: boolean;
}) {
  try {
    const res = await fetch(
      `${API_BASE}/depot/schedule`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          date: params.date || "2024-01-15",
          n_vehicles: params.n_vehicles || 500,
          enable_v2g: params.enable_v2g || false,
        }),
      }
    );
    if (!res.ok) throw new Error(res.statusText);
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new TypeError("Expected JSON response from API");
    }
    return await res.json();
  } catch (e) {
    console.warn("Schedule API failed:", e);
    return null;
  }
}

export async function fetchCarbonSignal() {
  try {
    const res = await fetch(
      `${API_BASE}/depot/carbon_signal`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error(res.statusText);
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new TypeError("Expected JSON response from API");
    }
    return await res.json();
  } catch (e) {
    return null;
  }
}

export const MOCK_DATA = {
  kpis: {
    peak_reduction_pct: 47.1,
    unmanaged_peak_kw: 3780,
    managed_peak_kw: 2000.0,
    scheduled_peak_kw: 2000.0,
    overloads_avoided: 0,
    dvvnl_monthly_saving_inr: 623000,
    carbon_saved_kg: 1727,
    all_ready: true,
    solve_time_ms: 1831,
  },
  carbon_signal: "NEUTRAL",
  ev_action: "CHARGE_SCHEDULED",
};
