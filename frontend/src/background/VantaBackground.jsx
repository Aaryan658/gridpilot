import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function VantaBackground() {
  const vantaRef = useRef(null)
  const effectRef = useRef(null)
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    let frameCount = 0
    let start = performance.now()
    let raf = 0

    const measure = () => {
      frameCount += 1
      const elapsed = performance.now() - start
      if (elapsed >= 1800) {
        const fps = (frameCount * 1000) / elapsed
        if (fps < 25) setDisabled(true)
        frameCount = 0
        start = performance.now()
      }
      raf = requestAnimationFrame(measure)
    }
    raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (disabled || effectRef.current || !vantaRef.current) return undefined
    let cancelled = false

    import('vanta/dist/vanta.net.min').then((module) => {
      if (cancelled || !vantaRef.current) return
      const VANTA = module.default
      effectRef.current = VANTA({
        el: vantaRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        color: 0x7c5cbf,
        backgroundColor: 0x0a0e1a,
        points: 8.0,
        maxDistance: 20.0,
        spacing: 18.0,
        opacity: 0.35,
      })
    })

    return () => {
      cancelled = true
      if (effectRef.current) {
        effectRef.current.destroy()
        effectRef.current = null
      }
    }
  }, [disabled])

  return (
    <div
      ref={vantaRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        background: disabled
          ? 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0d1929 100%)'
          : '#0a0e1a',
      }}
    />
  )
}
