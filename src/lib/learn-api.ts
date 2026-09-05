const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export interface RemoteSession {
  id: string
  profile_id: string
  source: string
  category_id: string | null
  status: 'active' | 'finished' | 'abandoned'
  total: number
  answered: number
  correct: number
  xp_earned: number
  started_at: string | null
  finished_at: string | null
}

export interface RemoteWordForm {
  form: string
  form_type: string
  transcription: string | null
}

export interface RemoteStudyCard {
  learnable_type: string
  learnable_id: string
  front_text: string
  front_transcription: string | null
  back_texts: string[]
  hint: string | null
  target_texts?: string[]
  native_texts?: string[]
  own_hint?: string | null
  forms?: RemoteWordForm[]
  forms_pattern?: string | null
}

export interface RemoteProgress {
  easiness_factor: number
  interval_days: number
  repetition: number
  quality_last: number
  next_review_at: string | null
  last_reviewed_at: string | null
}

export interface NextCardData {
  session_id: string
  position: number
  total: number
  answered: number
  card: RemoteStudyCard
  progress: RemoteProgress | null
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
  requeued: boolean
  next_card: RemoteStudyCard | null
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'ru',
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
  opts: {
    source?: 'due' | 'new' | 'mixed'
    category_id?: string
    level?: string
    limit?: number
    offset?: number
  } = {},
): Promise<RemoteSession> {
  return request(`/learning/users/${userId}/profiles/${profileId}/sessions`, token, {
    method: 'POST',
    body: JSON.stringify({
      source: opts.source ?? 'mixed',
      category_id: opts.category_id,
      level: opts.level,
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
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

export interface Availability {
  due: number
  new: number
}

export interface WeeklyDay {
  date: string
  minutes: number
  words: number
  xp: number
}

export function getWeekly(
  userId: string,
  token: string,
  profileId: string,
  days = 7,
): Promise<WeeklyDay[]> {
  return request(
    `/learning/users/${userId}/profiles/${profileId}/weekly?days=${days}`,
    token,
  )
}

export function getAvailability(
  userId: string,
  token: string,
  profileId: string,
  opts: { category_id?: string; level?: string } = {},
): Promise<Availability> {
  const params = new URLSearchParams()
  if (opts.category_id) params.set('category_id', opts.category_id)
  if (opts.level) params.set('level', opts.level)
  const query = params.toString()
  return request(`/learning/users/${userId}/profiles/${profileId}/availability${query ? `?${query}` : ''}`, token)
}

export function finishSession(userId: string, token: string, sessionId: string): Promise<RemoteSession> {
  return request(`/learning/users/${userId}/sessions/${sessionId}/finish`, token, {
    method: 'POST',
  })
}

export function getDistractors(
  userId: string,
  token: string,
  profileId: string,
  opts: {
    learnable_type: string
    learnable_id: string
    side: 'target' | 'native'
    category_id?: string
    count?: number
  },
): Promise<string[]> {
  const params = new URLSearchParams({
    learnable_type: opts.learnable_type,
    learnable_id: opts.learnable_id,
    side: opts.side,
  })
  if (opts.category_id) params.set('category_id', opts.category_id)
  params.set('count', String(opts.count ?? 3))
  return request<{ options: string[] }>(
    `/learning/users/${userId}/profiles/${profileId}/distractors?${params.toString()}`,
    token,
  ).then((d) => d.options)
}

export interface WordHintData {
  learnable_type: string
  learnable_id: string
  own_hint: string | null
}

export function saveWordHint(
  userId: string,
  token: string,
  profileId: string,
  opts: { learnable_type: string; learnable_id: string; own_hint: string },
): Promise<WordHintData> {
  return request(`/learning/users/${userId}/profiles/${profileId}/word-hint`, token, {
    method: 'POST',
    body: JSON.stringify(opts),
  })
}
