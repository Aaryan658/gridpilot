import { useEffect, useState } from 'react'
import { fetchDashboardData } from '../api/grid'
import { mockDashboardData } from '../api/mockData'

export function useDashboardData() {
  const [data, setData] = useState(mockDashboardData)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    const started = performance.now()
    fetchDashboardData().then((result) => {
      const wait = Math.max(0, 400 - (performance.now() - started))
      setTimeout(() => {
        setData({ ...mockDashboardData, ...result.data })
        setDemoMode(result.demoMode)
        setLoading(false)
      }, wait)
    })
  }, [])

  return { data, loading, demoMode }
}
