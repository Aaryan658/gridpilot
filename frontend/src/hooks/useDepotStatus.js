import { useEffect, useState } from 'react'
import { fetchDepotStatus } from '../api/depot'
import { mockDashboardData } from '../api/mockData'

export function useDepotStatus() {
  const [status, setStatus] = useState(mockDashboardData.depot.status)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    let mounted = true
    const poll = () => {
      fetchDepotStatus().then((result) => {
        if (!mounted) return
        setStatus(result.data)
        setDemoMode(result.demoMode)
      })
    }
    poll()
    const interval = setInterval(poll, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return { status, demoMode }
}
