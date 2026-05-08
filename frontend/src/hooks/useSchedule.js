import { useState, useEffect } from 'react'

export function useSchedule() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    const handleStart = () => setLoading(true)
    const handleUpdate = (e) => {
      setResult(e.detail)
      setDemoMode(false)
      setLoading(false)
    }
    const handleError = () => {
      setDemoMode(true)
      setLoading(false)
    }

    window.addEventListener('schedule_started', handleStart)
    window.addEventListener('schedule_updated', handleUpdate)
    window.addEventListener('schedule_error', handleError)

    return () => {
      window.removeEventListener('schedule_started', handleStart)
      window.removeEventListener('schedule_updated', handleUpdate)
      window.removeEventListener('schedule_error', handleError)
    }
  }, [])

  const execute = async (payload = { date: '2024-01-15', n_vehicles: 500, enable_v2g: false }) => {
    window.dispatchEvent(new Event('schedule_started'))
    const started = Date.now()
    try {
      const response = await fetch('http://localhost:8000/depot/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('API Error')
      const data = await response.json()
      
      const unmanagedRows = data.physics_simulation?.unmanaged?.rows || []
      const managedRows = data.physics_simulation?.managed?.rows || []
      
      const loadProfile = unmanagedRows.map((uRow, i) => {
        const mRow = managedRows[i] || {}
        const timeStr = uRow.timestamp ? uRow.timestamp.slice(11, 16) : ''
        return {
          time: timeStr,
          unmanaged: uRow.net_load_kw,
          managed: mRow.net_load_kw || 0,
          solar: uRow.solar_kw || 0
        }
      })
      
      const out = { ...data, loadProfile }
      
      const elapsed = Date.now() - started
      if (elapsed < 4000) {
        await new Promise(r => setTimeout(r, 4000 - elapsed))
      }
      
      window.dispatchEvent(new CustomEvent('schedule_updated', { detail: out }))
      return out
    } catch (e) {
      console.error(e)
      const elapsed = Date.now() - started
      if (elapsed < 4000) {
        await new Promise(r => setTimeout(r, 4000 - elapsed))
      }
      window.dispatchEvent(new Event('schedule_error'))
      return null
    }
  }

  return { execute, result, loading, demoMode }
}
