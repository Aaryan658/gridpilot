export function saveToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('gridpilot_token', token)
    document.cookie = `gridpilot_token=${token}; path=/; max-age=86400; SameSite=Strict`
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gridpilot_token')
  }
  return null
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('gridpilot_token')
    document.cookie = 'gridpilot_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
  }
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function getUser() {
  const token = getToken()
  if (!token) return null

  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return {
      email: decoded.sub,
      role: decoded.role,
      depot_id: decoded.depot_id,
    }
  } catch (e) {
    return null
  }
}
