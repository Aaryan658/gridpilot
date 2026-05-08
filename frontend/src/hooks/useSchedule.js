import { useState } from 'react'
import { runSchedule } from '../api/depot'

export function useSchedule() {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const execute = async (payload = { date: '2024-01-15', n_vehicles: 500, enable_v2g: false }) => {
    setLoading(true)
    const response = await runSchedule(payload)
    setResult(response.data)
    setDemoMode(response.demoMode)
    setLoading(false)
    return response.data
  }

  return { execute, result, loading, demoMode }
}
