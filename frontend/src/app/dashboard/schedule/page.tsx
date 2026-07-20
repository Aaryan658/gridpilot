"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import SkeletonCard from "@/components/ui/SkeletonCard";
import SkeletonChart from "@/components/ui/SkeletonChart";
import SkeletonTable from "@/components/ui/SkeletonTable";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";

/* ---------- types ---------- */
type VehicleStatus = {
  vehicle_id: string;
  vehicle_model: string;
  charger_id: string;
  energy_needed_kwh: number;
  energy_delivered_kwh: number;
  soc_percent: number;
  scheduled_start_slot: number | null;
  status: string;
  minutes_to_ready: number | null;
  battery_kwh: number;
  charger_kw: number;
};

type LoadPoint = {
  timeslot: number;
  time_label: string;
  managed_kw: number;
  unmanaged_kw: number;
};

type ScheduleData = {
  run_id: string;
  run_at: string;
  solver_status: string;
  solve_time_ms: number;
  peak_kw_managed: number;
  peak_kw_unmanaged: number;
  peak_reduction_percent: number;
  saving_inr: number;
  carbon_saved_kg: number;
  vehicles_ready: number;
  vehicles_total: number;
  overload_events: number;
  load_curve: LoadPoint[];
  vehicles: VehicleStatus[];
};

/* ---------- helpers ---------- */
const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  queued:   { bg: "bg-amber-500/15 border-amber-500/30", text: "text-amber-400" },
  charging: { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400" },
  ready:    { bg: "bg-blue-500/15 border-blue-500/30", text: "text-blue-400" },
  fault:    { bg: "bg-red-500/15 border-red-500/30", text: "text-red-400" },
};

const FILTERS = ["All", "Charging", "Queued", "Ready", "Fault"] as const;

function slotToTime(slot: number | null): string {
  if (slot === null || slot === undefined) return "—";
  const baseHour = 20;
  const mins = slot * 15;
  const h = (baseHour + Math.floor(mins / 60)) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatRunAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }) + " IST";
}

