import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AuthError,
  clearSession,
  loadSession,
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  saveSession,
  type AuthUser,
} from '@/lib/auth-api'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const session = loadSession()
    if (!session) {
      setReady(true)
      return
    }
    meRequest(session.token)
      .then((fresh) => {
        setUser(fresh)
        setToken(session.token)
      })
      .catch((err) => {
        // Drop the session only when the backend rejects the token.
        // Network failures keep the stored session so a reload
        // without connection doesn't log the user out.
        if (err instanceof AuthError && err.status === 401) {
          clearSession()
        } else {
          setUser(session.user)
          setToken(session.token)
        }
      })
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const payload = await loginRequest(email, password)
    saveSession(payload)
    setUser(payload.user)
    setToken(payload.token)
  }, [])

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const payload = await registerRequest(email, password, name)
    saveSession(payload)
    setUser(payload.user)
    setToken(payload.token)
  }, [])

  const logout = useCallback(async () => {
    const current = loadSession()
    if (current) {
      try {
        await logoutRequest(current.token)
      } catch {
        // token already invalid — just drop the local session
      }
    }
    clearSession()
    setUser(null)
    setToken(null)
  }, [])

  const value = useMemo(
    () => ({ user, token, ready, login, register, logout }),
    [user, token, ready, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
