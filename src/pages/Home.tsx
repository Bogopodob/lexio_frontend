import { useState, useCallback, useEffect, useMemo, memo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { getWordOfDay, listCategories, listCategoriesWithProgress, type RemoteCategory, type WordOfDay } from '@/lib/catalog-api'
import { getAvailability, getWeekly, listSessions, type WeeklyDay } from '@/lib/learn-api'
import { getStats, listLearningProfiles } from '@/lib/profile-api'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircle,
  faLocationDot,
  faStar,
  faFire,
  faArrowRight,
  faBolt,
  faBookOpen,
  faComments,
  faTrophy,
  faUtensils,
  faPlane,
  faFaceSmile,
  faBriefcase,
} from '@fortawesome/free-solid-svg-icons'
import FlipCard from '@/components/FlipCard'
import { useSpeech } from '@/hooks/useSpeech'
import SpotlightCard from '@/components/SpotlightCard'
import CountUp from '@/components/CountUp'
// Heavy charts — lazy to not block initial paint, UI unchanged
const AreaChart = lazy(() => import('@/components/charts/area-chart').then((m) => ({ default: m.AreaChart })))
const Area = lazy(() => import('@/components/charts/area').then((m) => ({ default: m.Area })))
const Grid = lazy(() => import('@/components/charts/grid').then((m) => ({ default: m.Grid })))
const XAxis = lazy(() => import('@/components/charts/x-axis').then((m) => ({ default: m.XAxis })))
const ChartTooltip = lazy(() => import('@/components/charts/tooltip').then((m) => ({ default: m.ChartTooltip })))

const topicCards: TopicCardData[] = [
  { icon: 'utensils', title: 'Еда', count: '48 слов', sub: 'ресторан • рынок', tone: 'topic-card--mint' },
  { icon: 'plane', title: 'Путешествия', count: '52 слова', sub: 'аэропорт • город', tone: 'topic-card--sky' },
  { icon: 'smile', title: 'Эмоции', count: '36 слов', sub: 'чувства • общение', tone: 'topic-card--rose' },
  { icon: 'briefcase', title: 'Работа', count: '44 слова', sub: 'офис • проекты', tone: 'topic-card--sand' },
]

const topicIconMap = {
  utensils: faUtensils,
  plane: faPlane,
  smile: faFaceSmile,
  briefcase: faBriefcase,
} as const

const grammarCards = [
  { dot: 'grammar-card__dot--mint', title: 'Глаголы', subtitle: '200 слов • 34 выучено', progress: 17, level: 'Основа речи', accent: 'rgba(90,212,181,0.22)', color: '#5AD4B5' },
  { dot: 'grammar-card__dot--blue', title: 'Существительные', subtitle: '300 слов • 12 выучено', progress: 4, level: 'База словаря', accent: 'rgba(91,116,255,0.22)', color: '#5B74FF' },
  { dot: 'grammar-card__dot--pink', title: 'Прилагательные', subtitle: '150 слов • 8 выучено', progress: 5, level: 'Описание', accent: 'rgba(240,138,180,0.22)', color: '#F08AB4' },
  { dot: 'grammar-card__dot--gold', title: 'Фразы', subtitle: '80 фраз • 0 выучено', progress: 0, level: 'Практика', accent: 'rgba(219,159,58,0.22)', color: '#DB9F3A' },
]

const phraseCards = [
  { label: 'РЕСТОРАН', accent: 'phrase-card__label--mint', icon: faCircle, title: 'Can I have the bill, please?', translation: 'Можно счёт, пожалуйста?' },
  { label: 'ГОРОД', accent: 'phrase-card__label--blue', icon: faLocationDot, title: 'Where is the nearest metro?', translation: 'Где ближайшее метро?' },
  { label: 'ОТЕЛЬ', accent: 'phrase-card__label--pink', icon: faStar, title: "I'd like to check in", translation: 'Я хочу заселиться.' },
]

