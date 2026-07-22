"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type RigTelemetry = {
  mode: "managed" | "unmanaged";
  current_a: number;
  voltage_v: number;
  bays_on: boolean[];
  status?: "SAFE" | "WARNING" | "OVERLOAD";
};

type RigResponse = {
  online: boolean;
  age_seconds: number | null;
  telemetry: RigTelemetry | null;
};

// Fallback shown when the ESP32 isn't posting — same numbers hardcoded in
// GridPilotRigHardcoded.ino, so the panel never looks broken during a demo.
const DEMO_FALLBACK: RigTelemetry = {
  mode: "managed",
  current_a: 0.36,
  voltage_v: 5.04,
  bays_on: [true, true, true, false, false],
  status: "SAFE",
};

const STATUS_COLORS: Record<string, string> = {
  SAFE: "#27AE60",
  WARNING: "#F9CA24",
  OVERLOAD: "#E74C3C",
};

export default function HardwareRigPanel() {
  const [rig, setRig] = useState<RigResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const poll = async () => {
      try {
        const data: RigResponse = await apiFetch("/hardware/telemetry");
        setRig(data);
      } catch {
        setRig(null); // API unreachable -> fall back to demo values
      }
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const live = !!(rig?.online && rig.telemetry);
  const t = live ? (rig!.telemetry as RigTelemetry) : DEMO_FALLBACK;
  const status = t.status ?? "SAFE";
  const statusColor = STATUS_COLORS[status] ?? "#27AE60";
  const powerW = t.current_a * t.voltage_v;
  const bays = t.bays_on?.length === 5 ? t.bays_on : DEMO_FALLBACK.bays_on;

  return (
    <div style={{
      background: "#0D1B26", border: "1px solid rgba(74,92,106,0.4)",
      borderRadius: 12, padding: 16, marginTop: 16,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h3 style={{ color: "#E2E8F0", fontSize: 16, fontWeight: 600 }}>Hardware Rig — Live Telemetry</h3>
          <p style={{ color: "#4A5C6A", fontSize: 11, marginTop: 2 }}>
            5-bay ESP32 relay rig, reporting measured current &amp; voltage over WiFi every 2 s
          </p>
        </div>
        <div style={{
          padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600,
          letterSpacing: "0.08em", flexShrink: 0,
          background: live ? "rgba(39,174,96,0.08)" : "rgba(249,202,36,0.08)",
          border: `1px solid ${live ? "rgba(39,174,96,0.25)" : "rgba(249,202,36,0.25)"}`,
          color: live ? "#27AE60" : "#F9CA24",
        }}>
          {live ? "● RIG ONLINE" : "● RIG OFFLINE — DEMO"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        <div>
          <div style={{ color: "#4A5C6A", fontSize: 11 }}>Current</div>
          <div style={{ color: "#E2E8F0", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {t.current_a.toFixed(2)} A
          </div>
        </div>
        <div>
          <div style={{ color: "#4A5C6A", fontSize: 11 }}>Voltage</div>
          <div style={{ color: "#E2E8F0", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {t.voltage_v.toFixed(2)} V
          </div>
        </div>
        <div>
          <div style={{ color: "#4A5C6A", fontSize: 11 }}>Power</div>
          <div style={{ color: "#E2E8F0", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {powerW.toFixed(2)} W
          </div>
        </div>
        <div>
          <div style={{ color: "#4A5C6A", fontSize: 11 }}>Status</div>
          <div style={{ color: statusColor, fontSize: 22, fontWeight: 700 }}>
            {status}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "#9BA8AB",
        }}>
          Mode: <span style={{ color: t.mode === "managed" ? "#7C5CBF" : "#E74C3C" }}>
            {t.mode === "managed" ? "GridPilot Managed" : "Unmanaged"}
          </span>
        </span>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {bays.map((on, i) => (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%",
                background: on ? "#4ECDC4" : "rgba(74,92,106,0.35)",
                boxShadow: on ? "0 0 8px rgba(78,205,196,0.6)" : "none",
                transition: "all 0.3s",
              }} />
              <span style={{ fontSize: 9, color: "#4A5C6A" }}>B{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
