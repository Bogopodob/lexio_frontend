const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export interface RemoteProfile {
  user_id: string
  name: string | null
  lastname: string | null
  surname: string | null
  avatar: string | null
  city: string | null
  birth_date: string | null
  tags: string[] | null
}

export interface RemoteLanguage {
  id: string
  code: string
  name: string
  native_name: string
}

export interface RemoteLearningProfile {
  id: string
  user_id: string
  target_language_id: string
  native_language_id: string
  level: string
  daily_goal: number
  is_active: boolean
  stat?: {
    words_learned: number
    streak_days: number
    xp: number
  } | null
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
  const body = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: T
    message?: string
    error?: string
  } | null
  if (!res.ok || !body || body.success === false) {
    throw new Error(body?.message ?? body?.error ?? `Request failed (${res.status})`)
  }
  return body.data as T
}

export function getProfile(userId: string, token: string): Promise<RemoteProfile> {
  return request<RemoteProfile>(`/users/${userId}/profile`, token)
}

export interface UpdateProfilePayload {
  name?: string | null
  city?: string | null
  birth_date?: string | null
  tags?: string[]
  avatar?: string | null
}

export function updateProfile(
  userId: string,
  token: string,
  payload: UpdateProfilePayload,
): Promise<RemoteProfile> {
  return request<RemoteProfile>(`/users/${userId}/profile`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function listLanguages(): Promise<RemoteLanguage[]> {
  const res = await fetch(`${API_URL}/catalog/languages`)
  const body = (await res.json().catch(() => null)) as { success?: boolean; data?: RemoteLanguage[] } | null
  if (!res.ok || !body || body.success === false) throw new Error('Languages failed')
  return body.data ?? []
}

export function listLearningProfiles(
  userId: string,
  token: string,
): Promise<RemoteLearningProfile[]> {
  return request<RemoteLearningProfile[]>(`/learning/users/${userId}/profiles`, token)
}

export function updateLearningProfile(
  userId: string,
  token: string,
  profileId: string,
  payload: { level?: string; daily_goal?: number; is_active?: boolean },
): Promise<RemoteLearningProfile> {
  return request(`/learning/users/${userId}/profiles/${profileId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function createLearningProfile(
  userId: string,
  token: string,
  targetLanguageId: string,
  nativeLanguageId: string,
): Promise<RemoteLearningProfile & { stat?: unknown }> {
  return request(`/learning/users/${userId}/profiles`, token, {
    method: 'POST',
    body: JSON.stringify({
      target_language_id: targetLanguageId,
      native_language_id: nativeLanguageId,
    }),
  })
}
