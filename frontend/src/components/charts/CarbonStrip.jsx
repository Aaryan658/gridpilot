import { signalColor } from '../../utils/colors'

export default function CarbonStrip({ hours }) {
  const currentHour = new Date().getHours()
  return (
    <div className="glass-card relative p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Carbon Signal Strip</div>
        <div className="text-[10px] text-[var(--text-muted)]">Haryana Grid | CEA India 2022-23 | Powered by FirstFlight</div>
      </div>
      <div className="relative flex h-10 gap-1">
        <div className="absolute -top-5 left-[8.4%] text-[11px] text-[#27ae60]">GridPilot charges here</div>
        <div className="absolute -top-5 left-[75%] text-[11px] text-[#c0392b]">GridPilot avoids</div>
        {hours.slice(0, 24).map((hour, index) => (
          <div
            key={`${hour.hour}-${index}`}
            className="group relative flex-1 cursor-pointer rounded transition-transform hover:scale-110"
            style={{ background: `${signalColor(hour.signal)}b3` }}
          >
            {index === currentHour && <span className="absolute inset-y-[-6px] left-1/2 w-[2px] -translate-x-1/2 bg-[#00d4aa] opacity-90 animate-pulse" />}
            <div className="pointer-events-none absolute bottom-12 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-[var(--border-primary)] bg-[#1e2d40] px-3 py-2 text-xs group-hover:block">
              {hour.hour} IST - {hour.intensity} kg CO2/kWh - {hour.signal}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
