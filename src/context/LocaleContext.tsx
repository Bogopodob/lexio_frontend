import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type AppLocale = 'ru' | 'en'

interface LocaleContextValue {
  locale: AppLocale
  setLocale: (l: AppLocale) => void
}

const STORAGE_KEY = 'lexio:locale'

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStored(): AppLocale {
  if (typeof window === 'undefined') return 'ru'
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'ru'
  } catch {
    return 'ru'
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(readStored)

  const setLocale = (l: AppLocale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = l
  }

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}
