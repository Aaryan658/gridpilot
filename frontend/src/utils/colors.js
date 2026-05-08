export const colors = {
  gridpilot: '#7c5cbf',
  firstflight: '#00d4aa',
  unmanaged: '#e74c3c',
  managed: '#7c5cbf',
  solar: '#00d4aa',
  alert: '#ff6b35',
  success: '#4ecdc4',
  warning: '#f9ca24',
  clean: '#27ae60',
  neutral: '#f39c12',
  dirty: '#c0392b',
}

export function signalColor(signal) {
  if (signal === 'CLEAN') return colors.clean
  if (signal === 'DIRTY') return colors.dirty
  return colors.neutral
}
