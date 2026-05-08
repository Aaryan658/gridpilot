import { useEffect, useState } from 'react'

export default function CountUpNumber({ value, prefix = '', unit = '', duration = 2000 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const from = 0
    const to = Number(value || 0)
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return (
    <span>
      {prefix}
      {Math.round(display).toLocaleString('en-IN')}
      {unit}
    </span>
  )
}