const weeklyData = [
  { date: new Date('2026-08-26'), minutes: 18 },
  { date: new Date('2026-08-27'), minutes: 12 },
  { date: new Date('2026-08-28'), minutes: 25 },
  { date: new Date('2026-08-29'), minutes: 8 },
  { date: new Date('2026-08-30'), minutes: 20 },
  { date: new Date('2026-08-31'), minutes: 30 },
  { date: new Date('2026-09-01'), minutes: 15 },
]

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
}

const DAILY_WORD_TARGET = 20

function plural(n: number, forms: [string, string, string]): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

function greetingByHour(h: number): string {
  if (h >= 5 && h < 12) return 'Доброе утро'
  if (h >= 12 && h < 18) return 'Добрый день'
  if (h >= 18 && h < 23) return 'Добрый вечер'
  return 'Доброй ночи'
}

function todayKey(d = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

interface LiveHome {
  wordsToday: number
  minutesToday: number
  wordsLearned: number
  streak: number
  bestStreak: number
  accuracy: number
  level: string
  due: number
  fresh: number
  hasActive: boolean
}

// Memoized — не пересоздаётся на каждый рендер Home, UI тот же
const ProgressRing = memo(function ProgressRing({ value }: { value: number }) {
  const { circumference, dashOffset } = useMemo(() => {
    const radius = 28
    const c = 2 * Math.PI * radius
    return { circumference: c, dashOffset: c * (1 - value), radius }
  }, [value])
  const radius = 28
  return (
    <motion.div
      className="progress-ring !w-[72px] !h-[72px] !rounded-full !overflow-hidden !bg-[#1e1e1e] !border !border-[#262626]"
      aria-hidden="true"
      whileHover={{ scale: 1.06 }}
      style={{ width: 72, height: 72, borderRadius: 999 }}
    >
      <svg viewBox="0 0 72 72" className="absolute inset-0 w-full h-full">
        <circle cx="36" cy="36" r={32} fill="#1e1e1e" />
        <circle className="progress-ring__track" cx="36" cy="36" r={radius} stroke="#2a2a2a" strokeWidth={6} fill="none" />
        <motion.circle
          className="progress-ring__value"
          cx="36"
          cy="36"
          r={radius}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
          style={{ strokeDasharray: circumference, strokeWidth: 6 }}
        />
      </svg>
      <span className="relative z-10 flex items-center justify-center w-full h-full text-[15px] font-black tracking-tight tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </motion.div>
  )
})

export interface TopicCardData {
  id?: string
  icon?: keyof typeof topicIconMap
  emoji?: string
  title: string
  count: string
  sub: string
  tone: string
}

const TOPIC_TONES = ['topic-card--mint', 'topic-card--sky', 'topic-card--rose', 'topic-card--sand']

const GRAMMAR_COLORS = [
  { dot: 'grammar-card__dot--mint', color: '#5AD4B5', accent: 'rgba(90,212,181,0.22)' },
  { dot: 'grammar-card__dot--blue', color: '#5B74FF', accent: 'rgba(91,116,255,0.22)' },
  { dot: 'grammar-card__dot--pink', color: '#F08AB4', accent: 'rgba(240,138,180,0.22)' },
  { dot: 'grammar-card__dot--gold', color: '#DB9F3A', accent: 'rgba(219,159,58,0.22)' },
]

export interface GrammarCardData {
  id?: string
  dot: string
  title: string
  subtitle: string
  progress: number
  level: string
  accent: string
  color: string
}

const MemoTopicCard = memo(function MemoTopicCard({ card, index, onOpen }: { card: TopicCardData; index: number; onOpen?: (id: string) => void }) {
  const Icon = card.icon ? topicIconMap[card.icon] : null
  const clickable = Boolean(card.id && onOpen)
  return (
    <SpotlightCard spotlightColor={'rgba(255,255,255,0.06)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0 h-full">
      <motion.div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? `Учить: ${card.title}` : undefined}
        onClick={clickable ? () => onOpen!(card.id as string) : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onOpen!(card.id as string) } : undefined}
        className={`group relative rounded-[20px] border border-white/[0.06] p-[1px] h-full overflow-hidden ${card.tone} ${clickable ? 'cursor-pointer' : ''}`}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ delay: index * 0.04, duration: 0.38 }}
        whileHover={{ y: -4 }}
        style={{ willChange: 'transform' }}
      >
        <div className="rounded-[19px] bg-[#171717] p-4 h-full flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity blur-[18px]" style={{ background: card.tone.includes('mint') ? '#5AD4B5' : card.tone.includes('sky') ? '#5B74FF' : card.tone.includes('rose') ? '#F08AB4' : '#DB9F3A' }} />
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.06] grid place-items-center text-white/90 group-hover:bg-white group-hover:text-black transition-colors text-[19px]">
            {card.emoji ?? (Icon && <FontAwesomeIcon icon={Icon} />)}
          </div>
          <div className="mt-1">
            <h4 className="text-[17px] font-black tracking-tight leading-none">{card.title}</h4>
            <p className="text-[13px] font-bold opacity-90 mt-1">{card.count}</p>
            <p className="text-[12px] opacity-50 leading-tight mt-1">{card.sub}</p>
          </div>
          <div className="mt-auto pt-3 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-40">Открыть →</span>
            <span className="w-6 h-6 rounded-full bg-white text-black grid place-items-center text-[11px] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all">↗</span>
          </div>
        </div>
      </motion.div>
    </SpotlightCard>
  )
})

