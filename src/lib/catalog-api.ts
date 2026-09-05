const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export interface RemoteCategory {
  id: string
  parent_id: string | null
  slug: string
  type: string
  color: string | null
  icon: string | null
  sort: number
  name: string | null
  entries_count: number
  learned_count?: number
}

async function get<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: T
  } | null
  if (!res.ok || !body || body.success === false) throw new Error(`Catalog request failed (${res.status})`)
  return (body.data ?? []) as T
}

export function listCategories(type?: string, locale = 'ru'): Promise<RemoteCategory[]> {
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

export function getWordOfDay(date: string): Promise<WordOfDay> {
  return get(`/catalog/word-of-day?date=${encodeURIComponent(date)}`)
}

export function listCategoriesWithProgress(
  userId: string,
  token: string,
  profileId: string,
  type?: string,
  locale = 'ru',
): Promise<RemoteCategory[]> {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  params.set('locale', locale)
  return get(`/learning/users/${userId}/profiles/${profileId}/categories?${params.toString()}`, token)
}
