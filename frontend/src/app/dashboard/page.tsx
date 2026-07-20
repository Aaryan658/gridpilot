"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
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
import { fetchCarbonSignal, fetchDashboardData, MOCK_DATA, runSchedule } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import MpcLivePanel from "@/components/MpcLivePanel";

// Fallback mock curve (used until a live schedule run returns data) — pulled
// from an actual seeded 40-vehicle optimizer run so unmanaged (u) and
// managed (m) integrate to the same total delivered energy.
const LOAD_DATA = [
  { t: "20:00", u: 54.6,  m: 25,    s: 0 },
  { t: "20:30", u: 116.3, m: 25,    s: 0 },
  { t: "21:00", u: 199.6, m: 25,    s: 0 },
  { t: "21:30", u: 264.4, m: 25,    s: 0 },
  { t: "22:00", u: 293.8, m: 124.7, s: 0 },
  { t: "22:30", u: 254.2, m: 124.7, s: 0 },
  { t: "23:00", u: 216.4, m: 124.7, s: 0 },
  { t: "23:30", u: 211.2, m: 124.7, s: 0 },
  { t: "00:00", u: 166.9, m: 124.7, s: 0 },
  { t: "00:30", u: 147.4, m: 124.7, s: 1 },
  { t: "01:00", u: 138.0, m: 124.7, s: 3 },
  { t: "01:30", u: 93.2,  m: 124.7, s: 7 },
  { t: "02:00", u: 31.4,  m: 135,   s: 12 },
  { t: "02:30", u: 25,    m: 135,   s: 19 },
  { t: "03:00", u: 25,    m: 135,   s: 26 },
  { t: "03:30", u: 25,    m: 135,   s: 31 },
  { t: "04:00", u: 25,    m: 135,   s: 35 },
  { t: "04:30", u: 25,    m: 135,   s: 38 },
  { t: "05:00", u: 25,    m: 124.7, s: 39 },
  { t: "05:30", u: 25,    m: 124.7, s: 36 },
  { t: "06:00", u: 25,    m: 124.7, s: 30 },
  { t: "06:30", u: 25,    m: 124.7, s: 22 },
  { t: "07:00", u: 25,    m: 25,    s: 12 },
  { t: "07:30", u: 25,    m: 25,    s: 4 },
  { t: "08:00", u: 25,    m: 25,    s: 0 },
];

type LoadCurveRow = { t: string; ev_kw: number; building_kw: number; total_kw: number };

type ScheduleComparison = {
  peak_reduction_pct?: number;
  dvvnl_monthly_saving_inr?: number;
  unmanaged_carbon_kg?: number;
  scheduled_carbon_kg?: number;
};

type DashboardResult = {
  peak_reduction_pct: number;
  dvvnl_monthly_saving_inr: number;
  carbon_saved_kg: number;
  solve_time_ms?: number;
  all_ready: boolean;
  source: "live" | "demo";
  loadCurve?: LoadCurveRow[];
  unmanagedLoadCurve?: LoadCurveRow[];
};

