"use client";
import {
  ComposedChart, Line, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ReferenceLine, ReferenceArea,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { fetchDashboardData, MOCK_DATA } from "@/lib/api";

const LOAD_DATA = [
  {t:"20:00",u:1100,m:1100,s:0},
  {t:"20:30",u:1750,m:1150,s:0},
  {t:"21:00",u:2550,m:1200,s:0},
  {t:"21:30",u:3200,m:1230,s:0},
  {t:"22:00",u:3767,m:1260,s:0},
  {t:"22:30",u:3767,m:1280,s:0},
  {t:"23:00",u:3750,m:1310,s:0},
  {t:"23:30",u:3680,m:1340,s:0},
  {t:"00:00",u:3680,m:1370,s:0},
  {t:"00:30",u:3500,m:1400,s:0},
  {t:"01:00",u:3500,m:1420,s:0},
  {t:"01:30",u:3300,m:1440,s:0},
  {t:"02:00",u:3100,m:1400,s:20},
  {t:"02:30",u:2900,m:1400,s:80},
  {t:"03:00",u:2750,m:1400,s:180},
  {t:"03:30",u:2550,m:1400,s:320},
  {t:"04:00",u:2400,m:1400,s:420},
  {t:"04:30",u:2150,m:1250,s:460},
  {t:"05:00",u:1950,m:1100,s:490},
  {t:"05:30",u:1650,m:850,s:500},
  {t:"06:00",u:1400,m:550,s:500},
  {t:"06:30",u:1100,m:550,s:500},
  {t:"07:00",u:820, m:360,s:500},
  {t:"07:30",u:780, m:360,s:500},
  {t:"08:00",u:730, m:360,s:500},
];

const CARBON_DATA = [
  {h:"00",i:0.72,sig:"NEUTRAL"},
  {h:"01",i:0.71,sig:"NEUTRAL"},
  {h:"02",i:0.64,sig:"CLEAN"},
  {h:"03",i:0.63,sig:"CLEAN"},
  {h:"04",i:0.63,sig:"CLEAN"},
  {h:"05",i:0.66,sig:"CLEAN"},
  {h:"06",i:0.69,sig:"NEUTRAL"},
  {h:"07",i:0.71,sig:"NEUTRAL"},
  {h:"08",i:0.72,sig:"NEUTRAL"},
  {h:"09",i:0.73,sig:"NEUTRAL"},
  {h:"10",i:0.73,sig:"NEUTRAL"},
  {h:"11",i:0.72,sig:"NEUTRAL"},
  {h:"12",i:0.71,sig:"NEUTRAL"},
  {h:"13",i:0.72,sig:"NEUTRAL"},
  {h:"14",i:0.73,sig:"NEUTRAL"},
  {h:"15",i:0.73,sig:"NEUTRAL"},
  {h:"16",i:0.74,sig:"NEUTRAL"},
  {h:"17",i:0.76,sig:"NEUTRAL"},
  {h:"18",i:0.78,sig:"DIRTY"},
  {h:"19",i:0.79,sig:"DIRTY"},
  {h:"20",i:0.79,sig:"DIRTY"},
  {h:"21",i:0.77,sig:"DIRTY"},
  {h:"22",i:0.75,sig:"NEUTRAL"},
  {h:"23",i:0.73,sig:"NEUTRAL"},
];

const SIG_COLORS: Record<string, string> = {
  CLEAN: "#27AE60",
  NEUTRAL: "#F39C12",
  DIRTY: "#C0392B",
};

function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; color: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0D1B26",
      border: "1px solid rgba(74,92,106,0.4)",
      borderRadius: 8,
      padding: "10px 14px",
      fontSize: 12,
    }}>
      <p style={{ color: "#CCD0CF", fontWeight: 600, marginBottom: 8 }}>
        {label} IST
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 4 }}>
          {p.name}:{" "}
          <strong>{Number(p.value).toLocaleString()} kW</strong>
        </p>
      ))}
    </div>
  );
}

