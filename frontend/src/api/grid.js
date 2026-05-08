import { apiClient } from './client'
import { mockDashboardData } from './mockData'

export async function fetchForecast(region = 'NR', hours = 24) {
  try {
    const { data } = await apiClient.get(`/grid/forecast?region=${region}&hours=${hours}`)
    return { data, demoMode: false }
  } catch {
    return { data: { region, forecast: mockDashboardData.national.forecast_all_regions[region] }, demoMode: true }
  }
}

export async function fetchDashboardData() {
  try {
    const { data } = await apiClient.get('/dashboard_data')
    return { data, demoMode: false }
  } catch {
    return { data: mockDashboardData, demoMode: true }
  }
}