/* ---------- component ---------- */
export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("All");
  const [showAll, setShowAll] = useState(false);
  const [sortCol, setSortCol] = useState<string>("vehicle_id");
  const [sortAsc, setSortAsc] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/depot/schedule/latest");
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load schedule";
      if (msg.includes("404")) {
        setData(null);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Filtered + sorted vehicles */
  const vehicles = useMemo(() => {
    if (!data?.vehicles) return [];
    let list = data.vehicles;
    if (filter !== "All") {
      list = list.filter((v) => v.status === filter.toLowerCase());
    }
    list = [...list].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortCol];
      const bVal = (b as Record<string, unknown>)[sortCol];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
        : String(bVal ?? "").localeCompare(String(aVal ?? ""));
    });
    return showAll ? list : list.slice(0, 20);
  }, [data, filter, showAll, sortCol, sortAsc]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortAsc((p) => !p);
    else { setSortCol(col); setSortAsc(true); }
  };

  /* ---------- loading ---------- */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <SkeletonChart height={280} />
        <SkeletonTable rows={10} columns={6} />
      </div>
    );
  }

  /* ---------- error ---------- */
  if (error) {
    return <ErrorMessage message={error} onRetry={fetchData} />;
  }

  /* ---------- no data ---------- */
  if (!data) {
    return (
      <EmptyState
        title="No schedule available yet"
        subtitle="Optimization runs at 20:00 IST tonight. Check back then."
      />
    );
  }

  /* ---------- stat cards ---------- */
  const cards = [
    { label: "Managed Peak", value: `${data.peak_kw_managed?.toLocaleString()} kW`, color: "#00C851" },
    { label: "Peak Reduction", value: `${data.peak_reduction_percent?.toFixed(1)}%`, color: "#00C851" },
    { label: "Monthly Saving", value: formatINR(data.saving_inr), color: "#00C851" },
    { label: "Fleet Ready", value: `${data.vehicles_ready}/${data.vehicles_total}`, color: "#00C851" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Tonight&apos;s Schedule</h1>
          <p className="text-xs text-gray-500 mt-1">
            Last run: {data.run_at ? formatRunAt(data.run_at) : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {data.solver_status}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[#2A2D3D] bg-[#161821] p-5 relative overflow-hidden"
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-r"
              style={{ background: c.color }}
            />
            <div className="text-2xl font-bold text-white mb-1 pl-3">{c.value}</div>
            <div className="text-xs text-gray-400 pl-3">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Load curve chart */}
      {data.load_curve?.length > 0 && (
        <div className="rounded-xl border border-[#2A2D3D] bg-[#161821] p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Load Profile — 20:00 to 07:00</h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.load_curve} margin={{ top: 8, right: 20, bottom: 4, left: 10 }}>
                <CartesianGrid stroke="rgba(42,45,61,0.6)" vertical={false} />
                <XAxis
                  dataKey="time_label"
                  tick={{ fill: "#4A5C6A", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(74,92,106,0.3)" }}
                  tickLine={false}
                  interval={7}
                />
                <YAxis
                  tick={{ fill: "#4A5C6A", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 350]}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0D1B26",
                    border: "1px solid rgba(74,92,106,0.4)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <ReferenceLine y={216} stroke="#FF6B35" strokeDasharray="10 6" strokeOpacity={0.6}
                  label={{ value: "Transformer Limit", position: "insideTopRight", fill: "rgba(255,107,53,0.85)", fontSize: 10 }}
                />
                <ReferenceLine y={135} stroke="#00C851" strokeDasharray="6 4" strokeOpacity={0.5}
                  label={{ value: "GridPilot Target", position: "insideTopRight", fill: "rgba(0,200,81,0.7)", fontSize: 10 }}
                />
                <Area dataKey="unmanaged_kw" stroke="#E74C3C" fill="#E74C3C" fillOpacity={0.15} strokeWidth={2} name="Unmanaged" dot={false} />
                <Area dataKey="managed_kw" stroke="#00C851" fill="#00C851" fillOpacity={0.25} strokeWidth={2} name="Managed" dot={false} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9BA8AB" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Vehicle table */}
      <div className="rounded-xl border border-[#2A2D3D] bg-[#161821] overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-[#2A2D3D]">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setShowAll(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-[#00C851]/15 text-[#00C851] border border-[#00C851]/30"
                  : "text-gray-400 hover:bg-[#2A2D3D] border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-[#2A2D3D]">
                {[
                  { key: "vehicle_id", label: "Vehicle ID" },
                  { key: "vehicle_model", label: "Model" },
                  { key: "energy_needed_kwh", label: "Energy Needed" },
                  { key: "soc_percent", label: "SoC" },
                  { key: "scheduled_start_slot", label: "Scheduled Start" },
                  { key: "status", label: "Status" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="px-6 py-3 cursor-pointer hover:text-gray-300 transition-colors"
                  >
                    {col.label}
                    {sortCol === col.key && (
                      <span className="ml-1">{sortAsc ? "↑" : "↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const badge = STATUS_BADGES[v.status] || STATUS_BADGES.queued;
                return (
                  <tr key={v.vehicle_id} className="border-b border-[#1A1D2A] hover:bg-[#1A1D2A]/50 transition-colors">
                    <td className="px-6 py-3 text-white font-medium">{v.vehicle_id}</td>
                    <td className="px-6 py-3 text-gray-300">{v.vehicle_model}</td>
                    <td className="px-6 py-3 text-gray-300">{v.energy_needed_kwh?.toFixed(1)} kWh</td>
                    <td className="px-6 py-3 text-gray-300">{v.soc_percent?.toFixed(0)}%</td>
                    <td className="px-6 py-3 text-gray-300">{slotToTime(v.scheduled_start_slot)}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${badge.bg} ${badge.text}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Show all button */}
        {!showAll && data.vehicles?.length > 20 && (
          <div className="px-6 py-4 border-t border-[#2A2D3D]">
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-[#00C851] hover:text-[#00A844] font-medium transition-colors"
            >
              Show all {data.vehicles.length} vehicles →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
