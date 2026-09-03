const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

const TOKEN_KEY = 'qwicki_token'
const USER_KEY = 'qwicki_user'

export interface AuthUser {
  id: string
  name: string | null
  email: string
}

export interface AuthPayload {
  token: string
  expires_at: string
  expires_in: number
  user: AuthUser
}

export class AuthError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    })
  } catch {
    throw new AuthError('Сервер недоступен. Проверь соединение.', 0)
  }

  const body = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: T
    message?: string
    error?: string
    errors?: Record<string, string[]>
  } | null

  if (!res.ok || !body || body.success === false) {
    const firstValidation = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined
    throw new AuthError(
      firstValidation ?? body?.message ?? body?.error ?? 'Что-то пошло не так',
      res.status,
    )
  }

  return body.data as T
}

export async function loginRequest(email: string, password: string): Promise<AuthPayload> {
  return request<AuthPayload>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function registerRequest(
  email: string,
  password: string,
  name?: string,
): Promise<AuthPayload> {
  return request<AuthPayload>('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name: name || undefined }),
  })
}

export async function logoutRequest(token: string): Promise<void> {
  await request<{ revoked: boolean }>('/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function meRequest(token: string): Promise<AuthUser> {
  const data = await request<{ user?: AuthUser } & AuthUser>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return (data.user ?? data) as AuthUser
}

export function saveSession(payload: AuthPayload) {
  localStorage.setItem(TOKEN_KEY, payload.token)
  localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function loadSession(): { token: string; user: AuthUser } | null {
  const token = localStorage.getItem(TOKEN_KEY)
  const raw = localStorage.getItem(USER_KEY)
  if (!token || !raw) return null
  try {
    return { token, user: JSON.parse(raw) as AuthUser }
  } catch {
    return null
  }
}