const MemoGrammarCard = memo(function MemoGrammarCard({ card, index, onOpen }: { card: GrammarCardData; index: number; onOpen?: (id: string) => void }) {
  const clickable = Boolean(card.id && onOpen)
  return (
    <SpotlightCard spotlightColor={(card.accent as unknown as `rgba(${number}, ${number}, ${number}, ${number})`)} className="!p-0 !bg-transparent !border-0 h-full">
      <motion.article
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? `Учить: ${card.title}` : undefined}
        onClick={clickable ? () => onOpen!(card.id as string) : undefined}
        onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onOpen!(card.id as string) } : undefined}
        className={`group relative rounded-[20px] border border-white/[0.06] bg-[#171717] p-4 flex flex-col gap-3 h-full overflow-hidden hover:border-white/10 transition-colors ${clickable ? 'cursor-pointer' : ''}`}
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ delay: index * 0.05, duration: 0.38 }}
        whileHover={{ y: -4 }}
      >
        <div className="flex items-center justify-between">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: card.color, boxShadow: `0 0 10px ${card.color}60` }} />
          <span className="text-[10px] font-bold tracking-[0.10em] uppercase px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] opacity-70">{card.level}</span>
        </div>
        <div>
          <h4 className="text-[15px] font-black tracking-tight">{card.title}</h4>
          <p className="text-[12px] opacity-50 leading-tight mt-1">{card.subtitle}</p>
        </div>
        <div className="mt-auto pt-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div className="h-full rounded-full" style={{ background: card.color }} initial={{ width: 0 }} whileInView={{ width: `${card.progress}%` }} viewport={{ once: true }} transition={{ delay: 0.4 + index * 0.06, duration: 0.8 }} />
          </div>
          <span className="text-[12px] font-black tabular-nums">
            <CountUp to={card.progress} duration={0.9} />%
          </span>
        </div>
      </motion.article>
    </SpotlightCard>
  )
})

