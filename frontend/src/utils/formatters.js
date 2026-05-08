export function formatKw(value) {
  return `${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kW`
}

export function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatKg(value) {
  return `${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg`
}

export function pct(value) {
  return `${Number(value || 0).toFixed(1)}%`
}
