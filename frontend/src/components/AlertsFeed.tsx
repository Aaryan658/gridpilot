"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";
import { config } from "@/lib/config";

type ChargerData = {
  vehicle_id: string;
  charger_id: string;
  status: string;
  current_power_kw: number;
};

type SSEPayload = {
  last_updated: string | null;
  chargers: ChargerData[];
};

type Alert = {
  id: string;
  time: string;
  severity: "fault" | "overload" | "info";
  message: string;
};

// Same limits the main dashboard's load-profile chart uses as reference
// lines (see dashboard/page.tsx) — kept local here since this component is
// meant to be droppable onto any page without prop wiring.
const TRANSFORMER_LIMIT_KW = 216;
const MAX_ALERTS = 20;

export default function AlertsFeed({ token }: { token: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [connected, setConnected] = useState(false);
  const knownFaults = useRef<Set<string>>(new Set());
  const wasOverloaded = useRef(false);

  useEffect(() => {
    if (!token) return;
    const url = `${config.apiUrl}/depot/live-stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.addEventListener("update", (event) => {
      setConnected(true);
      let data: SSEPayload;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      const now = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });
      const newAlerts: Alert[] = [];

      // Fault transitions — only alert the moment a charger newly becomes faulted.
      const currentFaults = new Set(data.chargers.filter((c) => c.status === "fault").map((c) => c.charger_id));
      for (const id of currentFaults) {
        if (!knownFaults.current.has(id)) {
          newAlerts.push({ id: `${id}-${Date.now()}`, time: now, severity: "fault", message: `${id} — fault detected` });
        }
      }
      knownFaults.current = currentFaults;

      // Aggregate overload — total live power vs the depot's transformer limit.
      const totalKw = data.chargers.reduce((sum, c) => sum + (c.current_power_kw || 0), 0);
      const isOverloaded = totalKw > TRANSFORMER_LIMIT_KW;
      if (isOverloaded && !wasOverloaded.current) {
        newAlerts.push({
          id: `overload-${Date.now()}`,
          time: now,
          severity: "overload",
          message: `Depot load ${totalKw.toFixed(0)} kW exceeds ${TRANSFORMER_LIMIT_KW} kW transformer limit`,
        });
      } else if (!isOverloaded && wasOverloaded.current) {
        newAlerts.push({
          id: `resolved-${Date.now()}`,
          time: now,
          severity: "info",
          message: `Depot load back under ${TRANSFORMER_LIMIT_KW} kW limit`,
        });
      }
      wasOverloaded.current = isOverloaded;

      if (newAlerts.length) {
        setAlerts((prev) => [...newAlerts, ...prev].slice(0, MAX_ALERTS));
      }
    });

    es.addEventListener("error", () => setConnected(false));
    es.onopen = () => setConnected(true);

    return () => es.close();
  }, [token]);

  const ICONS = {
    fault: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
    overload: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    info: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  };

  return (
    <div className="rounded-xl border border-[#2A2D3D] bg-[#161821] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">Alerts</h2>
        <span className={`text-[10px] ${connected ? "text-emerald-400" : "text-gray-500"}`}>
          {connected ? "● Live" : "○ Connecting..."}
        </span>
      </div>
      {alerts.length === 0 ? (
        <p className="text-xs text-gray-500">No alerts — depot operating normally.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-start gap-2 text-xs">
              {ICONS[a.severity]}
              <div className="min-w-0">
                <span className="text-gray-300">{a.message}</span>
                <span className="text-gray-600 ml-2">{a.time}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