const MemoPhraseCard = memo(function MemoPhraseCard({
  card,
  isFlipped,
  isSpeaking,
  onFlip,
  onSpeak,
}: {
  card: (typeof phraseCards)[number]
  isFlipped: boolean
  isSpeaking: boolean
  onFlip: () => void
  onSpeak: () => void
}) {
  return (
    <SpotlightCard spotlightColor={'rgba(240, 138, 180, 0.16)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0 h-full">
      <FlipCard label={card.label} labelAccent={card.accent} icon={card.icon} title={card.title} translation={card.translation} isFlipped={isFlipped} isSpeaking={isSpeaking} onFlip={onFlip} onSpeak={onSpeak} />
    </SpotlightCard>
  )
})

export default function Home() {
  const navigate = useNavigate()
  const [flippedId, setFlippedId] = useState<string | null>(null)
  const { speak, isSpeaking, cancel } = useSpeech({ lang: 'en-US', rate: 0.92 })
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  // useCallback — не создаётся заново на каждый рендер, не триггерит детей
  const handleSpeak = useCallback(
    (id: string, text: string) => {
      if (isSpeaking && speakingId === id) {
        cancel()
        setSpeakingId(null)
        return
      }
      setSpeakingId(id)
      speak(text)
      setTimeout(() => setSpeakingId(null), 4000)
    },
    [isSpeaking, speakingId, speak, cancel],
  )
  const handleFlip = useCallback((title: string) => setFlippedId((v) => (v === title ? null : title)), [])
  const openCategory = useCallback(
    (categoryId: string) => navigate(`/learn?category=${encodeURIComponent(categoryId)}`),
    [navigate],
  )
  const { user, token, ready: authReady } = useAuth()
  const [themeCategories, setThemeCategories] = useState<RemoteCategory[]>([])
  const [grammarCategories, setGrammarCategories] = useState<RemoteCategory[]>([])
  const [verbsCategories, setVerbsCategories] = useState<RemoteCategory[]>([])
  const [showAllTopics, setShowAllTopics] = useState(false)

  // Real catalog categories (guests see them too — public endpoint).
  useEffect(() => {
    let cancelled = false
    listCategories('theme')
      .then((list) => {
        if (!cancelled && list.length > 0) setThemeCategories(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (authReady && user && token) {
          const profiles = await listLearningProfiles(user.id, token)
          const active = profiles.find((p) => p.is_active) ?? profiles[0]
          if (active) {
            const withProgress = await listCategoriesWithProgress(user.id, token, active.id, 'grammar')
            if (!cancelled && withProgress.length > 0) {
              setGrammarCategories(withProgress)
              return
            }
          }
        }
        const pub = await listCategories('grammar')
        if (!cancelled && pub.length > 0) setGrammarCategories(pub)
      } catch {
        /* keep mocks */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [authReady, user, token])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (authReady && user && token) {
          const profiles = await listLearningProfiles(user.id, token)
          const active = profiles.find((p) => p.is_active) ?? profiles[0]
          if (active) {
            const withProgress = await listCategoriesWithProgress(user.id, token, active.id, 'verbs')
            if (!cancelled && withProgress.length > 0) {
              setVerbsCategories(withProgress)
              return
            }
          }
        }
        const pub = await listCategories('verbs')
        if (!cancelled && pub.length > 0) setVerbsCategories(pub)
      } catch {
        /* section stays hidden */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [authReady, user, token])

  const VERB_COVERAGE: Record<string, string> = {
    'irr-50': '≈50% употреблений',
    'irr-100': '≈70% употреблений',
    'irr-150': '≈90% употреблений',
    'irr-200': '≈93% употреблений',
    'irr-300': '≈97% употреблений',
    'irr-366': '≈99% употреблений',
    'irr-700': 'редкие и производные',
  }

  const visibleVerbs: GrammarCardData[] = useMemo(() => {
    if (verbsCategories.length === 0) return []
    const parent = verbsCategories.find((c) => c.slug === 'irregular-verbs')
    const bands = verbsCategories
      .filter((c) => (parent ? c.parent_id === parent.id : c.slug.startsWith('irr-')) && !c.slug.startsWith('irr-group-'))
      .sort((a, b) => (a.sort ?? 500) - (b.sort ?? 500))
    return bands.map((c, i) => {
      const palette = GRAMMAR_COLORS[(i + 2) % GRAMMAR_COLORS.length]
      const learned = c.learned_count ?? null
      const progress = learned !== null && c.entries_count > 0 ? Math.round((learned / c.entries_count) * 100) : 0
      return {
        id: c.id,
        dot: palette.dot,
        title: c.name ?? c.slug,
        subtitle: `${c.entries_count} глаголов${learned !== null ? ` • ${learned} выучено` : ''}`,
        progress,
        level: VERB_COVERAGE[c.slug] ?? (learned !== null ? `${learned} ✓` : 'глаголы'),
        accent: palette.accent,
        color: palette.color,
      }
    })
  }, [verbsCategories])

  const [live, setLive] = useState<LiveHome | null>(null)
  const [wotd, setWotd] = useState<WordOfDay | null>(null)
  const [weekly, setWeekly] = useState<WeeklyDay[] | null>(null)

  const greeting = useMemo(() => greetingByHour(new Date().getHours()), [])

  // Live numbers for authed users: stats + availability + today's sessions + week.
  // Guests keep the static demo numbers below.
  useEffect(() => {
    if (!authReady || !user || !token) {
      setLive(null)
      setWeekly(null)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const profiles = await listLearningProfiles(user.id, token)
        const active = profiles.find((p) => p.is_active) ?? profiles[0]
        if (!active) return
        const [stat, avail, sessions, week] = await Promise.all([
          getStats(user.id, token, active.id).catch(() => null),
          getAvailability(user.id, token, active.id).catch(() => null),
          listSessions(user.id, token, active.id).catch(() => []),
          getWeekly(user.id, token, active.id, 7).catch(() => null),
        ])
        if (cancelled) return
        if (week) setWeekly(week)
        const today = new Date().toDateString()
        const todays = sessions.filter(
          (s) => s.started_at && new Date(s.started_at).toDateString() === today,
        )
        const wordsToday = todays.reduce((a, s) => a + s.answered, 0)
        const minutesToday = Math.round(
          todays.reduce((a, s) => {
            if (!s.started_at || !s.finished_at) return a
            return (
              a +
              Math.max(
                0,
                (new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()) / 60000,
              )
            )
          }, 0),
        )
        setLive({
          wordsToday,
          minutesToday,
          wordsLearned: stat?.words_learned ?? 0,
          streak: stat?.streak_days ?? 0,
          bestStreak: stat?.best_streak ?? 0,
          accuracy: stat?.accuracy ?? 0,
          level: active.level,
          due: avail?.due ?? 0,
          fresh: avail?.new ?? 0,
          hasActive: sessions.some((s) => s.status === 'active'),
        })
      } catch {
        /* keep demo numbers */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [authReady, user, token])

  // Word of the day: deterministic per date, public endpoint.
  useEffect(() => {
    let cancelled = false
    getWordOfDay(todayKey())
      .then((w) => {
        if (!cancelled) setWotd(w)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const memoWeeklyData = useMemo(
    () =>
      weekly
        ? weekly.map((d) => ({ date: new Date(`${d.date}T12:00:00`), minutes: d.minutes }))
        : weeklyData,
    [weekly],
  )

  const weekPeak = useMemo(() => {
    if (!weekly || weekly.every((d) => d.minutes === 0)) return null
    const best = weekly.reduce((a, b) => (b.minutes > a.minutes ? b : a))
    const names = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу']
    return { minutes: best.minutes, day: names[new Date(`${best.date}T12:00:00`).getDay()] }
  }, [weekly])

  const dailyPct = live ? Math.min(100, Math.round((live.wordsToday / DAILY_WORD_TARGET) * 100)) : 60
  const focusLine = !live
    ? 'Еда, travel-фразы и глаголы — сегодня в фокусе.'
    : live.due + live.fresh === 0
      ? 'Всё выучено — так держать.'
      : `${live.due} на повторение • ${live.fresh} новых — сегодня в фокусе.`

  const topicNameById = useMemo(() => {
    const map: Record<string, string> = {}
    themeCategories.forEach((c) => {
      if (c.name) map[c.id] = c.name
    })
    return map
  }, [themeCategories])

  const visibleTopics: TopicCardData[] = useMemo(() => {
    if (themeCategories.length === 0) return topicCards
    const sorted = [...themeCategories].sort((a, b) => b.entries_count - a.entries_count)
    const shown = showAllTopics ? sorted : sorted.slice(0, 8)
    return shown.map((c, i) => ({
      id: c.id,
      emoji: c.icon ?? '📚',
      title: c.name ?? c.slug,
      count: `${c.entries_count} слов`,
      sub: c.parent_id && topicNameById[c.parent_id] ? topicNameById[c.parent_id] : 'словарь',
      tone: TOPIC_TONES[i % TOPIC_TONES.length],
    }))
  }, [themeCategories, showAllTopics, topicNameById])

  const visibleGrammar: GrammarCardData[] = useMemo(() => {
    if (grammarCategories.length === 0) return grammarCards
    return grammarCategories.map((c, i) => {
      const palette = GRAMMAR_COLORS[i % GRAMMAR_COLORS.length]
      const learned = c.learned_count ?? null
      const progress = learned !== null && c.entries_count > 0 ? Math.round((learned / c.entries_count) * 100) : 0
      return {
        id: c.id,
        dot: palette.dot,
        title: c.name ?? c.slug,
        subtitle: `${c.entries_count} слов${learned !== null ? ` • ${learned} выучено` : ''}`,
        progress,
        level: learned !== null ? `${learned} ✓` : 'словарь',
        accent: palette.accent,
        color: palette.color,
      }
    })
  }, [grammarCategories])

  return (
    <motion.div animate="animate" initial="initial" transition={{ staggerChildren: 0.08 }} className="relative">
      <motion.header className="topbar relative" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div>
          <p className="brand">Lexio</p>
          <p className="greeting">{greeting} • Готов к прорыву?</p>
          <h1>
            Продолжим <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5AD4B5] to-[#5B74FF]">учить?</span>
          </h1>
          <p className="hero-copy">
            Короткие сессии, живые карточки и магия прогресса. Сегодня — твой день!
          </p>
        </div>
        <motion.div
          className="streak-badge"
          whileHover={{ scale: 1.05, rotate: 1 }}
          whileTap={{ scale: 0.98 }}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="streak-badge__fire">
            <FontAwesomeIcon icon={faFire} />
          </span>
          {live?.streak ?? 7} {plural(live?.streak ?? 7, ['день', 'дня', 'дней'])} подряд
        </motion.div>
      </motion.header>

      {/* HERO — 2026 minimal, без прозрачных краёв */}
      <motion.section variants={fadeUp} transition={{ duration: 0.55 }} className="mt-5 relative">
        <SpotlightCard spotlightColor={'rgba(90, 212, 181, 0.10)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0 !rounded-[24px] !overflow-hidden">
          <div className="relative rounded-[24px] border border-[#262626] bg-[#171717] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5 overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-[#5AD4B5]/[0.04] blur-3xl pointer-events-none" />
            <div className="flex gap-4 items-center flex-1 min-w-0">
              <ProgressRing value={live ? Math.min(1, live.wordsToday / DAILY_WORD_TARGET) : 0.6} />
              <div className="min-w-0">
                <p className="eyebrow flex items-center gap-2 !mt-0">
                  <FontAwesomeIcon icon={faBolt} className="text-[#5AD4B5]" /> Дневная цель
                </p>
                <h2 className="text-[18px] sm:text-[20px] font-black tracking-tight leading-tight mt-1">
                  <CountUp to={live?.wordsToday ?? 12} /> из <CountUp to={DAILY_WORD_TARGET} /> слов • <span className="text-white/60 font-semibold">{dailyPct}%</span>
                </h2>
                <p className="text-white/50 text-[13px] leading-snug mt-1">{focusLine}</p>
              </div>
            </div>
            <div className="flex gap-2.5 flex-wrap lg:flex-nowrap">
              <div className="flex-1 lg:flex-none min-w-[110px] rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold">Сегодня</div>
                <div className="text-[18px] font-black"><CountUp to={live?.wordsToday ?? 18} /> {live ? plural(live.wordsToday, ['слово', 'слова', 'слов']) : 'мин'}</div>
              </div>
              <div className="flex-1 lg:flex-none min-w-[110px] rounded-2xl bg-[#5AD4B5]/[0.08] border border-[#5AD4B5]/20 px-4 py-3 text-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-60 font-bold text-[#5AD4B5]">{live ? 'Точность' : 'Серия'}</div>
                <div className="text-[18px] font-black text-[#5AD4B5]"><CountUp to={live ? Math.round(live.accuracy * 100) : 92} />%</div>
              </div>
              <div className="hidden sm:flex min-w-[90px] rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 flex-col items-center justify-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold flex items-center gap-1"><FontAwesomeIcon icon={faTrophy} className="text-[#DB9F3A]" /> Уровень</div>
                <div className="text-[16px] font-black">{live?.level ?? 'A2'}</div>
              </div>
            </div>
            <motion.button onClick={() => navigate('/learn')} className="primary-action !m-0 lg:ml-auto group shrink-0" type="button" whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {live?.hasActive ? 'Продолжить урок' : 'Продолжить'} <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </div>
        </SpotlightCard>
      </motion.section>

      {/* WORD OF DAY — 2026 minimal, без фото */}
      <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="content-section !mt-6">
        <div className="section-header">
          <h3 className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBookOpen} className="text-[#5AD4B5]" /> Слово дня
          </h3>
          <span className="text-[11px] tracking-[0.12em] uppercase opacity-50 font-bold">клик — озвучка</span>
        </div>
        <SpotlightCard spotlightColor={'rgba(90, 212, 181, 0.10)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0">
          <div className="group relative rounded-[24px] border border-white/[0.06] bg-[#171717] p-6 sm:p-7 overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#5AD4B5]/[0.06] blur-2xl pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] font-bold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5AD4B5] animate-pulse" /> EN • {wotd?.part_of_speech ?? 'сущ.'} • {wotd?.level ?? 'B2'}
                </div>
                <h4 className="text-[34px] sm:text-[42px] font-black tracking-[-0.04em] leading-none mt-3 break-words">{wotd?.word ?? 'Serendipity'}</h4>
                <p className="text-white/40 text-[13px] font-medium mt-1">{wotd?.transcription ? `/${wotd.transcription}/` : ' '}</p>
                <p className="text-white/70 text-[14px] leading-relaxed mt-3 max-w-[42ch]">{wotd?.translation ?? 'Счастливая случайность — когда находишь ценное, не искав.'}</p>
                {wotd?.example ? (
                  <p className="text-white/35 text-[13px] mt-2 leading-relaxed max-w-[42ch]">“{wotd.example}”</p>
                ) : !wotd ? (
                  <p className="text-white/35 text-[13px] mt-2 leading-relaxed max-w-[42ch]">“It was pure <span className="text-white/80 font-medium">serendipity</span> that we met after the rain in Prague.”</p>
                ) : null}
              </div>
              <button type="button" onClick={() => handleSpeak(wotd?.word ?? 'serendipity', wotd?.word ?? 'Serendipity')} className="w-12 h-12 rounded-full bg-[#5AD4B5] text-black grid place-items-center hover:scale-105 hover:brightness-110 transition shadow-[0_8px_20px_rgba(90,212,181,0.22)] flex-shrink-0">
                ▶
              </button>
            </div>
            <div className="relative mt-5 flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold">Запомнить</span>
              {wotd ? (
                wotd.forms.length > 0 ? (
                  <span className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs font-semibold">Формы: {wotd.forms.join(', ')}</span>
                ) : null
              ) : (
                <span className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-xs">Синонимы: luck, chance</span>
              )}
            </div>
          </div>
        </SpotlightCard>
      </motion.section>

      {/* TOPICS — мемоизированы, viewport once */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3>По теме</h3>
          {themeCategories.length > 8 && (
            <button className="text-link" type="button" onClick={() => setShowAllTopics((v) => !v)}>
              {showAllTopics ? 'Свернуть' : `Все темы (${themeCategories.length})`}
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleTopics.map((card, index) => (
            <MemoTopicCard key={card.title} card={card} index={index} onOpen={openCategory} />
          ))}
        </div>
      </motion.section>

      {/* GRAMMAR — мемоизированы */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header section-header--stacked">
          <div>
            <h3>По грамматике</h3>
            <p>Соберите базу, чтобы быстрее перейти к свободной речи.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {visibleGrammar.map((card, index) => (
            <MemoGrammarCard key={card.title} card={card} index={index} onOpen={openCategory} />
          ))}
        </div>
      </motion.section>

      {/* IRREGULAR VERBS — отдельная секция */}
      {visibleVerbs.length > 0 && (
        <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
          <div className="section-header section-header--stacked">
            <div>
              <h3>Неправильные глаголы</h3>
              <p>Три формы сразу: go → went → gone. Частые — первые.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {visibleVerbs.map((card, index) => (
              <MemoGrammarCard key={card.title} card={card} index={index} onOpen={openCategory} />
            ))}
          </div>
        </motion.section>
      )}

      {/* WEEKLY TREND — lazy, не блокирует первый paint */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3 className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBolt} className="text-[#5B74FF]" /> Тренд недели
          </h3>
          <span className="text-[11px] tracking-[0.12em] uppercase opacity-50 font-bold">интерактив • наведи</span>
        </div>
        <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5 backdrop-blur">
          <Suspense fallback={<div className="h-[220px] w-full animate-pulse rounded-xl bg-white/[0.04]" />}>
            <div className="h-[220px] w-full">
              <AreaChart data={memoWeeklyData as unknown as Record<string, unknown>[]} xDataKey="date" aspectRatio="3 / 1" className="w-full h-full">
                <Grid horizontal numTicksRows={4} stroke="rgba(255,255,255,0.06)" />
                <Area dataKey="minutes" fill="var(--chart-line-primary)" stroke="var(--chart-line-primary)" fillOpacity={0.24} strokeWidth={2.5} />
                <XAxis numTicks={7} />
                <ChartTooltip />
              </AreaChart>
            </div>
          </Suspense>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#5AD4B5]/15 text-[#5AD4B5] text-xs font-bold border border-[#5AD4B5]/20">{live?.minutesToday ?? 18} мин сегодня</span>
            <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-semibold border border-white/10">{weekPeak ? `Пик: ${weekPeak.minutes} мин в ${weekPeak.day}` : 'Пик: 30 мин в субботу'}</span>
            <span className="px-3 py-1 rounded-full bg-[#5B74FF]/15 text-[#8b9bff] text-xs font-semibold border border-[#5B74FF]/20">Цель: 20 мин/день</span>
          </div>
        </div>
      </motion.section>

      {/* STATS — native */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Слов выучено', value: live?.wordsLearned ?? 142, sub: 'всего', color: '#5AD4B5' },
            { label: 'Дней подряд', value: live?.streak ?? 7, sub: live ? `🔥 рекорд ${live.bestStreak}` : '🔥 рекорд', color: '#F5C16A' },
            { label: 'Точность', value: live ? Math.round(live.accuracy * 100) : 92, suffix: '%', color: '#5B74FF' },
            { label: 'Минут сегодня', value: live?.minutesToday ?? 18, sub: live ? 'сегодня' : 'из 20', color: '#F08AB4' },
          ].map((s) => (
            <div key={s.label} className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur flex flex-col items-center gap-1 text-center">
              <span className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold">{s.label}</span>
              <span className="text-[28px] font-black tracking-tight leading-none flex items-baseline justify-center gap-0.5" style={{ color: s.color }}>
                <CountUp to={s.value} duration={1} className="tabular-nums" />
                <span className="text-[22px] font-black">{s.suffix || ''}</span>
              </span>
              <span className="text-xs opacity-60">{s.sub}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* PHRASES — мемоизированы, коллбеки стабильны */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3 className="flex items-center gap-2">
            <FontAwesomeIcon icon={faComments} className="text-[#F08AB4]" /> Разговорные фразы • клик — флип, L — звук
          </h3>
          <button className="text-link" type="button">Все фразы</button>
        </div>
        <div className="phrase-strip">
          {phraseCards.map((card) => (
            <MemoPhraseCard key={card.title} card={card} isFlipped={flippedId === card.title} isSpeaking={speakingId === card.title && isSpeaking} onFlip={() => handleFlip(card.title)} onSpeak={() => handleSpeak(card.title, card.title)} />
          ))}
        </div>
      </motion.section>
    </motion.div>
  )
}
