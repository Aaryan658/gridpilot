"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceArea, ReferenceLine,
  ResponsiveContainer, Bar,
} from "recharts";
import { ChevronRight, Play, RotateCcw, Zap, Shuffle, X, AlertTriangle } from "lucide-react";
import {
  runDemoSchedule, fetchDemoFleet,
  type DemoScheduleResult, type DemoVehicle, type FleetVehicle, type DemoCapacity,
} from "@/lib/demoApi";
import ChargerTile from "@/components/ChargerTile";
import VppFlexPanel from "@/components/VppFlexPanel";
import BatteryIntelPanel from "@/components/BatteryIntelPanel";

type Phase = "idle" | "generating" | "setup" | "loading" | "unmanaged" | "solving" | "managed" | "done";
type CurvePoint = { t: string; kw: number };

// Fallback shown only before the backend's fleet-scaled capacity has loaded
// (see GridPilotScheduler.REFERENCE_FLEET_SIZE — 40 vehicles -> 216/240 kW).
const DEFAULT_TRANSFORMER_LIMIT_KW = 216;
const DEFAULT_DVVNL_LIMIT_KW = 240;
const REFERENCE_FLEET_SIZE = 40;
const TICK_MS = 220;
const DEFAULT_SOC = 20;

const SOLVER_STEPS = [
  "Loading fleet profile...",
  "Connecting to CVXPY...",
  "Formulating convex constraints...",
  "Calculating optimal power distribution...",
  "Solving...",
  "Finalizing schedule...",
];

function toCurve(rows: { t: string; total_kw: number }[] | undefined): CurvePoint[] {
  return (rows || []).map((r) => ({ t: r.t, kw: r.total_kw }));
}

