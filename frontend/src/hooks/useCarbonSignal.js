import { useEffect, useState } from 'react'
import { fetchCarbonSignal } from '../api/depot'
import { mockDashboardData } from '../api/mockData'

export function useCarbonSignal() {
  const [signal, setSignal] = useState(mockDashboardData.depot.carbon_signal)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    fetchCarbonSignal().then((result) => {
      setSignal(result.data)
      setDemoMode(result.demoMode)
    })
  }, [])

  return { signal, demoMode }
}
