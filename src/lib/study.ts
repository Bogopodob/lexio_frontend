export type BaseMode = 'f2n' | 'n2f' | 'typing' | 'audio' | 'choice' | 'anagram' | 'bool' | 'forms'

export type Direction = BaseMode | 'mixed' | 'smart'

export interface WordProgress {
  repetition: number
  interval_days: number
  easiness_factor: number
}

export const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function hashOf(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function levenshtein(a: string, b: string): number {
  const s = normalize(a)
  const t = normalize(b)
  if (s === t) return 0
  if (s.length === 0) return t.length
  if (t.length === 0) return s.length
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i)
  for (let i = 1; i <= s.length; i++) {
    let cur0 = i
    let prevDiag = i - 1
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1
      const next = Math.min(prev[j] + 1, cur0 + 1, prevDiag + cost)
      prevDiag = prev[j]
      prev[j - 1] = cur0
      cur0 = next
    }
    prev[t.length] = cur0
  }
  return prev[t.length]
}

export type Fuzzy = 'exact' | 'close' | 'wrong'

export function fuzzyMatch(input: string, targets: readonly string[]): { kind: Fuzzy; dist: number } {
  const v = normalize(input)
  if (!v) return { kind: 'wrong', dist: Number.MAX_SAFE_INTEGER }
  let best = Number.MAX_SAFE_INTEGER
  for (const t of targets) {
    const d = levenshtein(v, t)
    if (d === 0) return { kind: 'exact', dist: 0 }
    if (d < best) best = d
  }
  const longest = Math.max(v.length, ...targets.map((t) => normalize(t).length))
  const threshold = longest <= 4 ? 1 : 2
  return best <= threshold ? { kind: 'close', dist: best } : { kind: 'wrong', dist: best }
}

const ALL_BASE: BaseMode[] = ['f2n', 'n2f', 'typing', 'audio', 'choice', 'anagram', 'bool']

function needsNative(m: BaseMode): boolean {
  return m === 'n2f' || m === 'typing' || m === 'bool' || m === 'choice' || m === 'forms'
}

function withFallback(m: BaseMode, hasNative: boolean, hasForms: boolean): BaseMode {
  if (m === 'forms') return hasForms && hasNative ? 'forms' : 'typing'
  if (!hasNative && needsNative(m)) return 'f2n'
  return m
}

export function pickSmart(learnableId: string, p: WordProgress | null, hasForms: boolean): BaseMode {
  const h = hashOf(learnableId)
  const rep = p?.repetition ?? 0
  if (rep <= 0) return 'f2n'
  if (rep <= 2) return (['typing', 'f2n', 'audio'] as const)[h % 3]
  if (rep <= 5) {
    const pool: BaseMode[] = hasForms ? ['n2f', 'choice', 'audio', 'forms'] : ['n2f', 'choice', 'audio']
    return pool[h % pool.length]
  }
  const pool: BaseMode[] = hasForms
    ? ['n2f', 'audio', 'bool', 'anagram', 'choice', 'forms']
    : ['n2f', 'audio', 'bool', 'anagram', 'choice']
  return pool[h % pool.length]
}

/** Sync mode resolution (distractor sufficiency for choice/bool is checked async later). */
export function resolveMode(
  d: Direction,
  learnableId: string,
  progress: WordProgress | null,
  hasNative: boolean,
  hasForms = false,
): BaseMode {
  switch (d) {
    case 'mixed': {
      const pool: BaseMode[] = hasForms ? [...ALL_BASE, 'forms'] : ALL_BASE
      return withFallback(pool[hashOf(`mix:${learnableId}`) % pool.length], hasNative, hasForms)
    }
    case 'smart':
      return withFallback(pickSmart(learnableId, progress, hasForms), hasNative, hasForms)
    default:
      return withFallback(d, hasNative, hasForms)
  }
}

export interface WordBadge {
  label: string
  color: string
}

export function wordBadge(p: WordProgress | null): WordBadge {
  const rep = p?.repetition ?? 0
  const interval = p?.interval_days ?? 0
  if (rep <= 0) return { label: '🌱 Новое', color: '#9aa0a6' }
  if (interval >= 30) return { label: '🛡 Стабильно', color: '#5B74FF' }
  if (rep >= 3) return { label: '✅ Знаю', color: '#5AD4B5' }
  return { label: '🔥 Учу', color: '#ff9d5c' }
}

/** Auto grade from a verified fact (9 — авто-грейд вместо самооценки). */
export function autoQuality(kind: Fuzzy, hintsUsed: number): number {
  if (kind === 'exact') return Math.max(3, 5 - hintsUsed)
  if (kind === 'close') return Math.max(1, 3 - hintsUsed)
  return 1
}
