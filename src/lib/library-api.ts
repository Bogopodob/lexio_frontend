import { getUiLang } from '@/lib/i18n'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export interface LibraryTranslationInput {
  language_id: string
  text: string
  transcription?: string
  part_of_speech?: string
  notes?: string
  audio_path?: string
}

export interface RemoteUserTranslation {
  id: string
  language_id: string
  text: string
  transcription: string | null
  part_of_speech?: string | null
  notes: string | null
  audio_path: string | null
}

export interface RemoteUserEntry {
  id: string
  category_id: string | null
  image_path: string | null
  translations: RemoteUserTranslation[]
}

export interface RemoteUserPhrase {
  id: string
  category_id: string | null
  image_path: string | null
  phrase_type: string
  translations: RemoteUserTranslation[]
}

export interface RemoteMedia {
  id: string
  kind: string
  mime: string
  bytes: number
}

async function request<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Accept-Language': getUiLang(),
      ...(init.headers ?? {}),
    },
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

function post<T>(path: string, token: string, payload: unknown): Promise<T> {
  return request<T>(path, token, { method: 'POST', body: JSON.stringify(payload) })
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

export function listUserEntries(
  userId: string,
  token: string,
  opts: { category_id?: string; language_id?: string } = {},
): Promise<RemoteUserEntry[]> {
  const params = new URLSearchParams()
  if (opts.category_id) params.set('category_id', opts.category_id)
  if (opts.language_id) params.set('language_id', opts.language_id)
  const query = params.toString()
  return request(`/library/users/${userId}/entries${query ? `?${query}` : ''}`, token)
}

export function listUserPhrases(
  userId: string,
  token: string,
  opts: { category_id?: string; language_id?: string } = {},
): Promise<RemoteUserPhrase[]> {
  const params = new URLSearchParams()
  if (opts.category_id) params.set('category_id', opts.category_id)
  if (opts.language_id) params.set('language_id', opts.language_id)
  const query = params.toString()
  return request(`/library/users/${userId}/phrases${query ? `?${query}` : ''}`, token)
}

export function updateUserEntry(
  userId: string,
  token: string,
  entryId: string,
  payload: { category_id?: string | null; image_path?: string | null; translations: LibraryTranslationInput[] },
): Promise<RemoteUserEntry> {
  return request(`/library/users/${userId}/entries/${entryId}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteUserEntry(userId: string, token: string, entryId: string): Promise<void> {
  return request(`/library/users/${userId}/entries/${entryId}`, token, { method: 'DELETE' }).then(
    () => undefined,
  )
}

export function updateUserPhrase(
  userId: string,
  token: string,
  phraseId: string,
  payload: {
    category_id?: string | null
    image_path?: string | null
    phrase_type?: string
    translations: LibraryTranslationInput[]
  },
): Promise<RemoteUserPhrase> {
  return request(`/library/users/${userId}/phrases/${phraseId}`, token, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteUserPhrase(userId: string, token: string, phraseId: string): Promise<void> {
  return request(`/library/users/${userId}/phrases/${phraseId}`, token, { method: 'DELETE' }).then(
    () => undefined,
  )
}

export function uploadLibraryMedia(
  userId: string,
  token: string,
  kind: 'image' | 'audio',
  blob: Blob,
  filename: string,
): Promise<RemoteMedia> {
  const form = new FormData()
  form.append('kind', kind)
  form.append('file', blob, filename)
  return fetch(`${API_URL}/library/users/${userId}/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Accept-Language': getUiLang() },
    body: form,
  })
    .then(async (res) => {
      const body = (await res.json().catch(() => null)) as {
        success?: boolean
        data?: RemoteMedia
        message?: string
      } | null
      if (!res.ok || !body || body.success === false || !body.data) {
        throw new Error(body?.message ?? `Upload failed (${res.status})`)
      }
      return body.data
    })
}

/** Stored media paths are relative (e.g. /library/users/<id>/media/<id>). */
export function mediaSrc(path: string | null): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path) || path.startsWith('blob:') || path.startsWith('data:')) return path
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export function mediaStreamPath(userId: string, mediaId: string): string {
  return `/library/users/${userId}/media/${mediaId}`
}

export interface LibraryShare {
  id: string
  friend_user_id: string
  friend_name: string | null
}

export interface SharedTopic {
  id: string
  name: string | null
  owner_name: string | null
  words_count: number
}

export function shareCategory(
  userId: string,
  token: string,
  payload: { category_id: string; friend_user_id: string },
): Promise<LibraryShare> {
  return post(`/library/users/${userId}/shares`, token, payload)
}

export function listShares(userId: string, token: string, categoryId: string): Promise<LibraryShare[]> {
  return request(`/library/users/${userId}/shares?category_id=${encodeURIComponent(categoryId)}`, token)
}

export function revokeShare(userId: string, token: string, shareId: string): Promise<void> {
  return request(`/library/users/${userId}/shares/${shareId}`, token, { method: 'DELETE' }).then(
    () => undefined,
  )
}

export function listSharedWithMe(userId: string, token: string): Promise<SharedTopic[]> {
  return request(`/library/users/${userId}/shared-with-me`, token)
}

export function listSharedEntries(
  userId: string,
  token: string,
  categoryId: string,
): Promise<RemoteUserEntry[]> {
  return request(
    `/library/users/${userId}/shared/entries?category_id=${encodeURIComponent(categoryId)}`,
    token,
  )
}

export function listSharedPhrases(
  userId: string,
  token: string,
  categoryId: string,
): Promise<RemoteUserPhrase[]> {
  return request(
    `/library/users/${userId}/shared/phrases?category_id=${encodeURIComponent(categoryId)}`,
    token,
  )
}

export function speakText(
  userId: string,
  token: string,
  payload: { text: string; lang?: string },
): Promise<{ media_id: string; mime: string; transcription: string | null }> {
  return post(`/library/users/${userId}/speak`, token, payload)
}

export function transcribeText(
  token: string,
  payload: { text: string; lang?: string },
): Promise<{ transcription: string }> {
  return post('/library/transcribe', token, payload)
}
