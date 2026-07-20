"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { formatINR } from "@/lib/utils";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Bar, BarChart,
} from "recharts";
import SkeletonCard from "@/components/ui/SkeletonCard";
import SkeletonChart from "@/components/ui/SkeletonChart";
import ErrorMessage from "@/components/ui/ErrorMessage";
import EmptyState from "@/components/ui/EmptyState";

type ReportData = {
  date: string;
  depot_name: string;
  run_at: string;
  peak_kw_managed: number;
  peak_kw_unmanaged: number;
  peak_reduction_percent: number;
  demand_charge_managed_inr: number;
  demand_charge_unmanaged_inr: number;
  saving_inr: number;
  saving_monthly_inr: number;
  carbon_saved_kg: number;
  trees_equivalent: number;
  vehicles_ready: number;
  vehicles_total: number;
  overload_events: number;
  solver_status: string;
  solve_time_ms: number;
  load_curve: Array<{ time_label: string; managed_kw: number; unmanaged_kw: number }>;
};

type HistoryEntry = {
  date: string;
  saving_inr: number;
  peak_kw_managed: number;
  carbon_saved_kg: number;
  vehicles_ready: number;
};

// CSV export — framed for the downstream uses real operators actually pull
// this data for (utility demand-response / carbon-credit program enrollment,
// ESG reporting), not generic "download my data" (see docs/research/
// 2026-07-19-customer-facing-surface-ev-charging-software.md §5).
function exportHistoryCsv(history: HistoryEntry[], depotName: string) {
  const header = ["date", "saving_inr", "peak_kw_managed", "carbon_saved_kg", "vehicles_ready"];
  const rows = history.map((h) => [h.date, h.saving_inr, h.peak_kw_managed, h.carbon_saved_kg, h.vehicles_ready]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gridpilot-${depotName.toLowerCase().replace(/\s+/g, "-")}-session-history.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default function ReportPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rep, hist] = await Promise.all([
        apiFetch("/depot/report/latest").catch(() => null),
        apiFetch("/depot/report/history").catch(() => ({ reports: [] })),
      ]);
      setReport(rep);
      setHistory(hist?.reports || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Auto-refresh at 07:00 IST
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      if (ist.getHours() === 7 && ist.getMinutes() === 0) {
        fetchReport();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonChart height={200} />
      </div>
    );
  }

  if (error) return <ErrorMessage message={error} onRetry={fetchReport} />;

  if (!report) {
    return (
      <EmptyState
        title="No reports available yet"
        subtitle="Tonight's report will be ready after the optimization run at 20:00 IST."
      />
    );
  }

  const summary = `GridPilot managed tonight's charging schedule for ${report.depot_name}. ` +
    `Peak demand was reduced from ${report.peak_kw_unmanaged?.toLocaleString()} kW to ` +
    `${report.peak_kw_managed?.toLocaleString()} kW — a ${report.peak_reduction_percent?.toFixed(1)}% reduction — ` +
    `with ${report.overload_events === 0 ? "zero" : report.overload_events} transformer overload events. ` +
    `All ${report.vehicles_ready} vehicles reached 80% State of Charge by 07:00 IST. ` +
    `The DVVNL demand charge for tonight amounts to ${formatINR(report.demand_charge_managed_inr)} ` +
    `versus ${formatINR(report.demand_charge_unmanaged_inr)} unmanaged — ` +
    `a saving of ${formatINR(report.saving_inr)} this month. ` +
    `Carbon emissions avoided: ${report.carbon_saved_kg?.toLocaleString()} kg CO₂, ` +
    `equivalent to ${report.trees_equivalent} trees.`;

  const metrics = [
    { label: "Managed Peak",   value: `${report.peak_kw_managed?.toLocaleString()} kW`, color: "#00C851" },
    { label: "Unmanaged Peak", value: `${report.peak_kw_unmanaged?.toLocaleString()} kW`, color: "#EF4444" },
    { label: "Peak Reduction",  value: `${report.peak_reduction_percent?.toFixed(1)}%`, color: "#00C851" },
    { label: "Monthly Saving",  value: formatINR(report.saving_inr), color: "#00C851" },
    { label: "CO₂ Avoided",     value: `${report.carbon_saved_kg?.toLocaleString()} kg`, color: "#00C851" },
    { label: "Fleet Ready",     value: `${report.vehicles_ready}/${report.vehicles_total}`, color: "#00C851" },
  ];

  return (
    <div className="space-y-6 print:space-y-4 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex items-start justify-between print:border-b print:border-gray-300 print:pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-lg font-bold text-[#00C851] print:text-black">GridPilot</span>
            <span className="text-xs text-gray-500">{report.depot_name}</span>
          </div>
          <h1 className="text-xl font-bold text-white print:text-black">Nightly Operations Report</h1>
          <p className="text-sm text-gray-400 print:text-gray-600 mt-1">
            {report.date ? formatDate(report.date) : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Generated at 07:00 IST</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => exportHistoryCsv(history, report.depot_name)}
            disabled={history.length === 0}
            title="Session history CSV — for demand-response / carbon-credit / ESG reporting"
            className="px-4 py-2 bg-[#2A2D3D] hover:bg-[#3A3D4D] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm text-gray-300 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#2A2D3D] hover:bg-[#3A3D4D] rounded-lg text-sm text-gray-300 transition-colors"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* Metric cards — 2 rows of 3 */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-[#2A2D3D] bg-[#161821] p-5 print:bg-white print:border-gray-300"
          >
            <div className="text-2xl font-bold mb-1" style={{ color: m.color }}>
              <span className="print:text-black">{m.value}</span>
            </div>
            <div className="text-xs text-gray-400 print:text-gray-600">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Summary paragraph */}
      <div className="rounded-xl border border-[#2A2D3D] bg-[#161821] p-6 print:bg-white print:border-gray-300">
        <h2 className="text-sm font-semibold text-gray-300 print:text-black mb-3">Summary</h2>
        <p className="text-sm text-gray-400 print:text-gray-700 leading-relaxed">{summary}</p>
      </div>

      {/* Load curve */}
      {report.load_curve?.length > 0 && (
        <div className="rounded-xl border border-[#2A2D3D] bg-[#161821] p-6 print:bg-white print:border-gray-300 print:break-before-page">
          <h2 className="text-sm font-semibold text-gray-300 print:text-black mb-4">Load Profile</h2>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.load_curve} margin={{ top: 8, right: 20, bottom: 4, left: 10 }}>
                <CartesianGrid stroke="rgba(42,45,61,0.6)" vertical={false} />
                <XAxis dataKey="time_label" tick={{ fill: "#4A5C6A", fontSize: 10 }} tickLine={false} interval={7} />
                <YAxis tick={{ fill: "#4A5C6A", fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 350]} />
                <Tooltip contentStyle={{ background: "#0D1B26", border: "1px solid rgba(74,92,106,0.4)", borderRadius: 8, fontSize: 12 }} />
                <Area dataKey="unmanaged_kw" stroke="#E74C3C" fill="#E74C3C" fillOpacity={0.15} strokeWidth={2} name="Unmanaged" dot={false} />
                <Area dataKey="managed_kw" stroke="#00C851" fill="#00C851" fillOpacity={0.25} strokeWidth={2} name="Managed" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 30-day trend */}
      {history.length > 0 && (
        <div className="rounded-xl border border-[#2A2D3D] bg-[#161821] p-6 print:hidden">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">30-Day Saving Trend</h2>
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={history.slice(0, 30)} margin={{ top: 8, right: 20, bottom: 4, left: 10 }}>
                <CartesianGrid stroke="rgba(42,45,61,0.6)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#4A5C6A", fontSize: 9 }} tickLine={false} />
                <YAxis
                  tick={{ fill: "#4A5C6A", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatINR(v)}
                />
                <Tooltip contentStyle={{ background: "#0D1B26", border: "1px solid rgba(74,92,106,0.4)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="saving_inr" fill="#00C851" radius={[4, 4, 0, 0]} name="Saving (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
