"use client";
import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiFetch } from "@/lib/api";

type MpcTick = {
  slot: number;
  timestamp: string;
  total_load_kw: number;
  solve_time_ms: number;
  solver_status: string;
};

type MpcStatus = {
  current_slot: number;
  start_slot: number;
  end_slot: number;
  is_complete: boolean;
  delivered_kwh_total: number;
  energy_needed_kwh_total: number;
  all_ready_so_far: boolean;
  ticks_run: number;
  last_solve_time_ms: number | null;
  recent_dispatch: MpcTick[];
};

export default function MpcLivePanel() {
  const [status, setStatus] = useState<MpcStatus | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startMpc = async () => {
    setError(null);
    setRunning(true);
    try {
      await apiFetch("/depot/mpc/start", {
        method: "POST",
        body: JSON.stringify({ date: "2024-03-15", n_vehicles: 40 }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start MPC run");
      setRunning(false);
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        const data: MpcStatus = await apiFetch("/depot/mpc/status");
        setStatus(data);
        if (data.is_complete) {
          stopPolling();
          setRunning(false);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to poll MPC status");
        stopPolling();
        setRunning(false);
      }
    }, 1000);
  };

  useEffect(() => stopPolling, []);

  return (
    <div style={{
      background: "#0D1B26", border: "1px solid rgba(74,92,106,0.4)",
      borderRadius: 12, padding: 16, marginTop: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h3 style={{ color: "#E2E8F0", fontSize: 16, fontWeight: 600 }}>Live MPC Re-Solve</h3>
          <p style={{ color: "#4A5C6A", fontSize: 11, marginTop: 2 }}>
            Receding-horizon controller — re-solves the full CVXPY schedule every tick using actual delivered energy, commits only the next slot.
          </p>
        </div>
        <button
          onClick={startMpc}
          disabled={running}
          style={{
            background: running ? "#4A5C6A" : "#00C851", color: "#fff",
            border: "none", borderRadius: 8, padding: "6px 14px",
            fontSize: 13, cursor: running ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          {running ? "Running..." : "Start MPC Run"}
        </button>
      </div>

      {error && <div style={{ color: "#EF4444", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      {status && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            <div>
              <div style={{ color: "#4A5C6A", fontSize: 11 }}>Slot</div>
              <div style={{ color: "#E2E8F0", fontSize: 16 }}>{status.current_slot}/{status.end_slot}</div>
            </div>
            <div>
              <div style={{ color: "#4A5C6A", fontSize: 11 }}>Delivered</div>
              <div style={{ color: "#E2E8F0", fontSize: 16 }}>
                {status.delivered_kwh_total.toFixed(0)}/{status.energy_needed_kwh_total.toFixed(0)} kWh
              </div>
            </div>
            <div>
              <div style={{ color: "#4A5C6A", fontSize: 11 }}>Last solve</div>
              <div style={{ color: "#E2E8F0", fontSize: 16 }}>{status.last_solve_time_ms?.toFixed(0) ?? "-"} ms</div>
            </div>
            <div>
              <div style={{ color: "#4A5C6A", fontSize: 11 }}>Status</div>
              <div style={{ color: status.is_complete ? "#00C851" : "#F9CA24", fontSize: 16 }}>
                {status.is_complete ? "Complete" : "Re-solving..."}
              </div>
            </div>
          </div>

          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={status.recent_dispatch}>
                <CartesianGrid stroke="rgba(42,45,61,0.6)" vertical={false} />
                <XAxis dataKey="slot" tick={{ fill: "#4A5C6A", fontSize: 10 }} />
                <YAxis tick={{ fill: "#4A5C6A", fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0D1B26", border: "1px solid rgba(74,92,106,0.4)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="total_load_kw" stroke="#7C5CBF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
