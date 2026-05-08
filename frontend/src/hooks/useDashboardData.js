import { useEffect, useState } from 'react'
import { mockDashboardData } from '../api/mockData'

export function useDashboardData() {
  const [data, setData] = useState(mockDashboardData)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetchData = async () => {
      try {
        const res = await fetch('http://localhost:8000/dashboard_data')
        if (!res.ok) throw new Error('Network error')
        const json = await res.json()
        if (mounted) {
          setData(prev => ({ ...prev, ...json }))
          setDemoMode(false)
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          setData(mockDashboardData)
          setDemoMode(true)
          setLoading(false)
        }
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    
    const handleScheduleUpdate = (e) => {
      if (mounted && e.detail) {
        setData(prev => ({ ...prev, ...e.detail }))
      }
    }
    window.addEventListener('schedule_updated', handleScheduleUpdate)
    
    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener('schedule_updated', handleScheduleUpdate)
    }
  }, [])

  return { data, loading, demoMode }
}
