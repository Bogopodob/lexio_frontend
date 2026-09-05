import { useSyncExternalStore } from 'react'

export type ShortcutId =
  | 'search'
  | 'flip'
  | 'flip_back'
  | 'speak'
  | 'grade_again'
  | 'grade_hard'
  | 'grade_good'
  | 'grade_easy'

export const SHORTCUT_META: Record<ShortcutId, { labelKey: string; hintKey: string }> = {
  search: { labelKey: 'settings.shortcuts.search.label', hintKey: 'settings.shortcuts.search.hint' },
  flip: { labelKey: 'settings.shortcuts.flip.label', hintKey: 'settings.shortcuts.flip.hint' },
  flip_back: { labelKey: 'settings.shortcuts.flip_back.label', hintKey: 'settings.shortcuts.flip_back.hint' },
  speak: { labelKey: 'settings.shortcuts.speak.label', hintKey: 'settings.shortcuts.speak.hint' },
  grade_again: { labelKey: 'settings.shortcuts.grade_again.label', hintKey: 'settings.shortcuts.grade_again.hint' },
  grade_hard: { labelKey: 'settings.shortcuts.grade_hard.label', hintKey: 'settings.shortcuts.grade_hard.hint' },
  grade_good: { labelKey: 'settings.shortcuts.grade_good.label', hintKey: 'settings.shortcuts.grade_good.hint' },
  grade_easy: { labelKey: 'settings.shortcuts.grade_easy.label', hintKey: 'settings.shortcuts.grade_easy.hint' },
}

export const DEFAULT_SHORTCUTS: Record<ShortcutId, string> = {
  search: 'mod+k',
  flip: 'Enter',
  flip_back: 'Backspace',
  speak: 'l',
  grade_again: '1',
  grade_hard: '2',
  grade_good: '3',
  grade_easy: '4',
}

const STORAGE_KEY = 'lexio:shortcuts'
const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])

type Listener = () => void

let cache: Record<ShortcutId, string> | null = null
const listeners = new Set<Listener>()

function readStored(): Record<ShortcutId, string> {
  if (cache) return cache
  let parsed: Partial<Record<ShortcutId, string>> = {}
  try {
    parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<
      Record<ShortcutId, string>
    >
  } catch {
    parsed = {}
  }
  cache = { ...DEFAULT_SHORTCUTS }
  for (const id of Object.keys(DEFAULT_SHORTCUTS) as ShortcutId[]) {
    const value = parsed[id]
    if (typeof value === 'string' && value !== '') cache[id] = value
  }
  return cache
}

function emit() {
  listeners.forEach((fn) => fn())
}

let snapshotCache: Record<ShortcutId, string> | null = null

function snapshot(): Record<ShortcutId, string> {
  if (!snapshotCache) snapshotCache = { ...readStored() }
  return snapshotCache
}

function invalidate() {
  snapshotCache = null
  emit()
}

function subscribe(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function useShortcuts(): {
  bindings: Record<ShortcutId, string>
  setBinding: (id: ShortcutId, binding: string) => void
  resetBindings: () => void
} {
  const bindings = useSyncExternalStore(subscribe, snapshot, snapshot)
  return { bindings, setBinding, resetBindings }
}

export function setBinding(id: ShortcutId, binding: string) {
  cache = { ...readStored(), [id]: binding }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* ignore */
  }
  invalidate()
}

export function resetBindings() {
  cache = { ...DEFAULT_SHORTCUTS }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  invalidate()
}

/** Build a binding string from a keydown event. Returns null for modifiers/Escape. */
export function bindingFromEvent(e: KeyboardEvent): string | null {
  if (e.key === 'Escape' || MODIFIER_KEYS.has(e.key)) return null
  const mod = e.metaKey || e.ctrlKey
  const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toLowerCase() : e.key
  return mod ? `mod+${key}` : key
}

type KeyLike = {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
}

export function matchesShortcut(e: KeyLike, binding: string): boolean {
  if (binding.startsWith('mod+')) {
    const want = binding.slice(4).toLowerCase()
    return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === want
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return false
  const want = binding === 'Space' ? ' ' : binding.toLowerCase()
  return e.key.toLowerCase() === want
}

export function formatBinding(binding: string): string {
  if (binding === 'mod+k') return '⌘K / Ctrl+K'
  if (binding.startsWith('mod+')) {
    const key = binding.slice(4)
    const pretty = key.length === 1 ? key.toUpperCase() : key
    return `⌘${pretty} / Ctrl+${pretty}`
  }
  if (binding === 'Space') return 'Space'
  if (binding === ' ') return 'Space'
  return binding.length === 1 ? binding.toUpperCase() : binding
}
