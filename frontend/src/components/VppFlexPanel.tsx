"use client";

import { formatINR } from "@/lib/utils";

// Level 2 (VPP): the gap between unmanaged and managed peak is load the
// optimizer can shift on demand — sellable as demand response flexibility.
// Revenue assumption: 20 DR events/mo × 2 h × ₹3/kWh curtailment incentive.
export default function VppFlexPanel({
  unmanagedPeakKw,
  managedPeakKw,
}: {
  unmanagedPeakKw: number;
  managedPeakKw: number;
}) {
  const kw = Math.max(0, unmanagedPeakKw - managedPeakKw);
  const monthlyInr = kw * 2 * 20 * 3;
  const depots = 25;
  const fleetMw = (kw * depots) / 1000;
  const fleetInr = monthlyInr * depots;

  return (
    <div
      style={{
        background: "#11212D",
        border: "1px solid rgba(124,92,191,0.35)",
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
            Virtual Power Plant — Grid Flexibility Asset
          </div>
          <div style={{ fontSize: 11, color: "#4A5C6A" }}>
            Load the optimizer can shift on demand, sellable as demand response to the DISCOM
          </div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            background: "rgba(124,92,191,0.1)",
            border: "1px solid rgba(124,92,191,0.35)",
            fontSize: 10,
            fontWeight: 600,
            color: "#7C5CBF",
            letterSpacing: "0.08em",
          }}
        >
          LEVEL 2
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {[
          {
            value: `${kw.toFixed(0)} kW`,
            label: "Dispatchable flexibility",
            sub: "unmanaged peak − GridPilot peak",
          },
          {
            value: `${formatINR(monthlyInr)}/mo`,
            label: "DR revenue potential / depot",
            sub: "20 events/mo × 2 h × ₹3/kWh incentive",
          },
          {
            value: `${fleetMw.toFixed(1)} MW · ${formatINR(fleetInr)}/mo`,
            label: `Aggregated across ${depots} depots`,
            sub: "market-scale virtual power plant",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(124,92,191,0.06)",
              border: "1px solid rgba(124,92,191,0.15)",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#CCD0CF",
                fontVariantNumeric: "tabular-nums",
                marginBottom: 4,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 11, color: "#9BA8AB", fontWeight: 600, marginBottom: 2 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 10, color: "#4A5C6A" }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
