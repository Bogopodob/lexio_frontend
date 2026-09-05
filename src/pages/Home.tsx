import { useState, useCallback, useEffect, useMemo, memo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import { createCategory, deleteCategory, getWordOfDay, listCategories, listCategoriesWithProgress, updateCategory, type RemoteCategory, type WordOfDay } from '@/lib/catalog-api'
import { getAvailability, getWeekly, listSessions, type WeeklyDay } from '@/lib/learn-api'
import { getStats, listLanguages, listLearningProfiles } from '@/lib/profile-api'
import { createUserEntry } from '@/lib/library-api'
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
import { pickPlural, useForms, useList, useT } from '@/lib/i18n'
// Heavy charts — lazy to not block initial paint, UI unchanged
const AreaChart = lazy(() => import('@/components/charts/area-chart').then((m) => ({ default: m.AreaChart })))
const Area = lazy(() => import('@/components/charts/area').then((m) => ({ default: m.Area })))
const Grid = lazy(() => import('@/components/charts/grid').then((m) => ({ default: m.Grid })))
const XAxis = lazy(() => import('@/components/charts/x-axis').then((m) => ({ default: m.XAxis })))
const ChartTooltip = lazy(() => import('@/components/charts/tooltip').then((m) => ({ default: m.ChartTooltip })))

const FALLBACK_TOPIC_STYLE = [
  { icon: 'utensils', tone: 'topic-card--mint' },
  { icon: 'plane', tone: 'topic-card--sky' },
  { icon: 'smile', tone: 'topic-card--rose' },
  { icon: 'briefcase', tone: 'topic-card--sand' },
] as const

const topicIconMap = {
  utensils: faUtensils,
  plane: faPlane,
  smile: faFaceSmile,
  briefcase: faBriefcase,
} as const

const FALLBACK_GRAMMAR_STYLE = [
  { dot: 'grammar-card__dot--mint', progress: 17, accent: 'rgba(90,212,181,0.22)', color: '#5AD4B5' },
  { dot: 'grammar-card__dot--blue', progress: 4, accent: 'rgba(91,116,255,0.22)', color: '#5B74FF' },
  { dot: 'grammar-card__dot--pink', progress: 5, accent: 'rgba(240,138,180,0.22)', color: '#F08AB4' },
  { dot: 'grammar-card__dot--gold', progress: 0, accent: 'rgba(219,159,58,0.22)', color: '#DB9F3A' },
]

const PHRASE_STYLE = [
  { accent: 'phrase-card__label--mint', icon: faCircle, title: 'Can I have the bill, please?', translation: 'Можно счёт, пожалуйста?' },
  { accent: 'phrase-card__label--blue', icon: faLocationDot, title: 'Where is the nearest metro?', translation: 'Где ближайшее метро?' },
  { accent: 'phrase-card__label--pink', icon: faStar, title: "I'd like to check in", translation: 'Я хочу заселиться.' },
] as const

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

function greetingKeyByHour(h: number): 'morning' | 'day' | 'evening' | 'night' {
  if (h >= 5 && h < 12) return 'morning'
  if (h >= 12 && h < 18) return 'day'
  if (h >= 18 && h < 23) return 'evening'
  return 'night'
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
const ProgressRing = memo(function ProgressRing({ value, loading }: { value: number; loading?: boolean }) {
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
        {loading ? '–' : `${Math.round(value * 100)}%`}
      </span>
    </motion.div>
  )
})

function SkeletonBars() {
  return (
    <div className="flex flex-col gap-2.5 animate-pulse" aria-hidden>
      <div className="h-5 w-40 rounded-lg bg-white/[0.07]" />
      <div className="h-11 w-64 max-w-full rounded-xl bg-white/[0.07]" />
      <div className="h-4 w-48 max-w-full rounded-lg bg-white/[0.06]" />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-4 min-h-[150px]" aria-hidden>
      <SkeletonBars />
    </div>
  )
}

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
  const t = useT()
  const Icon = card.icon ? topicIconMap[card.icon] : null
  const clickable = Boolean(card.id && onOpen)
  return (
    <SpotlightCard spotlightColor={'rgba(255,255,255,0.06)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0 h-full">
      <motion.div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? t('home.topics.ariaLearn', { title: card.title }) : undefined}
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
            <span className="text-[11px] font-bold tracking-widest uppercase opacity-40">{t('home.topics.open')}</span>
            <span className="w-6 h-6 rounded-full bg-white text-black grid place-items-center text-[11px] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all">↗</span>
          </div>
        </div>
      </motion.div>
    </SpotlightCard>
  )
})

