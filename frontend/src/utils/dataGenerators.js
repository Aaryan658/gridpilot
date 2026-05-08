export function buildLoadProfile() {
  return Array.from({ length: 24 }, (_, hour) => {
    const unmanaged =
      hour >= 20 && hour <= 23 ? 3700 : hour >= 0 && hour <= 2 ? 2800 - hour * 450 : 420
    const cleanWindow = hour >= 2 && hour < 5
    const managed = hour >= 20 || hour < 7 ? (cleanWindow ? 2034 : 1550) : 420
    const solar = hour >= 8 && hour <= 17 ? Math.max(0, Math.sin(((hour - 8) / 9) * Math.PI) * 500) : 0
    return {
      time: `${String(hour).padStart(2, '0')}:00`,
      hour,
      unmanaged: Math.round(unmanaged),
      managed: Math.round(managed),
      solar: Math.round(solar),
      carbon: cleanWindow ? 0.73 : hour >= 18 && hour < 22 ? 0.89 : 0.82,
      status: managed > 4000 ? 'CRITICAL' : 'STABLE',
    }
  })
}

export function buildCarbonHours() {
  return Array.from({ length: 24 }, (_, hour) => {
    let intensity = 0.82
    let signal = 'NEUTRAL'
    if (hour >= 2 && hour < 5) {
      intensity = 0.72 + hour * 0.004
      signal = 'CLEAN'
    } else if (hour >= 18 && hour < 22) {
      intensity = 0.88 + (hour - 18) * 0.01
      signal = 'DIRTY'
    } else if (hour >= 8 && hour < 18) {
      intensity = 0.84
      signal = hour > 15 ? 'DIRTY' : 'NEUTRAL'
    }
    return {
      hour: `${String(hour).padStart(2, '0')}:00`,
      intensity: Number(intensity.toFixed(2)),
      signal,
      ev_action: signal === 'CLEAN' ? 'CHARGE_MAX' : signal === 'DIRTY' ? 'MINIMIZE' : 'CHARGE_SCHEDULED',
    }
  })
}

export function buildFleetRows(count = 500) {
  const zones = ['A', 'B', 'C', 'D']
  return Array.from({ length: count }, (_, index) => {
    const zone = zones[index % 4]
    const arrivalMinute = index % 120
    const hour = 20 + Math.floor(arrivalMinute / 60)
    const minute = arrivalMinute % 60
    const ready = index < 500
    return {
      vehicle_id: `NEXON_${String(index + 1).padStart(4, '0')}`,
      zone,
      arrival: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      deadline: '07:00',
      energy_kwh: 22 + (index % 40) / 10,
      soc: 80,
      ready_at: '06:30',
      on_time: ready,
      status: index < 320 ? 'CHARGING' : 'READY',
    }
  })
}
