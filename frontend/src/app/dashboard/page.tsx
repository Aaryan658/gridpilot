"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchCarbonSignal, MOCK_DATA, runSchedule } from "@/lib/api";

const LOAD_DATA = [
  { t: "20:00", u: 1200, m: 1200, s: 0 },
  { t: "20:30", u: 1900, m: 1250, s: 0 },
  { t: "21:00", u: 2800, m: 1300, s: 0 },
  { t: "21:30", u: 3500, m: 1320, s: 0 },
  { t: "22:00", u: 4100, m: 1350, s: 0 },
  { t: "22:30", u: 4100, m: 1370, s: 0 },
  { t: "23:00", u: 4080, m: 1400, s: 0 },
  { t: "00:00", u: 4000, m: 1460, s: 0 },
  { t: "01:00", u: 3800, m: 1520, s: 0 },
  { t: "02:00", u: 3400, m: 1509, s: 0 },
  { t: "03:00", u: 3000, m: 1509, s: 20 },
  { t: "04:00", u: 2600, m: 1509, s: 180 },
  { t: "05:00", u: 2100, m: 1300, s: 420 },
  { t: "06:00", u: 1500, m: 900, s: 490 },
  { t: "06:30", u: 1200, m: 600, s: 500 },
  { t: "07:00", u: 900,  m: 420, s: 480 },
  { t: "07:30", u: 850,  m: 410, s: 460 },
  { t: "08:00", u: 800,  m: 400, s: 440 },
];

type ScheduleComparison = {
  peak_reduction_pct?: number;
  dvvnl_monthly_saving_inr?: number;
  carbon_saved_kg?: number;
};

type ScheduleResult = {
  comparison?: ScheduleComparison;
  solve_time_ms?: number;
  managed?: {
    comparison?: ScheduleComparison;
    solve_time_ms?: number;
  };
};

type CarbonSignal = {
  signal_now?: string;
  ev_action_now?: string;
  intensity_now?: number | string;
  rationale?: string;
};

