"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ChargerTile from "./ChargerTile";
import { config } from "@/lib/config";
import { apiFetch } from "@/lib/api";

type ChargerData = {
  vehicle_id: string;
  charger_id: string;
  vehicle_model: string;
  energy_needed_kwh: number;
  energy_delivered_kwh: number;
  current_power_kw: number;
  soc_percent: number;
  status: string;
  minutes_to_ready: number | null;
};

type SSEPayload = {
  depot_id: string;
  last_updated: string | null;
  summary: {
    total: number;
    charging: number;
    queued: number;
    ready: number;
    fault: number;
  };
  chargers: ChargerData[];
};

type Props = {
  initialChargers: ChargerData[];
  token: string;
  summary?: SSEPayload["summary"];
};

const STATUS_COLORS: Record<string, string> = {
  charging: "#00C851",
  queued:   "#F59E0B",
  ready:    "#3B82F6",
  fault:    "#EF4444",
};

export default function ChargerGrid({ initialChargers, token, summary: initialSummary }: Props) {
  const [chargers, setChargers] = useState<ChargerData[]>(initialChargers);
  const [summary, setSummary] = useState(initialSummary || {
    total: initialChargers.length,
    charging: 0,
    queued: 0,
    ready: 0,
    fault: 0,
  });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `${config.apiUrl}/depot/live-stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("update", (event) => {
      try {
        const data: SSEPayload = JSON.parse(event.data);
        setChargers(data.chargers);
        setSummary(data.summary);
        setLastUpdated(data.last_updated);
        setConnected(true);
        setError(null);
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    });

    es.addEventListener("error", () => {
      setConnected(false);
      setError("Live feed disconnected. Reconnecting...");
      es.close();
      // Retry in 10 seconds
      setTimeout(connectSSE, 10000);
    });

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };
  }, [token]);

  useEffect(() => {
    connectSSE();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connectSSE]);

  /* Dev-only: ask the backend to advance every actively-charging vehicle by
     a real time-step (same energy physics as schedule_adapter.py), mutating
     the persisted ChargerStatus rows. Must go through the API, not local
     state — the live SSE feed re-reads those same rows every 5s and would
     otherwise silently revert any client-only change on the next tick.

     Auto-play re-issues this call on a fixed cadence, matching how real
     receding-horizon MPC EV-charging controllers operate: re-check actual
     state, advance one control step, apply it, repeat — never a one-off
     manual action. (5-min re-solve step is standard in production systems;
     we tick faster in wall-clock time here purely so the demo animates.) */
  const TICK_MINUTES = 5;
  const AUTOPLAY_INTERVAL_MS = 1200;
  const [advancing, setAdvancing] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const advancingRef = useRef(false);

  const simulateUpdate = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setAdvancing(true);
    try {
      const res = await apiFetch(`/depot/chargers/advance?minutes=${TICK_MINUTES}`, { method: "POST" }, token);
      setChargers(res.chargers || []);
      setSummary(res.summary || summary);
      setLastUpdated(res.last_updated ?? lastUpdated);
      if (res.summary && res.summary.charging === 0) setAutoPlaying(false);
    } catch (err) {
      console.error("Advance failed:", err);
      setAutoPlaying(false);
    } finally {
      advancingRef.current = false;
      setAdvancing(false);
    }
  }, [token, summary, lastUpdated]);

  useEffect(() => {
    if (!autoPlaying) return;
    const id = setInterval(simulateUpdate, AUTOPLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [autoPlaying, simulateUpdate]);

  const isDev = process.env.NEXT_PUBLIC_ENV === "development" || process.env.NODE_ENV === "development";

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6 text-sm">
          {(["charging", "queued", "ready", "fault"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[s] }} />
              <span className="text-gray-400 capitalize">{s}:</span>
              <span className="font-semibold" style={{ color: STATUS_COLORS[s] }}>
                {summary[s] || 0}
              </span>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          {error && <span className="text-amber-400">{error}</span>}
          {!error && connected && <span className="text-emerald-400">● Connected</span>}
          {lastUpdated && (
            <span>Updated: {new Date(lastUpdated).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
          )}
          {isDev && (
            <>
              <button
                onClick={() => setAutoPlaying((p) => !p)}
                className={`px-3 py-1 rounded transition-colors ${
                  autoPlaying
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/40"
                    : "bg-[#2A2D3D] hover:bg-[#3A3D4D] text-gray-300"
                }`}
              >
                {autoPlaying ? "⏸ Pause MPC re-solve" : "▶ Auto-run MPC"}
              </button>
              <button
                onClick={simulateUpdate}
                disabled={advancing || autoPlaying}
                className="px-3 py-1 bg-[#2A2D3D] hover:bg-[#3A3D4D] disabled:opacity-50 rounded text-gray-300 transition-colors"
              >
                {advancing ? "Advancing…" : `Advance +${TICK_MINUTES} min`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Charger grid */}
      {chargers.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          Waiting for tonight&apos;s schedule...
        </div>
      ) : (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          }}
        >
          {chargers.map((c) => (
            <ChargerTile key={c.vehicle_id} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}
