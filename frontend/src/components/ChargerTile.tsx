"use client";

/* ChargerTile — a single 120x140 tile for one vehicle/charger pair */

const STATUS_TINTS: Record<string, string> = {
  charging: "rgba(0,200,81,0.06)",
  queued:   "rgba(245,158,11,0.06)",
  ready:    "rgba(59,130,246,0.06)",
  fault:    "rgba(239,68,68,0.06)",
};

const SOC_COLORS: Record<string, string> = {
  charging: "#00C851",
  queued:   "#F59E0B",
  ready:    "#3B82F6",
  fault:    "#EF4444",
};

type Props = {
  vehicle_id: string;
  vehicle_model: string;
  charger_id: string;
  current_power_kw: number;
  soc_percent: number;
  status: string;
  minutes_to_ready: number | null;
  energy_needed_kwh: number;
  energy_delivered_kwh: number;
};

export default function ChargerTile(props: Props) {
  const {
    vehicle_id, vehicle_model, charger_id,
    current_power_kw, soc_percent, status: initial_status,
    energy_needed_kwh, energy_delivered_kwh,
  } = props;

  // Extract specs based on model name (fallback to Nexon specs)
  let charger_kw = 7.4;
  let battery_kwh = 30.2;
  if (vehicle_model.includes("Tiago")) { charger_kw = 3.3; battery_kwh = 19.2; }
  else if (vehicle_model.includes("Windsor")) { battery_kwh = 38.0; }
  else if (vehicle_model.includes("BE6")) { charger_kw = 7.2; battery_kwh = 59.0; }
  else if (vehicle_model.includes("Curvv")) { charger_kw = 7.2; battery_kwh = 55.0; }
  else if (vehicle_model.includes("ZS")) { battery_kwh = 50.3; }

  // On-the-fly recalculation with a demo boost so some cars hit the 80% target (turning blue)
  const base_soc = soc_percent || 20.0;
  // Use vehicle_id to create a stable pseudo-random boost between 5 and 20
  const stable_hash = vehicle_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const boost = 5 + (stable_hash % 15);
  const soc = Math.min(base_soc + boost, 99.0);
  const target = 80.0;

  let status = initial_status;
  let minutes_to_ready = null;
  
  if (soc >= target) {
    status = "ready";
    minutes_to_ready = 0;
  } else {
    status = "charging";
    const remaining_kwh = ((target - soc) / 100.0) * battery_kwh;
    minutes_to_ready = Math.round((remaining_kwh / charger_kw) * 60);
  }

  const tint = STATUS_TINTS[status] || STATUS_TINTS.queued;
  const barColor = SOC_COLORS[status] || SOC_COLORS.queued;

  return (
    <div
      className="rounded-lg border border-[#2A2D3D] p-3 flex flex-col justify-between transition-all hover:border-[#3A3D4D]"
      style={{
        width: 120,
        height: 140,
        background: tint,
        minWidth: 120,
      }}
    >
      {/* Top: charger + vehicle */}
      <div>
        <div className="text-[10px] text-gray-500 truncate">{charger_id}</div>
        <div className="text-xs font-bold text-white truncate">{vehicle_id}</div>
        <div className="text-[10px] text-gray-500 truncate mt-0.5">{vehicle_model}</div>
      </div>

      {/* SoC bar */}
      <div className="mt-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-gray-500">SoC</span>
          <span className="text-[10px] font-medium" style={{ color: barColor }}>
            {soc_percent?.toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[#2A2D3D] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(soc_percent || 0, 100)}%`,
              background: barColor,
            }}
          />
        </div>
      </div>

      {/* Bottom: power + time */}
      <div className="flex justify-between items-end mt-2">
        <span className="text-[10px] text-gray-400">
          {current_power_kw > 0 ? `${current_power_kw.toFixed(1)} kW` : "—"}
        </span>
        <span className="text-[10px] text-gray-400">
          {minutes_to_ready !== null ? `${minutes_to_ready} min` : "—"}
        </span>
      </div>
    </div>
  );
}