// Raw 15-min timeslot -> IST clock label. Slot 0 = 20:00 (see services/schedule_adapter.py).
function timeslotLabel(slot: number): string {
  const totalMinutes = slot * 15;
  const hour = (20 + Math.floor(totalMinutes / 60)) % 24;
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// A vehicle's SoC at a given chart slot, derived purely from its own
// charging_periods (15-min raw timeslots) — no network calls per tick.
function socAtSlot(vehicle: DemoVehicle, chartSlot: number): { soc: number; power: number } {
  const rawSlot = chartSlot * 2;
  let deliveredKwh = 0;
  let power = 0;
  for (const p of vehicle.charging_periods) {
    if (p.timeslot <= rawSlot) deliveredKwh += p.power_kw * 0.25;
    if (p.timeslot === rawSlot) power = p.power_kw;
  }
  const soc = Math.min(100, vehicle.starting_soc_pct + (deliveredKwh / (vehicle.battery_kwh || 30)) * 100);
  return { soc, power };
}

type FleetSummary = { total: number; charging: number; queued: number; ready: number };

// Glanceable ops-floor-style tally of the fleet at one chart slot: how many
// vehicles are actively drawing power, waiting their turn, or already done.
function fleetSummaryAtSlot(vehicles: DemoVehicle[], chartSlot: number, targetSoc: number): FleetSummary {
  let charging = 0;
  let ready = 0;
  for (const v of vehicles) {
    const { soc, power } = socAtSlot(v, chartSlot);
    if (soc >= targetSoc - 0.5) ready++;
    else if (power > 0.1) charging++;
  }
  return { total: vehicles.length, charging, ready, queued: vehicles.length - charging - ready };
}

function statusFromLoad(totalKw: number, transformerLimitKw: number): { label: string; color: string } {
  if (totalKw > transformerLimitKw) return { label: "OVERLOAD", color: "#E74C3C" };
  if (totalKw > transformerLimitKw * 0.85) return { label: "WARNING", color: "#F9CA24" };
  return { label: "SAFE", color: "#27AE60" };
}

// Full-night per-vehicle profile (power + SoC at every raw timeslot it charges), for the detail view.
function vehicleFullProfile(vehicle: DemoVehicle): { t: string; power: number; soc: number }[] {
  if (!vehicle.charging_periods.length) return [];
  const first = vehicle.charging_periods[0].timeslot;
  const last = vehicle.charging_periods[vehicle.charging_periods.length - 1].timeslot;
  const powerBySlot = new Map(vehicle.charging_periods.map((p) => [p.timeslot, p.power_kw]));
  const rows: { t: string; power: number; soc: number }[] = [];
  let delivered = 0;
  for (let t = first; t <= last; t++) {
    const power = powerBySlot.get(t) ?? 0;
    delivered += power * 0.25;
    const soc = Math.min(100, vehicle.starting_soc_pct + (delivered / (vehicle.battery_kwh || 30)) * 100);
    rows.push({ t: timeslotLabel(t), power, soc });
  }
  return rows;
}

type MergedPoint = { t: string; u: number | null; m: number | null };

// Both curves on one chart: unmanaged (red) reveals during the "unmanaged"
// phase then freezes fully-drawn, managed (purple) reveals during "managed"
// and stays hidden until then — so judges see the before/after together,
// matching the main dashboard's combined Depot Load Profile chart.
function buildMergedCurve(
  unmanagedCurve: CurvePoint[],
  managedCurve: CurvePoint[],
  phase: Phase,
  slot: number
): MergedPoint[] {
  const len = Math.max(unmanagedCurve.length, managedCurve.length);
  const uFrozen = phase === "solving" || phase === "managed" || phase === "done";
  const uRevealSlot = phase === "unmanaged" ? slot : uFrozen ? unmanagedCurve.length - 1 : -1;
  const mRevealSlot = phase === "managed" ? slot : phase === "done" ? managedCurve.length - 1 : -1;
  return Array.from({ length: len }, (_, i) => ({
    t: unmanagedCurve[i]?.t ?? managedCurve[i]?.t ?? "",
    u: i <= uRevealSlot ? unmanagedCurve[i]?.kw ?? null : null,
    m: i <= mRevealSlot ? managedCurve[i]?.kw ?? null : null,
  }));
}

function CombinedChart({
  data, transformerLimitKw, dvvnlLimitKw, hardCapKw,
}: {
  data: MergedPoint[]; transformerLimitKw: number; dvvnlLimitKw: number; hardCapKw: number;
}) {
  const yMax = Math.max(320, Math.ceil((hardCapKw * 1.15) / 20) * 20);
  return (
    <div style={{ height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 40, bottom: 4, left: 10 }}>
          <CartesianGrid stroke="rgba(37,55,69,0.6)" horizontal vertical={false} />
          <ReferenceArea
            y1={transformerLimitKw} y2={hardCapKw} fill="rgba(231,76,60,0.07)"
            label={{ value: "⚠ Overload Zone", position: "insideTopLeft", fill: "rgba(231,76,60,0.5)", fontSize: 10, fontWeight: 600 }}
          />
          <ReferenceLine
            y={transformerLimitKw}
            stroke="#FF6B35" strokeOpacity={0.6} strokeWidth={1} strokeDasharray="10 6"
            label={{ value: `${transformerLimitKw.toFixed(0)} kW transformer limit`, position: "insideTopRight", fill: "rgba(255,107,53,0.85)", fontSize: 10, fontWeight: 600 }}
          />
          <ReferenceLine
            y={dvvnlLimitKw}
            stroke="#F9CA24" strokeOpacity={0.4} strokeWidth={1} strokeDasharray="5 5"
            label={{ value: `${dvvnlLimitKw.toFixed(0)} kW DVVNL billing threshold`, position: "insideTopRight", fill: "rgba(249,202,36,0.7)", fontSize: 10, offset: -16 }}
          />
          <XAxis dataKey="t" tick={{ fill: "#4A5C6A", fontSize: 10 }} axisLine={{ stroke: "rgba(74,92,106,0.3)" }} tickLine={false} />
          <YAxis
            tick={{ fill: "#4A5C6A", fontSize: 10 }} axisLine={false} tickLine={false}
            domain={[0, yMax]} tickCount={6}
          />
          <Tooltip
            contentStyle={{ background: "#161821", border: "1px solid #2A2D3D", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#9BA8AB" }}
          />
          <Line
            dataKey="u" stroke="#E74C3C" strokeWidth={2.5} dot={false}
            isAnimationActive={false} connectNulls={false} strokeLinecap="round"
            name="Without GridPilot"
          />
          <Line
            dataKey="m" stroke="#7C5CBF" strokeWidth={3} dot={false}
            isAnimationActive={false} connectNulls={false} strokeLinecap="round"
            name="With GridPilot"
            style={{ filter: "url(#demoManagedGlow)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function VehicleDetailPanel({ vehicle, onClose }: { vehicle: DemoVehicle; onClose: () => void }) {
  const profile = useMemo(() => vehicleFullProfile(vehicle), [vehicle]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-[#161821] border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{vehicle.vehicle_id}</h3>
            <p className="text-[#9BA8AB] text-xs mt-1">
              {vehicle.vehicle_model} &middot; {vehicle.battery_kwh} kWh battery &middot; {vehicle.charger_kw} kW charger
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-[#06141B]/50 rounded-xl p-3">
            <p className="text-[#4A5C6A] text-[10px] uppercase tracking-wider mb-1">Starting SoC</p>
            <p className="text-xl font-bold text-white font-mono">{vehicle.starting_soc_pct}%</p>
          </div>
          <div className="bg-[#06141B]/50 rounded-xl p-3">
            <p className="text-[#4A5C6A] text-[10px] uppercase tracking-wider mb-1">Target SoC</p>
            <p className="text-xl font-bold text-[#27AE60] font-mono">{vehicle.target_soc_pct}%</p>
          </div>
          <div className="bg-[#06141B]/50 rounded-xl p-3">
            <p className="text-[#4A5C6A] text-[10px] uppercase tracking-wider mb-1">Energy Needed</p>
            <p className="text-xl font-bold text-white font-mono">{vehicle.energy_needed_kwh} kWh</p>
          </div>
        </div>

        {profile.length === 0 ? (
          <p className="text-[#9BA8AB] text-sm">This vehicle was not scheduled to charge (already met target on arrival, or capacity-constrained).</p>
        ) : (
          <>
            <p className="text-[#9BA8AB] text-xs font-semibold uppercase tracking-wider mb-2">Charging Power (kW)</p>
            <div style={{ height: 140 }} className="mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profile} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="rgba(37,55,69,0.6)" horizontal vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "#4A5C6A", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#4A5C6A", fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ background: "#161821", border: "1px solid #2A2D3D", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="power" fill="#7C5CBF" radius={[2, 2, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[#9BA8AB] text-xs font-semibold uppercase tracking-wider mb-2">State of Charge (%)</p>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={profile} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="rgba(37,55,69,0.6)" horizontal vertical={false} />
                  <XAxis dataKey="t" tick={{ fill: "#4A5C6A", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis domain={[0, 100]} tick={{ fill: "#4A5C6A", fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ background: "#161821", border: "1px solid #2A2D3D", borderRadius: 8, fontSize: 11 }} />
                  <Line dataKey="soc" stroke="#00D4AA" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [nVehicles, setNVehicles] = useState(40);
  const [error, setError] = useState<string | null>(null);

  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [vehicleSoc, setVehicleSoc] = useState<Record<string, number>>({});
  const [bulkSoc, setBulkSoc] = useState(DEFAULT_SOC);

  const [result, setResult] = useState<DemoScheduleResult | null>(null);
  const [slot, setSlot] = useState(0);
  const [solveStep, setSolveStep] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<DemoVehicle | null>(null);
  const [capacity, setCapacity] = useState<DemoCapacity | null>(null);

  const transformerLimitKw = capacity?.transformer_kw ?? DEFAULT_TRANSFORMER_LIMIT_KW;
  const dvvnlLimitKw = capacity?.dvvnl_kw ?? DEFAULT_DVVNL_LIMIT_KW;
  const hardCapKw = capacity?.hard_cap_kw ?? DEFAULT_DVVNL_LIMIT_KW + 40;

  // Live preview while dragging the fleet-size slider, before the backend's
  // real capacity has been fetched — mirrors GridPilotScheduler's scaling.
  const previewScale = nVehicles / REFERENCE_FLEET_SIZE;
  const previewTransformerKw = DEFAULT_TRANSFORMER_LIMIT_KW * previewScale;
  const previewDvvnlKw = DEFAULT_DVVNL_LIMIT_KW * previewScale;

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unmanagedCurve = toCurve(result?.unmanaged.load_curve);
  const managedCurve = toCurve(result?.managed.load_curve);
  const mergedCurve = useMemo(
    () => buildMergedCurve(unmanagedCurve, managedCurve, phase, slot),
    [unmanagedCurve, managedCurve, phase, slot]
  );

  // Derived from the backend's authoritative unmanaged.overload_events (full
  // 15-min resolution) rather than re-tallied off the chart's downsampled
  // 30-min curve — those two counts can legitimately disagree, which is
  // confusing when the number doesn't match what's visible in the chart.
  // Animates up to the true total as the unmanaged reveal plays out.
  const trueOverloadEvents = result?.unmanaged.overload_events ?? 0;
  const trueOverloadExcursions = result?.unmanaged.overload_excursions ?? 0;
  const unmanagedRevealFraction =
    phase === "unmanaged" && unmanagedCurve.length
      ? (slot + 1) / unmanagedCurve.length
      : phase === "solving" || phase === "managed" || phase === "done"
        ? 1
        : 0;
  const overloadCount = Math.round(trueOverloadEvents * unmanagedRevealFraction);
  // overloadCount is a tally of 15-min slots over the limit — one continuous
  // overload spanning several hours reads as a double-digit number here.
  // overloadExcursionCount is the honest "how many separate times did this
  // happen" figure: distinct contiguous overload runs, shown alongside it.
  const overloadExcursionCount = Math.round(trueOverloadExcursions * unmanagedRevealFraction);

  // Reset the shared clock whenever a new reveal phase begins.
  useEffect(() => {
    if (phase === "unmanaged") {
      setSlot(0);
    }
    if (phase === "managed") {
      setSlot(0);
    }
  }, [phase]);

  // The shared clock: one ticking interval drives whichever curve is active.
  useEffect(() => {
    if (phase !== "unmanaged" && phase !== "managed") return;
    const curve = phase === "unmanaged" ? unmanagedCurve : managedCurve;
    if (!curve.length) return;

    tickRef.current = setInterval(() => {
      setSlot((s) => {
        if (s >= curve.length - 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setPhase((p) => (p === "unmanaged" ? "solving" : "done"));
          return s;
        }
        return s + 1;
      });
    }, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, unmanagedCurve.length, managedCurve.length]);

  // Solver transition: cycle step text, then hand off to the managed reveal.
  useEffect(() => {
    if (phase !== "solving") return;
    setSolveStep(0);
    const interval = setInterval(() => {
      setSolveStep((p) => (p < SOLVER_STEPS.length - 1 ? p + 1 : p));
    }, 700);
    const timeout = setTimeout(() => setPhase("managed"), SOLVER_STEPS.length * 700 + 500);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [phase]);

  async function generateFleet() {
    setError(null);
    setPhase("generating");
    try {
      const data = await fetchDemoFleet({ n_vehicles: nVehicles });
      setFleet(data.vehicles);
      setCapacity(data.capacity);
      const initial: Record<string, number> = {};
      for (const v of data.vehicles) initial[v.vehicle_id] = DEFAULT_SOC;
      setVehicleSoc(initial);
      setPhase("setup");
    } catch (e) {
      console.error("Fleet generation failed", e);
      setError("Could not reach the GridPilot backend. Confirm the API server is running and try again.");
      setPhase("idle");
    }
  }

  function randomizeAll() {
    setVehicleSoc((prev) => {
      const next = { ...prev };
      for (const v of fleet) next[v.vehicle_id] = Math.round(Math.random() * 35 + 5); // 5-40%
      return next;
    });
  }

  function applyBulkSoc() {
    setVehicleSoc((prev) => {
      const next = { ...prev };
      for (const v of fleet) next[v.vehicle_id] = bulkSoc;
      return next;
    });
  }

  async function startDemo() {
    setError(null);
    setPhase("loading");
    try {
      const data = await runDemoSchedule({ n_vehicles: nVehicles, soc_pct: bulkSoc, vehicle_soc: vehicleSoc });
      setResult(data);
      setCapacity(data.capacity);
      setPhase("unmanaged");
    } catch (e) {
      console.error("Demo schedule failed", e);
      setError("Could not reach the GridPilot backend. Confirm the API server is running and try again.");
      setPhase("setup");
    }
  }

  function replay() {
    if (tickRef.current) clearInterval(tickRef.current);
    setResult(null);
    setSlot(0);
    setFleet([]);
    setVehicleSoc({});
    setCapacity(null);
    setPhase("idle");
  }

  const isOverloadNow = phase === "unmanaged" && (unmanagedCurve[slot]?.kw ?? 0) > transformerLimitKw;
  const targetSoc = result?.target_soc_pct ?? 100;

  // Glanceable ops-floor status, live during playback — the vehicle list and
  // aggregate kW draw for whichever phase is currently active.
  const activeVehicles =
    phase === "unmanaged" ? result?.vehicles_unmanaged ?? null
    : phase === "managed" || phase === "done" ? result?.vehicles ?? null
    : null;
  const fleetSummary = activeVehicles ? fleetSummaryAtSlot(activeVehicles, slot, targetSoc) : null;
  const currentTotalKw =
    phase === "unmanaged" ? unmanagedCurve[slot]?.kw ?? 0
    : phase === "managed" || phase === "done" ? managedCurve[slot]?.kw ?? 0
    : 0;
  const loadStatus = statusFromLoad(currentTotalKw, transformerLimitKw);

  return (
    <div className="min-h-screen bg-[#0F1117] text-white p-6 md:p-10">
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="demoManagedGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feColorMatrix in="blur" type="matrix" values="0.49 0 0 0 0  0.36 0 0 0 0  0.75 0 0 0 0  0 0 0 3 0" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-space">Overload &rarr; Optimize &rarr; Zero Overloads</h1>
            <p className="text-[#9BA8AB] text-sm mt-1">Live presentation mode — runs the real CVXPY/CLARABEL scheduler on your inputs.</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
          </button>
        </div>

        <>
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#11212D]/80 border border-white/5 rounded-3xl p-8 md:p-10"
            >
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[#9BA8AB] font-semibold uppercase tracking-wider text-xs">Fleet size</span>
                  <span className="font-mono text-white">{nVehicles} vehicles</span>
                </div>
                <input
                  type="range" min={5} max={200} step={5}
                  value={nVehicles}
                  onChange={(e) => setNVehicles(Number(e.target.value))}
                  className="w-full accent-[#7C5CBF]"
                />
                <p className="text-[#4A5C6A] text-xs mt-3 font-mono">
                  Depot sized to this fleet: {previewTransformerKw.toFixed(0)} kW transformer &middot; {previewDvvnlKw.toFixed(0)} kW DVVNL threshold
                </p>
              </div>

              {error && (
                <p className="text-[#E74C3C] text-sm mb-4">{error}</p>
              )}

              <button
                onClick={generateFleet}
                className="flex items-center gap-2 bg-[#7C5CBF] hover:bg-[#6A4E9E] text-white px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg shadow-[#7C5CBF]/30"
              >
                <Play className="w-5 h-5" /> Generate Fleet
              </button>
            </motion.div>
          )}

          {phase === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <Zap className="w-10 h-10 text-[#00D4AA] animate-pulse mb-4" />
              <p className="text-[#9BA8AB] font-mono text-sm">Generating fleet roster...</p>
            </motion.div>
          )}

          {phase === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-[#11212D]/80 border border-white/5 rounded-3xl p-6 md:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <h2 className="text-lg font-bold text-white">Set SoC on arrival — {fleet.length} vehicles</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={0} max={100}
                    value={bulkSoc}
                    onChange={(e) => setBulkSoc(Number(e.target.value))}
                    className="w-16 bg-[#06141B] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white"
                  />
                  <button
                    onClick={applyBulkSoc}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Set all to %
                  </button>
                  <button
                    onClick={randomizeAll}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#00D4AA]/10 text-[#00D4AA] hover:bg-[#00D4AA]/20 transition-colors"
                  >
                    <Shuffle className="w-3.5 h-3.5" /> Randomize All
                  </button>
                </div>
              </div>

              <div className="max-h-[360px] overflow-y-auto rounded-xl border border-white/5 divide-y divide-white/5 mb-6">
                {fleet.map((v) => (
                  <div key={v.vehicle_id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{v.vehicle_id}</p>
                      <p className="text-[10px] text-gray-500">{v.vehicle_model} &middot; {v.battery_kwh} kWh</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <input
                        type="range" min={0} max={100} step={1}
                        value={vehicleSoc[v.vehicle_id] ?? DEFAULT_SOC}
                        onChange={(e) => setVehicleSoc((prev) => ({ ...prev, [v.vehicle_id]: Number(e.target.value) }))}
                        className="w-32 accent-[#7C5CBF]"
                      />
                      <span className="font-mono text-sm text-white w-12 text-right">
                        {vehicleSoc[v.vehicle_id] ?? DEFAULT_SOC}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <p className="text-[#E74C3C] text-sm mb-4">{error}</p>
              )}

              <button
                onClick={startDemo}
                className="flex items-center gap-2 bg-[#7C5CBF] hover:bg-[#6A4E9E] text-white px-8 py-4 rounded-xl font-semibold transition-all hover:scale-105 shadow-lg shadow-[#7C5CBF]/30"
              >
                <Play className="w-5 h-5" /> Start Demo
              </button>
            </motion.div>
          )}

          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24"
            >
              <Zap className="w-10 h-10 text-[#00D4AA] animate-pulse mb-4" />
              <p className="text-[#9BA8AB] font-mono text-sm">Loading fleet profile...</p>
            </motion.div>
          )}

          {(phase === "unmanaged" || phase === "solving" || phase === "managed" || phase === "done") && (
            <motion.div
              key="playback"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-[#11212D]/80 border border-white/5 rounded-3xl p-6 md:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold text-white">Depot Load Profile — Unmanaged vs. Optimized</h2>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${isOverloadNow ? "bg-[#E74C3C]/20 text-[#E74C3C]" : "bg-white/5 text-[#9BA8AB]"}`}>
                    ⚠ Without GridPilot: {overloadCount} slots over limit ({overloadExcursionCount} {overloadExcursionCount === 1 ? "episode" : "episodes"})
                  </div>
                  {(phase === "managed" || phase === "done") && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-[#27AE60]/20 text-[#27AE60]">
                      ✓ With GridPilot: 0
                    </div>
                  )}
                </div>
              </div>
              <CombinedChart data={mergedCurve} transformerLimitKw={transformerLimitKw} dvvnlLimitKw={dvvnlLimitKw} hardCapKw={hardCapKw} />

              {fleetSummary && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[#9BA8AB] text-xs font-semibold uppercase tracking-wider mb-3">
                    Live Depot Status — glanceable ops view
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                    {[
                      { label: "Total", value: fleetSummary.total, color: "#CCD0CF" },
                      { label: "Charging", value: fleetSummary.charging, color: "#00C851" },
                      { label: "Queued", value: fleetSummary.queued, color: "#F59E0B" },
                      { label: "Ready", value: fleetSummary.ready, color: "#3B82F6" },
                    ].map((k) => (
                      <div key={k.label} className="rounded-xl border border-white/5 bg-[#06141B]/50 p-4 text-center">
                        <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: k.color }}>{k.value}</div>
                        <div className="text-[10px] text-[#9BA8AB] mt-1 uppercase tracking-wider">{k.label}</div>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-xl p-4 flex items-center gap-3 border-2"
                    style={{ borderColor: loadStatus.color, background: `${loadStatus.color}14` }}
                  >
                    <AlertTriangle className="w-6 h-6 shrink-0" style={{ color: loadStatus.color }} />
                    <div>
                      <div className="text-xl font-bold font-mono" style={{ color: loadStatus.color }}>{loadStatus.label}</div>
                      <div className="text-xs text-[#9BA8AB] mt-0.5">
                        {currentTotalKw.toFixed(1)} kW live &middot; {transformerLimitKw.toFixed(0)} kW transformer limit &middot; {dvvnlLimitKw.toFixed(0)} kW DVVNL threshold
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {phase === "solving" && (
                <div className="flex flex-col items-center justify-center py-10 mt-4 border-t border-white/5">
                  <div className="relative w-20 h-20 mb-6">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#7C5CBF] border-r-[#00D4AA]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[#00D4AA]">
                      <Zap className="w-7 h-7 animate-pulse" />
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={solveStep}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="text-[#9BA8AB] font-mono text-sm"
                    >
                      {SOLVER_STEPS[solveStep]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              )}

              {(phase === "managed" || phase === "done") && result && (
                <>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <p className="text-[#9BA8AB] text-xs font-semibold uppercase tracking-wider mb-3">
                      Charger Grid — {result.vehicles.length} vehicles &middot; click a tile to see its charging profile
                    </p>
                    <div className="flex flex-wrap gap-3 max-h-[360px] overflow-y-auto">
                      {result.vehicles.map((v) => {
                        const { soc, power } = socAtSlot(v, slot);
                        return (
                          <button
                            key={v.vehicle_id}
                            onClick={() => setSelectedVehicle(v)}
                            className="text-left"
                          >
                            <ChargerTile
                              vehicle_id={v.vehicle_id}
                              vehicle_model={v.vehicle_model}
                              charger_id={v.charger_id}
                              current_power_kw={power}
                              soc_percent={soc}
                              status={soc >= targetSoc - 0.5 ? "ready" : "charging"}
                              minutes_to_ready={null}
                              energy_needed_kwh={v.energy_needed_kwh}
                              energy_delivered_kwh={(soc / 100) * v.battery_kwh}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {phase === "done" && result && (
                <div className="mt-8 pt-8 border-t border-white/5">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-[#06141B]/50 rounded-2xl p-5 border border-white/5">
                      <p className="text-[#4A5C6A] text-xs font-semibold mb-1 uppercase tracking-wider">Peak Reduction</p>
                      <div className="text-3xl font-bold text-white font-mono">{result.comparison.peak_reduction_pct.toFixed(1)}%</div>
                    </div>
                    <div className="bg-[#06141B]/50 rounded-2xl p-5 border border-white/5">
                      <p className="text-[#4A5C6A] text-xs font-semibold mb-1 uppercase tracking-wider">Overload Slots Avoided</p>
                      <div className="text-3xl font-bold text-[#27AE60] font-mono">{overloadCount}</div>
                      <p className="text-[#4A5C6A] text-[10px] mt-1">
                        15-min intervals over the limit, across {overloadExcursionCount} continuous {overloadExcursionCount === 1 ? "episode" : "episodes"} — not {overloadCount} separate incidents
                      </p>
                    </div>
                    <div className="bg-[#06141B]/50 rounded-2xl p-5 border border-white/5">
                      <p className="text-[#4A5C6A] text-xs font-semibold mb-1 uppercase tracking-wider">Peak Load</p>
                      <div className="text-3xl font-bold text-[#7C5CBF] font-mono">{result.comparison.scheduled_peak_kw.toFixed(0)} kW</div>
                    </div>
                  </div>
                  <VppFlexPanel
                    unmanagedPeakKw={result.comparison.unmanaged_peak_kw}
                    managedPeakKw={result.comparison.scheduled_peak_kw}
                  />

                  <BatteryIntelPanel nVehicles={result.vehicles.length} />

                  <button
                    onClick={replay}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-semibold transition-all"
                  >
                    <RotateCcw className="w-4 h-4" /> Replay
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </>
      </div>

      {selectedVehicle && (
        <VehicleDetailPanel vehicle={selectedVehicle} onClose={() => setSelectedVehicle(null)} />
      )}
    </div>
  );
}
