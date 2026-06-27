"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import ChargerGrid from "@/components/ChargerGrid";
import EmptyState from "@/components/ui/EmptyState";

export default function LivePage() {
  const [initialData, setInitialData] = useState<{
    chargers: Array<{
      vehicle_id: string;
      charger_id: string;
      vehicle_model: string;
      energy_needed_kwh: number;
      energy_delivered_kwh: number;
      current_power_kw: number;
      soc_percent: number;
      status: string;
      minutes_to_ready: number | null;
    }>;
    summary: { total: number; charging: number; queued: number; ready: number; fault: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");

  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const t = getToken() || "";
      setToken(t);
      const res = await apiFetch("/depot/chargers/status");
      setInitialData({
        chargers: res.chargers || [],
        summary: res.summary || { total: 0, charging: 0, queued: 0, ready: 0, fault: 0 },
      });
    } catch (err) {
      console.warn("Failed to fetch charger status:", err);
      setInitialData({ chargers: [], summary: { total: 0, charging: 0, queued: 0, ready: 0, fault: 0 } });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <svg className="animate-spin w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Connecting to live feed...
      </div>
    );
  }

  if (!initialData || initialData.chargers.length === 0) {
    return (
      <EmptyState
        title="Waiting for tonight's schedule"
        subtitle="Charger status will appear after the optimizer runs at 20:00 IST."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Live Charger Status</h1>
          <p className="text-xs text-gray-500 mt-1">600 vehicles — Gurugram Hub 1</p>
        </div>
      </div>
      <ChargerGrid
        initialChargers={initialData.chargers}
        token={token}
        summary={initialData.summary}
      />
    </div>
  );
}
