'use client'
import { useState, useCallback } from 'react'

const TOKEN_KEY = 'admin_token'

export function useAdminToken() {
  const [token, setTokenState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  })

  const setToken = useCallback((t: string) => {
    localStorage.setItem(TOKEN_KEY, t)
    setTokenState(t)
  }, [])

  const clearToken = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setTokenState(null)
  }, [])

  const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

  return { token, setToken, clearToken, authHeader }
}
