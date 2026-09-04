const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export interface RemoteSession {
  id: string
  profile_id: string
  source: string
  status: 'active' | 'finished' | 'abandoned'
  total: number
  answered: number
  correct: number
  xp_earned: number
  started_at: string | null
  finished_at: string | null
}

export interface RemoteStudyCard {
  learnable_type: string
  learnable_id: string
  front_text: string
  front_transcription: string | null
  back_texts: string[]
  hint: string | null
}

export interface NextCardData {
  session_id: string
  position: number
  total: number
  answered: number
  card: RemoteStudyCard
}

export interface AnswerData {
  session: RemoteSession
  progress: {
    easiness_factor: number
    interval_days: number
    repetition: number
  }
  is_new_word: boolean
  xp_gained: number
  newly_unlocked: string[]
  finished: boolean
  next_card: RemoteStudyCard | null
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

export function startSession(
  userId: string,
  token: string,
  profileId: string,
  opts: { source?: 'due' | 'new' | 'mixed'; category_id?: string; level?: string; limit?: number } = {},
): Promise<RemoteSession> {
  return request(`/learning/users/${userId}/profiles/${profileId}/sessions`, token, {
    method: 'POST',
    body: JSON.stringify({
      source: opts.source ?? 'mixed',
      category_id: opts.category_id,
      level: opts.level,
      limit: opts.limit ?? 20,
    }),
  })
}

export function listSessions(
  userId: string,
  token: string,
  profileId: string,
): Promise<RemoteSession[]> {
  return request(`/learning/users/${userId}/profiles/${profileId}/sessions`, token)
}

export function getNextCard(userId: string, token: string, sessionId: string): Promise<NextCardData> {
  return request(`/learning/users/${userId}/sessions/${sessionId}/next`, token)
}

export function answerCard(
  userId: string,
  token: string,
  sessionId: string,
  learnableId: string,
  quality: number,
): Promise<AnswerData> {
  return request(`/learning/users/${userId}/sessions/${sessionId}/answer`, token, {
    method: 'POST',
    body: JSON.stringify({ learnable_id: learnableId, quality }),
  })
}

export function finishSession(userId: string, token: string, sessionId: string): Promise<RemoteSession> {
  return request(`/learning/users/${userId}/sessions/${sessionId}/finish`, token, {
    method: 'POST',
  })
}
