import { useEffect, useState } from 'react'

export const DESKTOP_QUERY = '(min-width: 1024px)'

export function useIsDesktop(query: string = DESKTOP_QUERY) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return isDesktop
}
