import axios from 'axios'

export const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 8000,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    error.isApiOffline = true
    return Promise.reject(error)
  },
)
