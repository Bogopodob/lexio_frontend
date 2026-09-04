const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

export type ReminderSchedule = Partial<Record<string, string[]>>

export interface RemoteProfile {
  user_id: string
  name: string | null
  lastname: string | null
  surname: string | null
  avatar: string | null
  city: string | null
  birth_date: string | null
  tags: string[] | null
  reminder_schedule?: ReminderSchedule | unknown[] | null
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
  reminder_schedule?: ReminderSchedule | null
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

export interface RemoteGoal {
  id: string
  profile_id: string
  title: string
  desc: string | null
  color: string | null
  progress: number
  sort: number
}

export function listGoals(userId: string, token: string, profileId: string): Promise<RemoteGoal[]> {
  return request(`/learning/users/${userId}/profiles/${profileId}/goals`, token)
}

export function createGoal(
  userId: string,
  token: string,
  profileId: string,
  goal: { title: string; desc?: string; color?: string },
): Promise<RemoteGoal> {
  return request(`/learning/users/${userId}/profiles/${profileId}/goals`, token, {
    method: 'POST',
    body: JSON.stringify(goal),
  })
}

export function updateGoal(
  userId: string,
  token: string,
  profileId: string,
  goalId: string,
  patch: { title?: string; desc?: string; color?: string; progress?: number },
): Promise<RemoteGoal> {
  return request(`/learning/users/${userId}/profiles/${profileId}/goals/${goalId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deleteGoal(
  userId: string,
  token: string,
  profileId: string,
  goalId: string,
): Promise<void> {
  return request(`/learning/users/${userId}/profiles/${profileId}/goals/${goalId}`, token, {
    method: 'DELETE',
  }).then(() => undefined)
}

export interface RemoteAchievement {
  id: string
  code: string
  title: string
  desc: string | null
  condition: string
  rarity: string
  color: string | null
  reward_xp: number
  target: number
  progress: number
  unlocked: boolean
  unlocked_at: string | null
}

export function listAchievements(
  userId: string,
  token: string,
  profileId: string,
): Promise<RemoteAchievement[]> {
  return request(`/learning/users/${userId}/profiles/${profileId}/achievements`, token)
}

export interface RemoteStat {
  id: string
  profile_id: string
  words_learned: number
  streak_days: number
  best_streak: number
  xp: number
  accuracy: number
  last_activity_at: string | null
}

export function getStats(userId: string, token: string, profileId: string): Promise<RemoteStat> {
  return request(`/learning/users/${userId}/profiles/${profileId}/stats`, token)
}

export interface RemoteFriend {
  user_id: string
  name: string | null
  avatar: string | null
  level: string | null
  streak_days: number
  friendship_id: string
}

export function listFriends(userId: string, token: string): Promise<RemoteFriend[]> {
  return request(`/users/${userId}/friends`, token)
}

export interface FriendRequestRow {
  id: string
  user_id: string
  name: string | null
  direction: string
}

export function listFriendRequests(
  userId: string,
  token: string,
  direction: 'incoming' | 'outgoing' = 'incoming',
): Promise<FriendRequestRow[]> {
  return request(`/users/${userId}/friends/requests?direction=${direction}`, token)
}

export function sendFriendRequest(
  userId: string,
  token: string,
  target: { user_id?: string; email?: string },
): Promise<{ status: string; request_id: string }> {
  return request(`/users/${userId}/friends/requests`, token, {
    method: 'POST',
    body: JSON.stringify(target),
  })
}

export function answerFriendRequest(
  userId: string,
  token: string,
  requestId: string,
  accept: boolean,
): Promise<{ status: string }> {
  return request(`/users/${userId}/friends/requests/${requestId}/${accept ? 'accept' : 'decline'}`, token, {
    method: 'POST',
  })
}

export function removeFriend(userId: string, token: string, friendshipId: string): Promise<void> {
  return request(`/users/${userId}/friends/${friendshipId}`, token, {
    method: 'DELETE',
  }).then(() => undefined)
}

export interface UserSearchHit {
  user_id: string
  name: string | null
  email: string
  relation: string | null
}

export function searchUsers(userId: string, token: string, query: string): Promise<UserSearchHit[]> {
  return request(`/users/${userId}/friends/search?query=${encodeURIComponent(query)}`, token)
}

export function getDueCount(userId: string, token: string, profileId: string): Promise<number> {
  return request<Array<unknown>>(
    `/learning/users/${userId}/profiles/${profileId}/due?limit=100`,
    token,
  ).then((list) => list.length)
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