type CarbonSignal = {
  signal_now?: string;
  ev_action_now?: string;
  intensity_now?: number | string;
  rationale?: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, viewAsAdmin, setViewAsAdmin } = useAuth();
  const isAdmin = user?.role === "gridpilot_admin" && viewAsAdmin;
  const isFirstRun = useRef(true);
  const [solving, setSolving] = useState(false);
  const [solved, setSolved] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [carbonSignal, setCarbonSignal] = useState<CarbonSignal | null>(null);
  const [solveStep, setSolveStep] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [wasWarmup, setWasWarmup] = useState(false);

  useEffect(() => {
    const ping = () => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      fetch(apiBase + "/health").catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setChartReady(true);
    if (token) fetchCarbonSignal(token).then((data) => {
      if (data) setCarbonSignal(data);
    });
    fetchDashboardData().then((data) => {
      const managed = data?.depot?.schedule_summary;
      const unmanaged = data?.depot?.unmanaged_schedule_summary;
      if (!managed || !unmanaged) return;
      const c: ScheduleComparison = managed.comparison || {};
      const carbonSaved =
        c.unmanaged_carbon_kg !== undefined && c.scheduled_carbon_kg !== undefined
          ? Math.max(0, c.unmanaged_carbon_kg - c.scheduled_carbon_kg)
          : MOCK_DATA.kpis.carbon_saved_kg;
      setResult({
        peak_reduction_pct: c.peak_reduction_pct ?? MOCK_DATA.kpis.peak_reduction_pct,
        dvvnl_monthly_saving_inr: c.dvvnl_monthly_saving_inr ?? MOCK_DATA.kpis.dvvnl_monthly_saving_inr,
        carbon_saved_kg: carbonSaved,
        solve_time_ms: managed.solve_time_ms,
        all_ready: managed.all_ready_on_time,
        source: "live",
        loadCurve: managed.load_curve,
        unmanagedLoadCurve: unmanaged.load_curve,
      });
    }).finally(() => setDataLoading(false));
  }, []);

  const handleRunSchedule = () => {
    router.push('/dashboard/optimizer');
  };

  const peakReduction =
    result?.peak_reduction_pct?.toFixed(1) ??
    MOCK_DATA.kpis.peak_reduction_pct.toFixed(1);
  const carbonSaved = result?.carbon_saved_kg
    ? `${result.carbon_saved_kg.toFixed(0)} kg`
    : `${MOCK_DATA.kpis.carbon_saved_kg.toFixed(0)} kg`;
  const dvvnlSaving = result?.dvvnl_monthly_saving_inr
    ? formatINR(result.dvvnl_monthly_saving_inr)
    : formatINR(MOCK_DATA.kpis.dvvnl_monthly_saving_inr);
  const solveTime =
    result?.solve_time_ms ?? MOCK_DATA.kpis.solve_time_ms;
  const readyCount = result?.all_ready === false ? "Check" : "40/40";

  const chartData = (() => {
    const managed = result?.loadCurve;
    const unmanaged = result?.unmanagedLoadCurve;
    if (!managed?.length || !unmanaged?.length) return LOAD_DATA;
    const n = Math.min(managed.length, unmanaged.length);
    return Array.from({ length: n }, (_, i) => ({
      t: managed[i].t,
      m: managed[i].total_kw,
      u: unmanaged[i].total_kw,
      s: 0,
    }));
  })();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#06141B",
        display: "flex",
      }}
    >
{!isAdmin && (
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
          <img src="/logo.png" alt="GridPilot" style={{ height: 56, width: "auto", marginBottom: 4 }} />
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

          {solving && solveStep && (
            <div style={{
              marginBottom: 8,
              padding: "8px 10px",
              background: "rgba(0,212,170,0.08)",
              border: "1px solid rgba(0,212,170,0.2)",
              borderRadius: 8,
              fontSize: 11,
              color: "#00D4AA",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.4,
            }}>
              {solveStep}
            </div>
          )}

          {solved && result && (
            <div style={{
              marginBottom: 8,
              padding: "10px 12px",
              background: "rgba(124,92,191,0.08)",
              border: "1px solid rgba(124,92,191,0.25)",
              borderRadius: 10,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: isLive ? "#27AE60" : "#F9CA24",
                marginBottom: 8,
              }}>
                {isLive ? "● Live Result" : "● Demo Result"}
              </div>

              {[
                { l: "Peak reduction", v: `${Number(result.peak_reduction_pct).toFixed(1)}%` },
                { l: "DVVNL saving", v: `${formatINR(result.dvvnl_monthly_saving_inr)}/mo` },
                { l: "Solve time", v: `${Number(solveTime).toFixed(0)}ms` },
                { l: "All ready", v: result.all_ready ? "40/40 ✓" : "Check" },
              ].map(r => (
                <div key={r.l} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  marginBottom: 3,
                }}>
                  <span style={{ color: "#4A5C6A" }}>{r.l}</span>
                  <span style={{ color: "#CCD0CF", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                    {r.v}
                  </span>
                </div>
              ))}
            </div>
          )}

          <motion.button
            onClick={handleRunSchedule}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #7C5CBF, #5b3fa6)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(124,92,191,0.4)",
              transition: "all 0.2s",
            }}
          >
            ▶ Run Schedule
          </motion.button>

          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: isLive ? "#27AE60" : "#F9CA24",
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, color: "#4A5C6A" }}>
              {isLive ? "Live API connected" : "Demo mode"}
            </span>
          </div>
        </div>
      </div>
      )}

      <div style={{ flex: 1, padding: isAdmin ? 0 : 24, overflowY: "auto" }}>
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
            { value: readyCount, label: "Ready by 07:00", accent: "#27AE60" },
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
                40 Mixed EVs | Corporate Fleet, Gurugram | DVVNL HT-2
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
            {chartReady && !dataLoading ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ComposedChart data={chartData} margin={{ top: 8, right: 140, bottom: 4, left: 10 }}>
                  <CartesianGrid stroke="rgba(37,55,69,0.6)" horizontal vertical={false} />
                  <ReferenceArea
                    y1={216}
                    y2={260}
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
                    y={216}
                    stroke="#FF6B35"
                    strokeOpacity={0.7}
                    strokeWidth={1}
                    strokeDasharray="10 6"
                    label={{
                      value: "216 kW limit",
                      position: "insideTopRight",
                      fill: "rgba(255,107,53,0.85)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <ReferenceLine
                    y={240}
                    stroke="#F9CA24"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    label={{
                      value: "240 kW DVVNL billing threshold",
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
                    domain={[0, 350]}
                    tickCount={6}
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

        <MpcLivePanel />

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
              {carbonSignal?.rationale?.slice(0, 60) || "CEA 2024-25 | FirstFlight"}
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
            "CEA India 2024-25",
            "Vahan CY2025",
            "pandapower AC flow",
            "CVXPY + CLARABEL",
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

