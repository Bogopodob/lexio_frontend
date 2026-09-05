import { getUiLang } from '@/lib/i18n'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export interface LibraryTranslationInput {
  language_id: string
  text: string
  transcription?: string
}

async function post<T>(path: string, token: string, payload: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Accept-Language': getUiLang(),
    },
    body: JSON.stringify(payload),
  })
  const body = (await res.json().catch(() => null)) as {
    success?: boolean
    data?: T
    message?: string
  } | null
  if (!res.ok || !body || body.success === false) {
    throw new Error(body?.message ?? `Library request failed (${res.status})`)
  }
  return body.data as T
}

export function createUserEntry(
  userId: string,
  token: string,
  payload: { category_id?: string | null; translations: LibraryTranslationInput[] },
): Promise<{ id: string }> {
  return post(`/library/users/${userId}/entries`, token, payload)
}

export function createUserPhrase(
  userId: string,
  token: string,
  payload: { category_id?: string | null; translations: LibraryTranslationInput[] },
): Promise<{ id: string }> {
  return post(`/library/users/${userId}/phrases`, token, payload)
}