const MemoGrammarCard = memo(function MemoGrammarCard({ card, index, onOpen }: { card: GrammarCardData; index: number; onOpen?: (id: string) => void }) {
  const t = useT()
  const clickable = Boolean(card.id && onOpen)
  return (
    <SpotlightCard spotlightColor={(card.accent as unknown as `rgba(${number}, ${number}, ${number}, ${number})`)} className="!p-0 !bg-transparent !border-0 h-full">
      <motion.article
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-label={clickable ? t('home.topics.ariaLearn', { title: card.title }) : undefined}
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
  card: (typeof PHRASE_STYLE)[number] & { label: string }
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
  const t = useT()
  const phraseLabels = useList('home.phraseLabels')
  const weekdaysFull = useList('home.weekdaysFull')
  const streakForms = useForms('home.streakForms')
  const heroWordsForms = useForms('home.hero.wordsForms')
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
  const isAuthed = authReady && !!user && !!token
  // Known guest only after auth settles; until then skeletons, never guest mocks.
  const isGuest = authReady && !user && !token
  const [themeCategories, setThemeCategories] = useState<RemoteCategory[]>([])
  const [grammarCategories, setGrammarCategories] = useState<RemoteCategory[]>([])
  const [verbsCategories, setVerbsCategories] = useState<RemoteCategory[]>([])
  const [showAllTopics, setShowAllTopics] = useState(false)
  // Settled flags: while authed data is loading we show skeletons,
  // never mock content that gets swapped afterwards.
  const [themesDone, setThemesDone] = useState(false)
  const [grammarDone, setGrammarDone] = useState(false)
  const [verbsDone, setVerbsDone] = useState(false)

  // Real catalog categories (guests see them too — public endpoint).
  useEffect(() => {
    let cancelled = false
    listCategories('theme')
      .then((list) => {
        if (!cancelled && list.length > 0) setThemeCategories(list)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setThemesDone(true)
      })
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
      } finally {
        if (!cancelled) setGrammarDone(true)
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
      } finally {
        if (!cancelled) setVerbsDone(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [authReady, user, token])

  const [topicsTab, setTopicsTab] = useState<'system' | 'mine'>('system')
  const [ownCats, setOwnCats] = useState<RemoteCategory[]>([])
  const [ownDone, setOwnDone] = useState(false)
  const [catDialog, setCatDialog] = useState<
    | { mode: 'create' }
    | { mode: 'rename'; id: string; name: string }
    | { mode: 'delete'; id: string; name: string }
    | null
  >(null)
  const [catName, setCatName] = useState('')
  const [catBusy, setCatBusy] = useState(false)
  const [catError, setCatError] = useState<string | null>(null)
  const [wordForm, setWordForm] = useState(false)
  const [wordEn, setWordEn] = useState('')
  const [wordRu, setWordRu] = useState('')
  const [wordCat, setWordCat] = useState('')
  const [wordBusy, setWordBusy] = useState(false)
  const [wordError, setWordError] = useState<string | null>(null)
  const [wordAdded, setWordAdded] = useState(false)
  const [langIds, setLangIds] = useState<{ en: string; ru: string } | null>(null)

  // Own categories (authed only).
  useEffect(() => {
    if (!authReady || !user || !token) {
      setOwnCats([])
      setOwnDone(false)
      return
    }
    let cancelled = false
    const uid = user.id
    const tk = token
    listLearningProfiles(uid, tk)
      .then((profiles) => {
        const active = profiles.find((p) => p.is_active) ?? profiles[0]
        if (!active) return null
        return listCategoriesWithProgress(uid, tk, active.id, 'theme')
      })
      .then((list) => {
        if (cancelled || !list) return
        setOwnCats(list.filter((c) => c.user_id === uid))
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setOwnDone(true)
      })
    return () => {
      cancelled = true
    }
  }, [authReady, user, token])

  const openCatDialog = (d: NonNullable<typeof catDialog>) => {
    setCatError(null)
    setCatName(d.mode === 'create' ? '' : (d as { name?: string }).name ?? '')
    setCatDialog(d)
  }

  const submitCatDialog = async () => {
    if (!user || !token || catBusy || !catDialog) return
    const name = catName.trim()
    if (catDialog.mode !== 'delete' && name === '') return
    setCatBusy(true)
    setCatError(null)
    try {
      if (catDialog.mode === 'create') {
        const created = await createCategory(user.id, token, { name })
        setOwnCats((prev) => [created, ...prev])
        setTopicsTab('mine')
      } else if (catDialog.mode === 'rename') {
        const updated = await updateCategory(user.id, token, catDialog.id, { name })
        setOwnCats((prev) => prev.map((c) => (c.id === updated.id ? { ...c, name: updated.name } : c)))
      } else {
        await deleteCategory(user.id, token, catDialog.id)
        setOwnCats((prev) => prev.filter((c) => c.id !== catDialog.id))
      }
      setCatDialog(null)
    } catch (e) {
      setCatError(e instanceof Error ? e.message : 'Error')
    } finally {
      setCatBusy(false)
    }
  }

  const ensureLangIds = async (): Promise<{ en: string; ru: string } | null> => {
    if (langIds) return langIds
    try {
      const langs = await listLanguages()
      const en = langs.find((l) => l.code === 'en')?.id
      const ru = langs.find((l) => l.code === 'ru')?.id
      if (!en || !ru) return null
      const ids = { en, ru }
      setLangIds(ids)
      return ids
    } catch {
      return null
    }
  }

  const submitWord = async () => {
    if (!user || !token || wordBusy) return
    const targetCat = wordCat || ownCats[0]?.id
    if (!targetCat || wordEn.trim() === '' || wordRu.trim() === '') {
      setWordError(t('home.addWord.needCategory'))
      return
    }
    setWordBusy(true)
    setWordError(null)
    setWordAdded(false)
    try {
      const ids = await ensureLangIds()
      if (!ids) throw new Error('Error')
      await createUserEntry(user.id, token, {
        category_id: targetCat,
        translations: [
          { language_id: ids.en, text: wordEn.trim() },
          { language_id: ids.ru, text: wordRu.trim() },
        ],
      })
      setOwnCats((prev) => prev.map((c) => (c.id === targetCat ? { ...c, entries_count: c.entries_count + 1 } : c)))
      setWordEn('')
      setWordRu('')
      setWordAdded(true)
    } catch (e) {
      setWordError(e instanceof Error ? e.message : 'Error')
    } finally {
      setWordBusy(false)
    }
  }

  const verbCoverage = useMemo(
    () => ({
      'irr-50': t('home.verbs.coverage.irr-50'),
      'irr-100': t('home.verbs.coverage.irr-100'),
      'irr-150': t('home.verbs.coverage.irr-150'),
      'irr-200': t('home.verbs.coverage.irr-200'),
      'irr-300': t('home.verbs.coverage.irr-300'),
      'irr-366': t('home.verbs.coverage.irr-366'),
      'irr-700': t('home.verbs.coverage.irr-700'),
    }),
    [t],
  )

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
        subtitle: `${c.entries_count} ${t('home.verbs.unit')}${learned !== null ? ` • ${learned} ${t('home.verbs.learnedSuffix')}` : ''}`,
        progress,
        level: verbCoverage[c.slug as keyof typeof verbCoverage] ?? (learned !== null ? t('home.verbs.levelLearned', { n: learned }) : t('home.verbs.levelDict')),
        accent: palette.accent,
        color: palette.color,
      }
    })
  }, [verbsCategories, t, verbCoverage])

  const [live, setLive] = useState<LiveHome | null>(null)
  const [wotd, setWotd] = useState<WordOfDay | null>(null)
  const [weekly, setWeekly] = useState<WeeklyDay[] | null>(null)
  const [liveDone, setLiveDone] = useState(false)
  const [wotdDone, setWotdDone] = useState(false)
  // Authed users see skeletons until their data settles — no mock flash.
  const heroLoading = !isGuest && !liveDone

  const greeting = useMemo(
    () => t(`home.greeting.${greetingKeyByHour(new Date().getHours())}`),
    [t],
  )

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
      } finally {
        if (!cancelled) setLiveDone(true)
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
      .finally(() => {
        if (!cancelled) setWotdDone(true)
      })
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
    ? t('home.focus.default')
    : live.due + live.fresh === 0
      ? t('home.focus.empty')
      : t('home.focus.some', { due: live.due, fresh: live.fresh })

  const topicNameById = useMemo(() => {
    const map: Record<string, string> = {}
    themeCategories.forEach((c) => {
      if (c.name) map[c.id] = c.name
    })
    return map
  }, [themeCategories])

  // Skeleton card placeholders (no mock content flash for authed users).
  const topicSkeletons = useMemo(() => [0, 1, 2, 3], [])
  const grammarSkeletons = useMemo(() => [0, 1, 2, 3], [])

  const fallbackTopics = useMemo(
    () =>
      FALLBACK_TOPIC_STYLE.map((s, i) => ({
        icon: s.icon,
        title: t(`home.fallbackTopics.${i}.title`),
        count: t(`home.fallbackTopics.${i}.count`),
        sub: t(`home.fallbackTopics.${i}.sub`),
        tone: s.tone,
      })),
    [t],
  )

  const fallbackGrammar = useMemo(
    () =>
      FALLBACK_GRAMMAR_STYLE.map((s, i) => ({
        ...s,
        title: t(`home.fallbackGrammar.${i}.title`),
        subtitle: t(`home.fallbackGrammar.${i}.subtitle`),
        level: t(`home.fallbackGrammar.${i}.level`),
      })),
    [t],
  )

  const mineTopics: TopicCardData[] = useMemo(() => {
    const sorted = [...ownCats].sort((a, b) => b.entries_count - a.entries_count)
    return sorted.map((c, i) => ({
      id: c.id,
      emoji: c.icon ?? '📁',
      title: c.name ?? c.slug,
      count: `${c.entries_count} ${pickPlural(c.entries_count, heroWordsForms)}`,
      sub: t('home.myTopics.mineSub'),
      tone: TOPIC_TONES[i % TOPIC_TONES.length],
    }))
  }, [ownCats, t, heroWordsForms])

  const visibleTopics: TopicCardData[] = useMemo(() => {
    if (themeCategories.length === 0) return isAuthed ? [] : fallbackTopics
    const sorted = [...themeCategories].sort((a, b) => b.entries_count - a.entries_count)
    const shown = showAllTopics ? sorted : sorted.slice(0, 8)
    return shown.map((c, i) => ({
      id: c.id,
      emoji: c.icon ?? '📚',
      title: c.name ?? c.slug,
      count: t('home.topics.countWords', { n: c.entries_count }),
      sub: c.parent_id && topicNameById[c.parent_id] ? topicNameById[c.parent_id] : t('home.topics.defaultSub'),
      tone: TOPIC_TONES[i % TOPIC_TONES.length],
    }))
  }, [themeCategories, showAllTopics, topicNameById, isAuthed, fallbackTopics, t])

  const visibleGrammar: GrammarCardData[] = useMemo(() => {
    if (grammarCategories.length === 0) return isAuthed ? [] : fallbackGrammar
    return grammarCategories.map((c, i) => {
      const palette = GRAMMAR_COLORS[i % GRAMMAR_COLORS.length]
      const learned = c.learned_count ?? null
      const progress = learned !== null && c.entries_count > 0 ? Math.round((learned / c.entries_count) * 100) : 0
      return {
        id: c.id,
        dot: palette.dot,
        title: c.name ?? c.slug,
        subtitle: `${c.entries_count} ${t('home.grammar.unit')}${learned !== null ? ` • ${learned} ${t('home.grammar.learnedSuffix')}` : ''}`,
        progress,
        level: learned !== null ? `${learned} ✓` : t('home.grammar.levelDict'),
        accent: palette.accent,
        color: palette.color,
      }
    })
  }, [grammarCategories, isAuthed, fallbackGrammar, t])

  return (
    <motion.div animate="animate" initial="initial" transition={{ staggerChildren: 0.08 }} className="relative">
      <motion.header className="topbar relative" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div>
          <p className="brand">Lexio</p>
          <p className="greeting">{greeting} • {t('home.greeting.ready')}</p>
          <h1>
            {t('home.hero.titleStart')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5AD4B5] to-[#5B74FF]">{t('home.hero.titleAccent')}</span>
          </h1>
          <p className="hero-copy">
            {t('home.hero.copy')}
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
          {heroLoading ? (
            <span className="inline-block w-20 h-4 rounded bg-white/10 animate-pulse" aria-hidden />
          ) : (
            <>{live?.streak ?? 7} {pickPlural(live?.streak ?? 7, streakForms)} {t('home.streakSuffix')}</>
          )}
        </motion.div>
      </motion.header>

      {/* HERO — 2026 minimal, без прозрачных краёв */}
      <motion.section variants={fadeUp} transition={{ duration: 0.55 }} className="mt-5 relative">
        <SpotlightCard spotlightColor={'rgba(90, 212, 181, 0.10)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0 !rounded-[24px] !overflow-hidden">
          <div className="relative rounded-[24px] border border-[#262626] bg-[#171717] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5 overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-[#5AD4B5]/[0.04] blur-3xl pointer-events-none" />
            <div className="flex gap-4 items-center flex-1 min-w-0">
              <ProgressRing value={heroLoading ? 0 : (live ? Math.min(1, live.wordsToday / DAILY_WORD_TARGET) : 0.6)} loading={heroLoading} />
              <div className="min-w-0">
                <p className="eyebrow flex items-center gap-2 !mt-0">
                  <FontAwesomeIcon icon={faBolt} className="text-[#5AD4B5]" /> {t('home.hero.dailyGoal')}
                </p>
                <h2 className="text-[18px] sm:text-[20px] font-black tracking-tight leading-tight mt-1">
                  {heroLoading ? (
                    <span className="inline-block w-44 h-6 rounded-lg bg-white/10 animate-pulse" aria-hidden />
                  ) : (
                    <><CountUp to={live?.wordsToday ?? 12} /> из <CountUp to={DAILY_WORD_TARGET} /> {t('home.hero.ofWords')} • <span className="text-white/60 font-semibold">{dailyPct}%</span></>
                  )}
                </h2>
                <p className="text-white/50 text-[13px] leading-snug mt-1">{heroLoading ? t('home.hero.loadingStats') : focusLine}</p>
              </div>
            </div>
            <div className="flex gap-2.5 flex-wrap lg:flex-nowrap">
              <div className="flex-1 lg:flex-none min-w-[110px] rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold">{t('home.hero.today')}</div>
                <div className="text-[18px] font-black">{heroLoading ? '–' : <><CountUp to={live?.wordsToday ?? 18} /> {live ? pickPlural(live.wordsToday, heroWordsForms) : t('home.hero.minutes')}</>}</div>
              </div>
              <div className="flex-1 lg:flex-none min-w-[110px] rounded-2xl bg-[#5AD4B5]/[0.08] border border-[#5AD4B5]/20 px-4 py-3 text-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-60 font-bold text-[#5AD4B5]">{live ? t('home.hero.accuracy') : t('home.hero.series')}</div>
                <div className="text-[18px] font-black text-[#5AD4B5]">{heroLoading ? '–' : <><CountUp to={live ? Math.round(live.accuracy * 100) : 92} />%</>}</div>
              </div>
              <div className="hidden sm:flex min-w-[90px] rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 flex-col items-center justify-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold flex items-center gap-1"><FontAwesomeIcon icon={faTrophy} className="text-[#DB9F3A]" /> {t('home.hero.level')}</div>
                <div className="text-[16px] font-black">{heroLoading ? '–' : (live?.level ?? 'A2')}</div>
              </div>
            </div>
            <motion.button onClick={() => navigate('/learn')} className="primary-action !m-0 lg:ml-auto group shrink-0" type="button" whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {live?.hasActive ? t('home.hero.continueLesson') : t('home.hero.continue')} <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </div>
        </SpotlightCard>
      </motion.section>

      {/* WORD OF DAY — 2026 minimal, без фото */}
      <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="content-section !mt-6">
        <div className="section-header">
          <h3 className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBookOpen} className="text-[#5AD4B5]" /> {t('home.wotd.title')}
          </h3>
          <span className="text-[11px] tracking-[0.12em] uppercase opacity-50 font-bold">{t('home.wotd.hint')}</span>
        </div>
        <SpotlightCard spotlightColor={'rgba(90, 212, 181, 0.10)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0">
          <div className="group relative rounded-[24px] border border-white/[0.06] bg-[#171717] p-6 sm:p-7 overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#5AD4B5]/[0.06] blur-2xl pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
            {!wotdDone ? (
              <div className="relative py-2">
                <SkeletonBars />
              </div>
            ) : (
            <>
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] font-bold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5AD4B5] animate-pulse" /> EN • {wotd?.part_of_speech ?? t('home.wotd.defaultPos')} • {wotd?.level ?? 'B2'}
                </div>
                <h4 className="text-[34px] sm:text-[42px] font-black tracking-[-0.04em] leading-none mt-3 break-words">{wotd?.word ?? 'Serendipity'}</h4>
                <p className="text-white/40 text-[13px] font-medium mt-1">{wotd?.transcription ? `/${wotd.transcription}/` : ' '}</p>
                <p className="text-white/70 text-[14px] leading-relaxed mt-3 max-w-[42ch]">{wotd?.translation ?? t('home.wotd.mockTranslation')}</p>
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
              <span className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold">{t('home.wotd.remember')}</span>
              {wotd ? (
                wotd.forms.length > 0 ? (
                  <span className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs font-semibold">{t('home.wotd.forms', { list: wotd.forms.join(', ') })}</span>
                ) : null
              ) : (
                <span className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-xs">{t('home.wotd.synonyms')}</span>
              )}
            </div>
            </>
            )}
          </div>
        </SpotlightCard>
      </motion.section>

      {/* TOPICS — мемоизированы, viewport once */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3>{t('home.topics.title')}</h3>
          {themeCategories.length > 8 && topicsTab === 'system' && (
            <button className="text-link" type="button" onClick={() => setShowAllTopics((v) => !v)}>
              {showAllTopics ? t('home.topics.collapse') : t('home.topics.all', { n: themeCategories.length })}
            </button>
          )}
        </div>
        {isAuthed && (
          <div className="flex gap-1.5 mb-3">
            {(['system', 'mine'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setTopicsTab(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${topicsTab === tab ? 'bg-white text-black border-white' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
              >
                {tab === 'system' ? t('home.myTopics.tabSystem') : `${t('home.myTopics.tabMine')} • ${ownCats.length}`}
              </button>
            ))}
          </div>
        )}
        {topicsTab === 'mine' && isAuthed ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {!ownDone ? (
                topicSkeletons.map((i) => <SkeletonCard key={i} />)
              ) : mineTopics.length > 0 ? (
                mineTopics.map((card, index) => (
                  <div key={card.id ?? card.title} className="relative">
                    <MemoTopicCard card={card} index={index} onOpen={openCategory} />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const src = ownCats.find((c) => c.id === card.id)
                          openCatDialog({ mode: 'rename', id: card.id as string, name: src?.name ?? card.title })
                        }}
                        aria-label={t('home.myTopics.renameTitle')}
                        className="w-7 h-7 rounded-full bg-black/60 border border-white/15 grid place-items-center text-[11px] hover:bg-black/80"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openCatDialog({ mode: 'delete', id: card.id as string, name: card.title })
                        }}
                        aria-label={t('home.myTopics.deleteBtn')}
                        className="w-7 h-7 rounded-full bg-black/60 border border-white/15 grid place-items-center text-[11px] hover:bg-[#f43f5e]/40"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[13px] opacity-40 col-span-full">{t('home.myTopics.empty')}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => openCatDialog({ mode: 'create' })}
                className="px-3.5 py-2 rounded-full bg-white text-black text-xs font-black hover:brightness-110"
              >
                {t('home.myTopics.create')}
              </button>
              {ownCats.length > 0 && (
                <button
                  onClick={() => {
                    setWordForm((v) => !v)
                    setWordError(null)
                    setWordAdded(false)
                    if (wordCat === '') setWordCat(ownCats[0]?.id ?? '')
                  }}
                  className="px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-black hover:bg-white/[0.1]"
                >
                  {t('home.addWord.open')}
                </button>
              )}
            </div>
            {wordForm && ownCats.length > 0 && (
              <div className="mt-3 rounded-2xl border border-white/[0.06] bg-[#171717] p-4 flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={wordEn}
                    onChange={(e) => setWordEn(e.target.value)}
                    placeholder={t('home.addWord.wordPh')}
                    className="px-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-sm focus:outline-none focus:border-white/20"
                  />
                  <input
                    value={wordRu}
                    onChange={(e) => setWordRu(e.target.value)}
                    placeholder={t('home.addWord.translationPh')}
                    className="px-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-sm focus:outline-none focus:border-white/20"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={wordCat || (ownCats[0]?.id ?? '')}
                    onChange={(e) => setWordCat(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-sm focus:outline-none"
                  >
                    {ownCats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name ?? c.slug}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => void submitWord()}
                    disabled={wordBusy}
                    className="px-4 py-2 rounded-xl bg-[#5AD4B5] text-black text-xs font-black hover:brightness-110 disabled:opacity-50"
                  >
                    {wordBusy ? '…' : t('home.addWord.add')}
                  </button>
                  {wordAdded && <span className="text-xs font-bold text-[#5AD4B5]">{t('home.addWord.added')}</span>}
                  {wordError && <span className="text-xs font-bold text-[#f43f5e]">{wordError}</span>}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {!isGuest && !themesDone ? (
              topicSkeletons.map((i) => <SkeletonCard key={i} />)
            ) : visibleTopics.length > 0 ? (
              visibleTopics.map((card, index) => (
                <MemoTopicCard key={card.title} card={card} index={index} onOpen={openCategory} />
              ))
            ) : isAuthed ? (
              <p className="text-[13px] opacity-40 col-span-full">{t('home.topics.empty')}</p>
            ) : null}
          </div>
        )}
      </motion.section>

      {catDialog && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => {
            if (!catBusy) setCatDialog(null)
          }}
        >
          <div
            className="w-full max-w-[380px] rounded-[20px] border border-white/[0.08] bg-[#171717] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-[15px] font-black">
              {catDialog.mode === 'create'
                ? t('home.myTopics.create')
                : catDialog.mode === 'rename'
                  ? t('home.myTopics.renameTitle')
                  : t('home.myTopics.deleteTitle', { name: catDialog.name })}
            </h4>
            {catDialog.mode !== 'delete' && (
              <input
                autoFocus
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submitCatDialog()
                }}
                placeholder={t('home.myTopics.namePh')}
                maxLength={60}
                className="mt-3 w-full px-3 py-2.5 rounded-xl bg-black/20 border border-white/[0.08] text-sm focus:outline-none focus:border-white/20"
              />
            )}
            {catError && <div className="text-xs font-bold text-[#f43f5e] mt-2">{catError}</div>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setCatDialog(null)}
                disabled={catBusy}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-black hover:bg-white/[0.1] disabled:opacity-50"
              >
                {t('home.myTopics.cancel')}
              </button>
              <button
                onClick={() => void submitCatDialog()}
                disabled={catBusy}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black disabled:opacity-50 ${catDialog.mode === 'delete' ? 'bg-[#f43f5e] text-white hover:brightness-110' : 'bg-white text-black hover:brightness-110'}`}
              >
                {catBusy
                  ? '…'
                  : catDialog.mode === 'create'
                    ? t('home.myTopics.createBtn')
                    : catDialog.mode === 'rename'
                      ? t('home.myTopics.save')
                      : t('home.myTopics.deleteBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRAMMAR — мемоизированы */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header section-header--stacked">
          <div>
            <h3>{t('home.grammar.title')}</h3>
            <p>{t('home.grammar.sub')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {!isGuest && !grammarDone ? (
            grammarSkeletons.map((i) => <SkeletonCard key={i} />)
          ) : visibleGrammar.length > 0 ? (
            visibleGrammar.map((card, index) => (
              <MemoGrammarCard key={card.title} card={card} index={index} onOpen={openCategory} />
            ))
          ) : isAuthed ? (
            <p className="text-[13px] opacity-40 col-span-full">{t('home.grammar.empty')}</p>
          ) : null}
        </div>
      </motion.section>

      {/* IRREGULAR VERBS — отдельная секция */}
      {(visibleVerbs.length > 0 || (!isGuest && !verbsDone)) && (
        <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
          <div className="section-header section-header--stacked">
            <div>
              <h3>{t('home.verbs.title')}</h3>
              <p>{t('home.verbs.sub')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {!isGuest && !verbsDone ? (
              grammarSkeletons.map((i) => <SkeletonCard key={i} />)
            ) : (
              visibleVerbs.map((card, index) => (
                <MemoGrammarCard key={card.title} card={card} index={index} onOpen={openCategory} />
              ))
            )}
          </div>
        </motion.section>
      )}

      {/* WEEKLY TREND — lazy, не блокирует первый paint */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3 className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBolt} className="text-[#5B74FF]" /> {t('home.weekly.title')}
          </h3>
          <span className="text-[11px] tracking-[0.12em] uppercase opacity-50 font-bold">{t('home.weekly.hint')}</span>
        </div>
        <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5 backdrop-blur">
          {!isGuest && !liveDone ? (
            <div className="h-[220px] w-full animate-pulse rounded-xl bg-white/[0.04]" aria-hidden />
          ) : (
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
          )}
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#5AD4B5]/15 text-[#5AD4B5] text-xs font-bold border border-[#5AD4B5]/20">{heroLoading ? '–' : t('home.weekly.todayMin', { n: live?.minutesToday ?? 18 })}</span>
            <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-semibold border border-white/10">{heroLoading ? t('home.weekly.counting') : (weekPeak ? t('home.weekly.peak', { n: weekPeak.minutes, day: weekPeak.day }) : t('home.weekly.peakFallback'))}</span>
            <span className="px-3 py-1 rounded-full bg-[#5B74FF]/15 text-[#8b9bff] text-xs font-semibold border border-[#5B74FF]/20">{t('home.weekly.goal')}</span>
          </div>
        </div>
      </motion.section>

      {/* STATS — native */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t('home.stats.words'), value: live?.wordsLearned ?? 142, sub: t('home.stats.total'), color: '#5AD4B5' },
            { label: t('home.stats.days'), value: live?.streak ?? 7, sub: live ? t('home.stats.record', { n: live.bestStreak }) : t('home.stats.recordEmpty'), color: '#F5C16A' },
            { label: t('home.stats.accuracy'), value: live ? Math.round(live.accuracy * 100) : 92, suffix: '%', color: '#5B74FF' },
            { label: t('home.stats.minutes'), value: live?.minutesToday ?? 18, sub: live ? t('home.stats.todaySub') : t('home.stats.of20'), color: '#F08AB4' },
          ].map((s) => (
            <div key={s.label} className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur flex flex-col items-center gap-1 text-center">
              <span className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold">{s.label}</span>
              <span className="text-[28px] font-black tracking-tight leading-none flex items-baseline justify-center gap-0.5" style={{ color: s.color }}>
                {heroLoading ? (
                  <span className="inline-block w-16 h-8 rounded-lg bg-white/10 animate-pulse" aria-hidden />
                ) : (
                  <>
                    <CountUp to={s.value} duration={1} className="tabular-nums" />
                    <span className="text-[22px] font-black">{s.suffix || ''}</span>
                  </>
                )}
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
            <FontAwesomeIcon icon={faComments} className="text-[#F08AB4]" /> {t('home.phrasesSection.title')}
          </h3>
          <button className="text-link" type="button">{t('home.phrasesSection.all')}</button>
        </div>
        <div className="phrase-strip">
          {PHRASE_STYLE.map((card, i) => {
            const item = { ...card, label: phraseLabels[i] ?? '' }
            return (
              <MemoPhraseCard key={card.title} card={item} isFlipped={flippedId === card.title} isSpeaking={speakingId === card.title && isSpeaking} onFlip={() => handleFlip(card.title)} onSpeak={() => handleSpeak(card.title, card.title)} />
            )
          })}
        </div>
      </motion.section>
    </motion.div>
  )
}
