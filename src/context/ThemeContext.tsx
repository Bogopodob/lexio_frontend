import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lexio-theme') as Theme | null
      if (stored === 'light' || stored === 'dark') return stored
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
    }
    return 'dark'
  })

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('lexio-theme', t)
    document.documentElement.dataset.theme = t
    document.documentElement.style.colorScheme = t
  }

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  // Listen to system changes if no stored preference
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const handler = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('lexio-theme')
      if (!stored) setThemeState(e.matches ? 'light' : 'dark')
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
