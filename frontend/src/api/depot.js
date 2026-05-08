import { apiClient } from './client'
import { mockDashboardData, mockScheduleResult } from './mockData'

export async function fetchDepotStatus() {
  try {
    const { data } = await apiClient.get('/depot/status')
    return { data, demoMode: false }
  } catch {
    return { data: mockDashboardData.depot.status, demoMode: true }
  }
}

export async function fetchCarbonSignal() {
  try {
    const { data } = await apiClient.get('/depot/carbon_signal')
    return { data, demoMode: false }
  } catch {
    return { data: mockDashboardData.depot.carbon_signal, demoMode: true }
  }
}

export async function runSchedule(payload) {
  try {
    const { data } = await apiClient.post('/depot/schedule', payload)
    return { data, demoMode: false }
  } catch {
    return { data: mockScheduleResult, demoMode: true }
  }
}
