import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { BookOpenText, Flame, GraduationCap, Languages, Sparkles } from 'lucide-react'
import AuthCard from '@/components/auth/AuthCard'
import { useAuth } from '@/context/AuthContext'
import { useList, useT, getUiLang } from '@/lib/i18n'

const WordSphere = lazy(() => import('@/components/auth/WordSphere'))

function useTypewriter(phrases: string[]): string {
  const [text, setText] = useState('')
  useEffect(() => {
    let phrase = 0
    let char = 0
    let deleting = false
    let timer: number
    const tick = () => {
      const current = phrases[phrase]
      if (!deleting) {
        char++
        setText(current.slice(0, char))
        if (char === current.length) {
          deleting = true
          timer = window.setTimeout(tick, 1700)
          return
        }
        timer = window.setTimeout(tick, 34 + Math.random() * 46)
      } else {
        char -= 2
        if (char <= 0) {
          char = 0
          deleting = false
          phrase = (phrase + 1) % phrases.length
          setText('')
          timer = window.setTimeout(tick, 350)
          return
        }
        setText(current.slice(0, char))
        timer = window.setTimeout(tick, 16)
      }
    }
    timer = window.setTimeout(tick, 500)
    return () => window.clearTimeout(timer)
  }, [phrases])
  return text
}

function useCountUp(target: number, duration = 1600, started = true): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!started) return
    let raf = 0
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, started])
  return value
}

function Stat({ icon: Icon, value, label, color, started }: { icon: typeof BookOpenText; value: number; suffix: string; label: string; color: string } & { started: boolean }) {
  const display = useCountUp(value, 1600, started)
  return (
    <div className="auth-stat">
      <span className="auth-stat__icon" style={{ color, background: `${color}14`, borderColor: `${color}30` }}>
        <Icon size={15} />
      </span>
      <span className="auth-stat__value">{display.toLocaleString(getUiLang() === 'en' ? 'en-US' : 'ru-RU')}</span>
      <span className="auth-stat__label">{label}</span>
    </div>
  )
}

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()
  const afterLogin =
    typeof (location.state as { from?: unknown } | null)?.from === 'string'
      ? ((location.state as { from: string }).from as string)
      : '/'
  const goApp = () => navigate(afterLogin, { replace: true })
  const { user, ready } = useAuth()

  const stats = [
    { icon: BookOpenText, value: 2783, suffix: '', label: t('auth.stats.words'), color: '#5AD4B5' },
    { icon: Languages, value: 5, suffix: '', label: t('auth.stats.languages'), color: '#8b9bff' },
    { icon: Flame, value: 14, suffix: '', label: t('auth.stats.streak'), color: '#F5C16A' },
  ]
  const typed = useTypewriter(useList('auth.phrases'))
  const rootRef = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    if (ready && user) navigate(afterLogin, { replace: true })
  }, [ready, user, navigate, afterLogin])

  useEffect(() => {
    setEntered(true)
    if (!rootRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.auth-intro',
        { opacity: 0, y: 26, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.9, stagger: 0.09, ease: 'power3.out' },
      )
    }, rootRef)
    return () => ctx.revert()
  }, [])

  if (!ready || user) {
    return (
      <div className="auth-page">
        <div className="auth-bg" aria-hidden>
          <div className="auth-bg__orb auth-bg__orb--mint" />
          <div className="auth-bg__orb auth-bg__orb--violet" />
        </div>
        <div className="auth-layout" style={{ placeItems: 'center', gridTemplateColumns: '1fr' }}>
          <div className="px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-xs font-bold animate-pulse">
            {user ? t('auth.returning') : t('auth.checking')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="auth-page">
      {/* background */}
      <div className="auth-bg" aria-hidden>
        <div className="auth-bg__orb auth-bg__orb--mint" />
        <div className="auth-bg__orb auth-bg__orb--violet" />
        <div className="auth-bg__orb auth-bg__orb--amber" />
        <div className="auth-bg__grid" />
      </div>

      <div className="auth-layout">
        {/* left — form */}
        <div className="auth-main">
          <div className="auth-intro auth-brand">
            <span className="auth-brand__mark">
              <GraduationCap size={22} />
            </span>
            <span className="auth-brand__name">lexio</span>
            <span className="auth-brand__tag">
              <Sparkles size={12} /> {t('auth.brandTag')}
            </span>
          </div>

          <h1 className="auth-intro auth-title">
            <span className="auth-title__typed">{typed}</span>
            <span className="auth-title__caret" />
          </h1>
          <p className="auth-intro auth-subtitle">
            {t('auth.subtitle')}
          </p>

          <div className="auth-intro">
            <AuthCard onSuccess={goApp} />
          </div>

          <div className="auth-intro auth-stats">
            {stats.map((s) => (
              <Stat key={s.label} {...s} started={entered} />
            ))}
          </div>

          <button onClick={() => navigate('/')} className="auth-intro auth-guest">
            {t('auth.guest')}
          </button>
        </div>

        {/* right — 3D scene */}
        <div className="auth-side">
          <Suspense fallback={<div className="auth-scene__fallback" />}>
            <WordSphere />
          </Suspense>
          <div className="auth-side__caption">
            <span className="auth-side__dot" />
            {t('auth.sideCaption')}
          </div>
        </div>
      </div>
    </div>
  )
}
