import { useCallback, useMemo } from 'react'
import { useLocale, type AppLocale } from '@/context/LocaleContext'
import ru from './locales/ru'
import en from './locales/en'

export type Lang = AppLocale
export type Vars = Record<string, string | number>

export const UI_LANG_KEY = 'lexio:locale'

const dicts = { ru, en } as const

function lookup(dict: unknown, path: string): unknown {
  let cur: unknown = dict
  for (const part of path.split('.')) {
    if (typeof cur !== 'object' || cur === null) return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

function fill(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/** Pure translator, usable outside React (e.g. lib error messages). */
export function translate(lang: Lang, path: string, vars?: Vars): string {
  const hit = lookup(dicts[lang] ?? ru, path)
  if (typeof hit === 'string') return fill(hit, vars)
  const fb = lookup(ru, path)
  if (typeof fb === 'string') return fill(fb, vars)
  return path
}

/** Current UI language without React (for API headers). */
export function getUiLang(): Lang {
  try {
    return localStorage.getItem(UI_LANG_KEY) === 'en' ? 'en' : 'ru'
  } catch {
    return 'ru'
  }
}

/** React-bound translator, re-renders on language switch. */
export function useT(): (path: string, vars?: Vars) => string {
  const { locale } = useLocale()
  return useCallback((path: string, vars?: Vars) => translate(locale, path, vars), [locale])
}

/** String-list lookup (phrases, strength labels...), re-renders on switch. */
export function useList(path: string): string[] {
  const { locale } = useLocale()
  return useMemo(() => {
    const hit = lookup((dicts[locale] ?? ru) as unknown, path)
    if (Array.isArray(hit)) return hit.map(String)
    const fb = lookup(ru as unknown, path)
    return Array.isArray(fb) ? fb.map(String) : []
  }, [locale, path])
}

export interface PluralForms {
  one: string
  few: string
  many: string
}

/** Plural-forms object lookup, re-renders on switch. */
export function useForms(path: string): PluralForms {
  const { locale } = useLocale()
  return useMemo(() => {
    const pick = (dict: unknown): PluralForms | null => {
      const hit = lookup(dict, path)
      if (typeof hit === 'object' && hit !== null && 'one' in hit) {
        const o = hit as Record<string, unknown>
        if (typeof o.one === 'string' && typeof o.few === 'string' && typeof o.many === 'string') {
          return { one: o.one, few: o.few, many: o.many }
        }
      }
      return null
    }
    return pick(dicts[locale] ?? ru) ?? pick(ru) ?? { one: path, few: path, many: path }
  }, [locale, path])
}

/** Slavic plural rule; works for en pairs too (few === many). */
export function pickPlural(n: number, forms: { one: string; few: string; many: string }): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms.one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms.few
  return forms.many
}