function CustomLegend() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      gap: 20,
      marginTop: 12,
    }}>
      {[
        { color: "#E74C3C", label: "Without GridPilot", glow: false, dashed: false },
        { color: "#7C5CBF", label: "With GridPilot", glow: true, dashed: false },
        { color: "#00D4AA", label: "Solar Generation", glow: false, dashed: true },
      ].map(item => (
        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24,
            height: 2,
            borderRadius: 2,
            background: item.dashed ? "transparent" : item.color,
            borderTop: item.dashed ? `2px dashed ${item.color}` : undefined,
            boxShadow: item.glow ? `0 0 8px ${item.color}` : "none",
          }} />
          <span style={{ fontSize: 11, color: "#9BA8AB" }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GridPilotCharts() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const currentHour = new Date().getHours();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [apiData, setApiData] = useState<any>(null);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    fetchDashboardData().then(data => {
      if (data) {
        setApiData(data);
        setApiOnline(true);
      }
    });
  }, []);

  // Derive KPI values from API or mock
  const kpis = apiData
    ? {
        peak_reduction_pct:
          apiData.depot?.schedule_summary
          ?.comparison?.peak_reduction_pct
          ?? MOCK_DATA.kpis.peak_reduction_pct,
        unmanaged_peak_kw:
          apiData.depot?.schedule_summary
          ?.comparison?.unmanaged_peak_kw
          ?? MOCK_DATA.kpis.unmanaged_peak_kw,
        managed_peak_kw:
          apiData.depot?.schedule_summary
          ?.comparison?.scheduled_peak_kw
          ?? MOCK_DATA.kpis.managed_peak_kw,
        dvvnl_monthly_saving_inr:
          apiData.depot?.schedule_summary
          ?.comparison?.dvvnl_monthly_saving_inr
          ?? MOCK_DATA.kpis.dvvnl_monthly_saving_inr,
        carbon_saved_kg: (
          (apiData.depot?.schedule_summary
          ?.comparison?.unmanaged_carbon_kg ?? 0) -
          (apiData.depot?.schedule_summary
          ?.comparison?.scheduled_carbon_kg ?? 0)
        ) || MOCK_DATA.kpis.carbon_saved_kg,
        all_ready:
          apiData.depot?.schedule_summary
          ?.all_ready_on_time
          ?? MOCK_DATA.kpis.all_ready,
      }
    : MOCK_DATA.kpis;

  const KPI_CARDS = [
    {
      value: `${kpis.peak_reduction_pct.toFixed(1)}%`,
      label: "Peak Load Reduced",
      sub: `${kpis.unmanaged_peak_kw.toLocaleString()} → ${Math.round(kpis.managed_peak_kw).toLocaleString()} kW`,
      accent: "#4ECDC4",
    },
    {
      value: `${Math.round(kpis.carbon_saved_kg)} kg`,
      label: "CO₂ Saved/Night",
      sub: "vs unmanaged charging",
      accent: "#00D4AA",
    },
    {
      value: `₹${(kpis.dvvnl_monthly_saving_inr / 100000).toFixed(2)}L`,
      label: "DVVNL Saving/Month",
      sub: "demand charge reduction",
      accent: "#F9CA24",
    },
    {
      value: kpis.all_ready ? "500/500" : "453/500",
      label: "Vehicles Ready",
      sub: "by 07:00 IST deadline",
      accent: "#27AE60",
    },
  ];

  return (
    <div className="w-full flex flex-col gap-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {KPI_CARDS.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className="card-premium p-5 relative overflow-hidden"
            style={{ cursor: "default" }}
          >
            {/* Accent bar */}
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: 2,
              background: card.accent,
            }} />
            {/* Ambient glow */}
            <div style={{
              position: "absolute",
              top: -40, right: -40,
              width: 100, height: 100,
              borderRadius: "50%",
              background: card.accent,
              opacity: 0.04,
              filter: "blur(40px)",
              pointerEvents: "none",
            }} />
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#CCD0CF",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              marginBottom: 8,
            }}>
              {card.value}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9BA8AB", marginBottom: 4 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 11, color: "#4A5C6A" }}>
              {card.sub}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Load Chart */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="card-premium p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#CCD0CF", marginBottom: 4 }}>
              Depot Load Profile
            </h3>
            <p style={{ fontSize: 11, color: "#4A5C6A" }}>
              500 Mixed EVs (Vahan CY2025) | Corporate Fleet, Gurugram | DVVNL HT-2 Tariff
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 20,
            background: "rgba(39,174,96,0.08)",
            border: "1px solid rgba(39,174,96,0.25)",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#27AE60",
              animation: "pulse-glow 2s infinite",
            }} />
            <span style={{
              fontSize: 10, fontWeight: 600, color: "#27AE60",
              textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              STABLE
            </span>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: 8,
          }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: "50%",
              background: apiOnline
                ? "#27AE60" : "#F9CA24",
            }} />
            <span style={{
              fontSize: 9,
              color: apiOnline ? "#27AE60" : "#F9CA24",
              textTransform: "uppercase" as const,
              letterSpacing: "0.08em",
            }}>
              {apiOnline ? "LIVE" : "DEMO"}
            </span>
          </div>
        </div>

        {/* SVG filters */}
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <defs>
            <filter id="managedGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur"/>
              <feColorMatrix
                in="blur" type="matrix"
                values="0.49 0 0 0 0  0.36 0 0 0 0  0.75 0 0 0 0  0 0 0 3 0"
                result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="solarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00D4AA" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#00D4AA" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>

        <div style={{ height: 360, minWidth: 0, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={LOAD_DATA}
              margin={{ top: 8, right: 160, bottom: 4, left: 10 }}
            >
              <CartesianGrid
                stroke="rgba(37,55,69,0.6)"
                horizontal={true}
                vertical={false}
              />

              {/* Overload zone */}
              <ReferenceArea
                y1={4000} y2={4600}
                fill="rgba(231,76,60,0.07)"
                label={{
                  value: "⚠ Overload Zone",
                  position: "center",
                  fill: "rgba(231,76,60,0.5)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />

              {/* Clean window */}
              <ReferenceArea
                x1="02:00" x2="05:00"
                fill="rgba(39,174,96,0.05)"
                label={{
                  value: "🌙 Clean Window",
                  position: "insideTopLeft",
                  fill: "rgba(39,174,96,0.6)",
                  fontSize: 10,
                  offset: 8,
                }}
              />

              {/* Transformer limit */}
              <ReferenceLine
                y={4000}
                stroke="#FF6B35"
                strokeOpacity={0.6}
                strokeWidth={1}
                strokeDasharray="10 6"
                label={{
                  value: "4,000 kW limit",
                  position: "insideTopRight",
                  fill: "rgba(255,107,53,0.85)",
                  fontSize: 10,
                  fontWeight: 600,
                  offset: -4,
                }}
              />

              {/* DVVNL penalty */}
              <ReferenceLine
                y={4500}
                stroke="#F9CA24"
                strokeOpacity={0.4}
                strokeWidth={1}
                strokeDasharray="5 5"
                label={{
                  value: "4,500 kW penalty",
                  position: "insideTopRight",
                  fill: "rgba(249,202,36,0.7)",
                  fontSize: 10,
                  offset: -20,
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
                domain={[0, 5000]}
                tickFormatter={(v: number) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : String(v)}
                tickCount={6}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Solar area */}
              <Area
                dataKey="s"
                stroke="rgba(0,212,170,0.35)"
                strokeWidth={1}
                strokeDasharray="4 4"
                fill="url(#solarFill)"
                dot={false}
                name="Solar"
                animationDuration={1500}
              />

              {/* Unmanaged — DANGER line */}
              <Line
                dataKey="u"
                stroke="#E74C3C"
                strokeWidth={2.5}
                dot={false}
                name="Without GridPilot"
                animationDuration={1800}
                strokeLinecap="round"
              />

              {/* Managed — GRIDPILOT HERO line */}
              <Line
                dataKey="m"
                stroke="#7C5CBF"
                strokeWidth={3}
                dot={false}
                name="With GridPilot"
                animationDuration={2000}
                strokeLinecap="round"
                style={{ filter: "url(#managedGlow)" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <CustomLegend />
      </motion.div>

      {/* Carbon Signal Strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={mounted ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="card-premium p-5"
      >
        <div className="flex justify-between items-center mb-3">
          <span style={{
            fontSize: 12, fontWeight: 600, color: "#9BA8AB",
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Carbon Intensity — Haryana Grid
          </span>
          <span style={{ fontSize: 10, color: "#4A5C6A" }}>
            CEA India 2024-25 | Powered by FirstFlight
          </span>
        </div>

        {/* Annotations */}
        <div className="relative mb-1" style={{ height: 16 }}>
          <span style={{
            position: "absolute",
            left: `${(2 / 24) * 100}%`,
            fontSize: 10, color: "#27AE60", fontWeight: 600,
            whiteSpace: "nowrap",
          }}>
            charges here ↓
          </span>
          <span style={{
            position: "absolute",
            left: `${(18 / 24) * 100}%`,
            transform: "translateX(-50%)",
            fontSize: 10, color: "#C0392B", fontWeight: 600,
            whiteSpace: "nowrap",
          }}>
            avoids ↑
          </span>
        </div>

        {/* Blocks */}
        <div style={{
          display: "flex", gap: 3, height: 36, position: "relative",
        }}>
          {CARBON_DATA.map((d, i) => (
            <div
              key={d.h}
              title={`${d.h}:00 — ${d.i} kg CO₂/kWh — ${d.sig}`}
              style={{
                flex: 1,
                borderRadius: 6,
                background: SIG_COLORS[d.sig],
                opacity: d.sig === "NEUTRAL" ? 0.5 : 0.8,
                cursor: "pointer",
                outline: i === currentHour ? "1.5px solid #00D4AA" : "none",
                transition: "transform 0.15s, opacity 0.15s",
              }}
              onMouseEnter={e => {
                (e.target as HTMLDivElement).style.transform = "scaleY(1.15)";
                (e.target as HTMLDivElement).style.opacity = "1";
              }}
              onMouseLeave={e => {
                (e.target as HTMLDivElement).style.transform = "scaleY(1)";
                (e.target as HTMLDivElement).style.opacity = d.sig === "NEUTRAL" ? "0.5" : "0.8";
              }}
            />
          ))}
          {/* Current time line */}
          <div style={{
            position: "absolute",
            left: `${(currentHour / 24) * 100}%`,
            top: -4, bottom: -4, width: 2,
            background: "#00D4AA", borderRadius: 1,
            boxShadow: "0 0 8px rgba(0,212,170,0.8)",
          }} />
        </div>

        {/* Hour labels */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          marginTop: 6, padding: "0 2px",
        }}>
          {["00:00", "06:00", "12:00", "18:00", "23:00"].map(h => (
            <span key={h} style={{ fontSize: 10, color: "#4A5C6A" }}>
              {h}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Data sources footnote */}
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {[
          "ACN-Data (Caltech)",
          "CEA India 2024-25",
          "Vahan CY2025",
          "CVXPY + CLARABEL",
          "pandapower AC flow",
        ].map(src => (
          <span key={src} style={{
            padding: "3px 10px", borderRadius: 12,
            background: "var(--surface-2)",
            border: "1px solid rgba(74,92,106,0.3)",
            fontSize: 10, color: "#4A5C6A",
          }}>
            {src}
          </span>
        ))}
      </div>
    </div>
  );
}
