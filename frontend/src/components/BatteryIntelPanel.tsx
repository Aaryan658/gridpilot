"use client";

// Level 3 (Battery Trust Layer): Battery Health Scores computed from charging
// telemetry — charge-acceptance curves, voltage sag, session-over-session
// capacity fade — the data any OCPP charger streams as MeterValues.
// Data below is a deterministic simulated fleet (no backend dependency), so
// the panel renders identically in demo and live mode.

const MODELS = [
  { name: "Tata Nexon EV", baseSoh: 96.4 },
  { name: "Tata Tiago EV", baseSoh: 94.8 },
  { name: "MG ZS EV", baseSoh: 95.6 },
  { name: "Mahindra XUV400", baseSoh: 93.9 },
  { name: "Hyundai Kona Electric", baseSoh: 97.1 },
  { name: "BYD e6", baseSoh: 96.8 },
];

type Vehicle = { id: string; model: string; soh: number };

// Deterministic pseudo-noise so the fleet looks organic but never changes
// between renders (avoids hydration mismatch and demo surprises).
const noise = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 6 - 3; // [-3, +3)
};

const FLEET: Vehicle[] = Array.from({ length: 40 }, (_, i) => {
  const model = MODELS[i % MODELS.length];
  return {
    id: `GP-${String(i + 1).padStart(3, "0")}`,
    model: model.name,
    soh: Math.min(99.2, model.baseSoh + noise(i)),
  };
});

// Two vehicles with degradation signatures the anomaly detector flags.
FLEET[13] = { ...FLEET[13], soh: 78.4 };
FLEET[27] = { ...FLEET[27], soh: 82.1 };

const FLAGGED = [
  {
    v: FLEET[13],
    reason: "Charge acceptance down 12% over last 30 sessions — cell imbalance suspected",
  },
  {
    v: FLEET[27],
    reason: "Voltage sag under load trending up — internal resistance drift",
  },
];

const avgSoh = FLEET.reduce((s, v) => s + v.soh, 0) / FLEET.length;
const healthy = FLEET.filter((v) => v.soh >= 90).length;
const watch = FLEET.filter((v) => v.soh >= 85 && v.soh < 90).length;
const flagged = FLEET.filter((v) => v.soh < 85).length;

const MODEL_AVG = MODELS.map((m) => {
  const vs = FLEET.filter((v) => v.model === m.name);
  return { name: m.name, soh: vs.reduce((s, v) => s + v.soh, 0) / vs.length };
});

const sohColor = (soh: number) =>
  soh >= 90 ? "#27AE60" : soh >= 85 ? "#F9CA24" : "#E74C3C";

export default function BatteryIntelPanel() {
  const cert = FLEET[4]; // healthy Kona as the certificate example
  return (
    <div
      style={{
        background: "#11212D",
        border: "1px solid rgba(0,212,170,0.3)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        boxShadow:
          "0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#CCD0CF", marginBottom: 2 }}>
            Battery Intelligence — Fleet Health
          </div>
          <div style={{ fontSize: 11, color: "#4A5C6A" }}>
            Battery Health Scores from charging telemetry (OCPP MeterValues) — simulated sessions
          </div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            background: "rgba(0,212,170,0.08)",
            border: "1px solid rgba(0,212,170,0.3)",
            fontSize: 10,
            fontWeight: 600,
            color: "#00D4AA",
            letterSpacing: "0.08em",
          }}
        >
          LEVEL 3
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          { value: `${avgSoh.toFixed(1)}%`, label: "Fleet avg health score", color: "#00D4AA" },
          { value: String(healthy), label: "Healthy (≥90)", color: "#27AE60" },
          { value: String(watch), label: "Watch (85–90)", color: "#F9CA24" },
          { value: String(flagged), label: "Flagged (<85)", color: "#E74C3C" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(0,212,170,0.04)",
              border: "1px solid rgba(74,92,106,0.2)",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: s.color,
                fontVariantNumeric: "tabular-nums",
                marginBottom: 4,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "#9BA8AB", fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#9BA8AB",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Health by model
          </div>
          {MODEL_AVG.map((m) => (
            <div key={m.name} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 3,
                }}
              >
                <span style={{ color: "#CCD0CF" }}>{m.name}</span>
                <span
                  style={{
                    color: sohColor(m.soh),
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {m.soh.toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  height: 5,
                  borderRadius: 3,
                  background: "rgba(74,92,106,0.2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${m.soh}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: sohColor(m.soh),
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#9BA8AB",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 10,
            }}
          >
            Anomaly detector — flagged vehicles
          </div>
          {FLAGGED.map(({ v, reason }) => (
            <div
              key={v.id}
              style={{
                background: "rgba(231,76,60,0.06)",
                border: "1px solid rgba(231,76,60,0.25)",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: "#CCD0CF" }}>
                  {v.id} · {v.model}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#E74C3C",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {v.soh.toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: 10, color: "#9BA8AB" }}>{reason}</div>
            </div>
          ))}

          <div
            style={{
              background: "rgba(0,212,170,0.06)",
              border: "1px dashed rgba(0,212,170,0.4)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#00D4AA" }}>
                🛡 GridPilot Battery Certificate
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#27AE60",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {cert.soh.toFixed(1)}%
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#9BA8AB" }}>
              {cert.id} · {cert.model} — verified health history over 214 sessions.
              Resale-ready certification for buyers, insurers, and financiers.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
