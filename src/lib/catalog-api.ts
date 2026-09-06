import { getUiLang, translate } from '@/lib/i18n'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export interface RemoteCategory {
  id: string
  parent_id: string | null
  user_id: string | null
  slug: string
  type: string
  color: string | null
  icon: string | null
  sort: number
  name: string | null
  entries_count: number
  phrases_count?: number
  learned_count?: number
}

async function get<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}`, 'Accept-Language': getUiLang() } : { 'Accept-Language': getUiLang() },
  })
  const body = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: T
  } | null
  if (!res.ok || !body || body.success === false) throw new Error(translate(getUiLang(), 'lib.errors.catalog_failed', { status: res.status }))
  return (body.data ?? []) as T
}

export function listCategories(type?: string, locale: string = getUiLang()): Promise<RemoteCategory[]> {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  params.set('locale', locale)
  return get(`/catalog/categories?${params.toString()}`)
}

export interface WordOfDay {
  date: string
  word: string
  transcription: string | null
  translation: string
  part_of_speech: string | null
  level: string
  forms: string[]
  example: string | null
}

export interface SaveCategoryPayload {
  name: string
  locale?: string
  color?: string
  icon?: string | null
  parent_id?: string | null
}

async function mutateCategory<T>(
  userId: string,
  token: string,
  method: string,
  id: string | null,
  payload?: SaveCategoryPayload,
): Promise<T> {
  const res = await fetch(
    `${API_URL}/catalog/categories${id ? `/${id}` : ''}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Accept-Language': getUiLang(),
      },
      body: payload ? JSON.stringify(payload) : undefined,
    },
  )
  const body = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: T
    message?: string
  } | null
  if (!res.ok || !body || body.success === false) {
    throw new Error(body?.message ?? `Catalog request failed (${res.status})`)
  }
  return body.data as T
}

export function createCategory(
  userId: string,
  token: string,
  payload: SaveCategoryPayload,
): Promise<RemoteCategory> {
  return mutateCategory(userId, token, 'POST', null, payload)
}

export function updateCategory(
  userId: string,
  token: string,
  id: string,
  payload: SaveCategoryPayload,
): Promise<RemoteCategory> {
  return mutateCategory(userId, token, 'PATCH', id, payload)
}

export function deleteCategory(userId: string, token: string, id: string): Promise<void> {
  return mutateCategory(userId, token, 'DELETE', id).then(() => undefined)
}

export function listMyCategories(
  userId: string,
  token: string,
  type?: string,
): Promise<RemoteCategory[]> {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  params.set('locale', getUiLang())
  const query = params.toString()
  return get(`/catalog/categories/mine${query ? `?${query}` : ''}`, token)
}

export function getWordOfDay(date: string): Promise<WordOfDay> {
  return get(`/catalog/word-of-day?date=${encodeURIComponent(date)}`)
}

export interface QuizRound {
  question: { word: string; transcription: string | null }
  options: string[]
  correct_index: number
}

export function getQuizRound(count = 4): Promise<QuizRound> {
  return get(`/catalog/quiz-round?count=${count}`)
}

export function listCategoriesWithProgress(
  userId: string,
  token: string,
  profileId: string,
  type?: string,
  locale: string = getUiLang(),
): Promise<RemoteCategory[]> {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  params.set('locale', locale)
  return get(`/learning/users/${userId}/profiles/${profileId}/categories?${params.toString()}`, token)
}
