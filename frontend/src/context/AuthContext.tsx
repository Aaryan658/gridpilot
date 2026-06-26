'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveToken, removeToken, getToken, getUser } from '@/lib/auth'
import { config } from '@/lib/config'

interface User {
  email: string
  role: string
  depot_id?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  viewAsAdmin: boolean
  setViewAsAdmin: (val: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewAsAdmin, setViewAsAdmin] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = getToken()
      if (storedToken) {
        try {
          const res = await fetch(`${config.apiUrl}/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          })

          if (res.ok) {
            const data = await res.json()
            setToken(storedToken)
            setUser({
              email: data.email,
              role: data.role,
              depot_id: data.depot_id,
            })
          } else {
            removeToken()
          }
        } catch (e) {
          removeToken()
        }
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        throw new Error('Invalid credentials')
      }

      const data = await res.json()
      saveToken(data.access_token)
      setToken(data.access_token)
      setUser({
        email: data.email,
        role: data.role,
        depot_id: data.depot_id,
      })
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    removeToken()
    setToken(null)
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, viewAsAdmin, setViewAsAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