export default function DashboardPage() {
  const [solving, setSolving] = useState(false);
  const [solved, setSolved] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [carbonSignal, setCarbonSignal] = useState<CarbonSignal | null>(null);

  useEffect(() => {
    setChartReady(true);
    fetchCarbonSignal().then((data) => {
      if (data) setCarbonSignal(data);
    });
  }, []);

  const handleRunSchedule = async () => {
    setSolving(true);
    setSolved(false);
    const data = await runSchedule({
      n_vehicles: 500,
    });
    setSolving(false);
    setSolved(true);
    if (data) setResult(data);
    setTimeout(() => setSolved(false), 4000);
  };

  const comparison = result?.comparison || result?.managed?.comparison;

  const peakReduction =
    comparison?.peak_reduction_pct?.toFixed(1) ??
    MOCK_DATA.kpis.peak_reduction_pct.toFixed(1);
  const carbonSaved = comparison?.carbon_saved_kg
    ? `${comparison.carbon_saved_kg.toFixed(0)} kg`
    : `${MOCK_DATA.kpis.carbon_saved_kg.toFixed(0)} kg`;
  const dvvnlSaving = comparison?.dvvnl_monthly_saving_inr
    ? `₹${(comparison.dvvnl_monthly_saving_inr / 100000).toFixed(2)}L`
    : `₹${(MOCK_DATA.kpis.dvvnl_monthly_saving_inr / 100000).toFixed(2)}L`;
  const solveTime =
    result?.managed?.solve_time_ms ?? result?.solve_time_ms ?? MOCK_DATA.kpis.solve_time_ms;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#06141B",
        display: "flex",
      }}
    >
      <div
        style={{
          width: 240,
          background: "rgba(6,20,27,0.95)",
          borderRight: "1px solid rgba(74,92,106,0.15)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              background: "linear-gradient(90deg,#7C5CBF,#00D4AA)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 4,
            }}
          >
            ⚡ GridPilot
          </div>
          <div style={{ fontSize: 10, color: "#00D4AA" }}>Powered by FirstFlight</div>
          <div style={{ fontSize: 10, color: "#4A5C6A", marginTop: 2 }}>
            📍 Corporate EV Depot, Gurugram
          </div>
        </div>

        {[
          { label: "Depot Dashboard", href: "/dashboard", active: true },
          { label: "Back to Home", href: "/", active: false },
          {
            label: "GitHub Repo",
            href: "https://github.com/Aaryan658/gridpilot",
            active: false,
          },
        ].map((item) => (
          <a
            key={item.label}
            href={item.href}
            style={{
              display: "block",
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: item.active ? 600 : 400,
              color: item.active ? "#CCD0CF" : "#4A5C6A",
              background: item.active ? "rgba(124,92,191,0.1)" : "none",
              borderLeft: item.active ? "3px solid #7C5CBF" : "3px solid transparent",
              textDecoration: "none",
              transition: "all 0.15s",
            }}
          >
            {item.label}
          </a>
        ))}

        <div style={{ marginTop: "auto" }}>
          <button
            onClick={handleRunSchedule}
            disabled={solving}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              background: solving ? "#253745" : "#7C5CBF",
              color: "white",
              border: "none",
              fontSize: 13,
              fontWeight: 600,
              cursor: solving ? "not-allowed" : "pointer",
              boxShadow: solving ? "none" : "0 4px 16px rgba(124,92,191,0.4)",
              transition: "all 0.2s",
            }}
          >
            {solving ? "Solving..." : solved ? `⚡ ${solveTime}ms` : "▶ Run Schedule"}
          </button>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#27AE60",
              }}
            />
            <span style={{ fontSize: 10, color: "#4A5C6A" }}>API Connected</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#CCD0CF", marginBottom: 4 }}>
            Depot Dashboard
          </h1>
          <p style={{ fontSize: 12, color: "#4A5C6A" }}>
            Corporate EV Fleet Depot, Gurugram
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {[
            { value: `${peakReduction}%`, label: "Peak Reduced", accent: "#4ECDC4" },
            { value: carbonSaved, label: "CO₂ Saved", accent: "#00D4AA" },
            { value: dvvnlSaving, label: "DVVNL Saving", accent: "#F9CA24" },
            { value: "500/500", label: "Ready by 07:00", accent: "#27AE60" },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              style={{
                background: "#11212D",
                border: "1px solid rgba(74,92,106,0.2)",
                borderRadius: 12,
                padding: "16px",
                borderTop: `2px solid ${card.accent}`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#CCD0CF",
                  fontVariantNumeric: "tabular-nums",
                  marginBottom: 4,
                }}
              >
                {card.value}
              </div>
              <div style={{ fontSize: 11, color: "#9BA8AB", fontWeight: 600 }}>
                {card.label}
              </div>
            </motion.div>
          ))}
        </div>

        <div
          style={{
            background: "#11212D",
            border: "1px solid rgba(74,92,106,0.2)",
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
                Depot Load Profile
              </div>
              <div style={{ fontSize: 11, color: "#4A5C6A" }}>
                500 Mixed EVs | Corporate Fleet, Gurugram | DVVNL HT-2
              </div>
            </div>
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                background: "rgba(39,174,96,0.08)",
                border: "1px solid rgba(39,174,96,0.25)",
                fontSize: 10,
                fontWeight: 600,
                color: "#27AE60",
                letterSpacing: "0.08em",
              }}
            >
              ● STABLE
            </div>
          </div>

          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <filter id="glow2" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                <feColorMatrix
                  in="blur"
                  type="matrix"
                  values="0.49 0 0 0 0 0.36 0 0 0 0 0.75 0 0 0 0 0 0 0 3 0"
                  result="cb"
                />
                <feMerge>
                  <feMergeNode in="cb" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
          </svg>

          <div style={{ height: 320 }}>
            {chartReady ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ComposedChart data={LOAD_DATA} margin={{ top: 8, right: 140, bottom: 4, left: 10 }}>
                  <CartesianGrid stroke="rgba(37,55,69,0.6)" horizontal vertical={false} />
                  <ReferenceArea
                    y1={4000}
                    y2={4600}
                    fill="rgba(231,76,60,0.07)"
                    label={{
                      value: "⚠ Overload Zone",
                      position: "center",
                      fill: "rgba(231,76,60,0.45)",
                      fontSize: 11,
                    }}
                  />
                  <ReferenceArea
                    x1="02:00"
                    x2="05:00"
                    fill="rgba(39,174,96,0.05)"
                    label={{
                      value: "🌙 Clean Window",
                      position: "insideTopLeft",
                      fill: "rgba(39,174,96,0.6)",
                      fontSize: 10,
                    }}
                  />
                  <ReferenceLine
                    y={4000}
                    stroke="#FF6B35"
                    strokeOpacity={0.7}
                    strokeWidth={1}
                    strokeDasharray="10 6"
                    label={{
                      value: "4,000 kW limit",
                      position: "insideTopRight",
                      fill: "rgba(255,107,53,0.85)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <ReferenceLine
                    y={4500}
                    stroke="#F9CA24"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: "4,500 kW penalty",
                      position: "insideTopRight",
                      fill: "rgba(249,202,36,0.6)",
                      fontSize: 10,
                      offset: -18,
                    }}
                  />
                  <XAxis
                    dataKey="t"
                    tick={{ fill: "#4A5C6A", fontSize: 10 }}
                    axisLine={{ stroke: "rgba(74,92,106,0.3)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#4A5C6A", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 4600]}
                    tickCount={5}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0D1B26",
                      border: "1px solid rgba(74,92,106,0.4)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    dataKey="s"
                    stroke="rgba(0,212,170,0.35)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                    fill="rgba(0,212,170,0.08)"
                    dot={false}
                    name="Solar"
                  />
                  <Line
                    dataKey="u"
                    stroke="#E74C3C"
                    strokeWidth={2.5}
                    dot={false}
                    name="Without GridPilot"
                    animationDuration={1800}
                    strokeLinecap="round"
                  />
                  <Line
                    dataKey="m"
                    stroke="#7C5CBF"
                    strokeWidth={3}
                    dot={false}
                    name="With GridPilot"
                    animationDuration={2000}
                    strokeLinecap="round"
                    style={{ filter: "url(#glow2)" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        <div
          style={{
            background: "#11212D",
            border: "1px solid rgba(74,92,106,0.2)",
            borderRadius: 12,
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#9BA8AB",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Carbon Signal — Haryana Grid
            </span>
            <span style={{ fontSize: 10, color: "#4A5C6A" }}>
              {carbonSignal?.rationale?.slice(0, 60) || "CEA 2022-23 | FirstFlight"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                background:
                  carbonSignal?.signal_now === "CLEAN"
                    ? "rgba(39,174,96,0.15)"
                    : "rgba(124,92,191,0.15)",
                border: `1px solid ${
                  carbonSignal?.signal_now === "CLEAN"
                    ? "rgba(39,174,96,0.4)"
                    : "rgba(124,92,191,0.4)"
                }`,
                fontSize: 12,
                fontWeight: 700,
                color: carbonSignal?.signal_now === "CLEAN" ? "#27AE60" : "#7C5CBF",
              }}
            >
              {carbonSignal?.ev_action_now || MOCK_DATA.ev_action}
            </div>
            <span style={{ fontSize: 13, color: "#CCD0CF", fontWeight: 600 }}>
              {carbonSignal?.intensity_now || "0.84"} kg CO₂/kWh
            </span>
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            "ACN-Data (Caltech)",
            "CEA India 2022-23",
            "Vahan CY2024",
            "pandapower AC flow",
            "CVXPY + ECOS",
          ].map((s) => (
            <span
              key={s}
              style={{
                padding: "3px 10px",
                borderRadius: 12,
                background: "#253745",
                border: "1px solid rgba(74,92,106,0.3)",
                fontSize: 10,
                color: "#4A5C6A",
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
