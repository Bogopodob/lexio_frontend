import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faBolt,
  faBookOpen,
  faCheck,
  faFlag,
  faPlay,
  faRotateRight,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import FlipCard from '@/components/FlipCard'
import { useSpeech } from '@/hooks/useSpeech'
import { useAuth } from '@/context/AuthContext'
import {
  answerCard,
  finishSession,
  getNextCard,
  listSessions,
  startSession,
  type NextCardData,
  type RemoteSession,
} from '@/lib/learn-api'
import {
  listAchievements,
  listLanguages,
  listLearningProfiles,
  type RemoteLearningProfile,
} from '@/lib/profile-api'
import { listCategories } from '@/lib/catalog-api'

type Phase = 'loading' | 'menu' | 'study' | 'finished'

const GRADES = [
  { quality: 1, label: 'Снова', sub: 'не помню', color: '#f43f5e', key: '1' },
  { quality: 3, label: 'Трудно', sub: 'еле вспомнил', color: '#ff9d5c', key: '2' },
  { quality: 4, label: 'Хорошо', sub: 'вспомнил', color: '#5AD4B5', key: '3' },
  { quality: 5, label: 'Легко', sub: 'сразу', color: '#5B74FF', key: '4' },
]

const LIMITS = [10, 20, 30]

export default function Learn() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, token, ready: authReady } = useAuth()
  const { speak, isSpeaking, cancel } = useSpeech({ lang: 'en-US', rate: 0.92 })

  const [phase, setPhase] = useState<Phase>('loading')
  const [profiles, setProfiles] = useState<RemoteLearningProfile[]>([])
  const [langMap, setLangMap] = useState<Record<string, string>>({})
  const [profileId, setProfileId] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<RemoteSession | null>(null)
  const [source, setSource] = useState<'mixed' | 'due' | 'new'>('mixed')
  const [limit, setLimit] = useState(20)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState<string | null>(null)

  // Preselected category from topic/grammar cards (?category=<id>).
  useEffect(() => {
    const id = searchParams.get('category')
    if (!id) {
      setCategoryId(null)
      setCategoryName(null)
      return
    }
    let cancelled = false
    setCategoryId(id)
    setSource('new')
    listCategories()
      .then((list) => {
        if (cancelled) return
        const found = list.find((c) => c.id === id)
        setCategoryName(found?.name ?? found?.slug ?? null)
      })
      .catch(() => {
        if (!cancelled) setCategoryName(null)
      })
    return () => {
      cancelled = true
    }
  }, [searchParams])
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [session, setSession] = useState<RemoteSession | null>(null)
  const [card, setCard] = useState<NextCardData | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [answering, setAnswering] = useState(false)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionXp, setSessionXp] = useState(0)
  const [unlocked, setUnlocked] = useState<string[]>([])
  const [unlockTitles, setUnlockTitles] = useState<Record<string, string>>({})
  const [speaking, setSpeaking] = useState(false)

  // profiles + resumable session
  useEffect(() => {
    if (!authReady || !user || !token) return
    let cancelled = false
    const uid = user.id
    const tk = token
    Promise.allSettled([listLanguages(), listLearningProfiles(uid, tk)]).then(
      ([langsRes, profRes]) => {
        if (cancelled) return
        if (langsRes.status === 'fulfilled') {
          const map: Record<string, string> = {}
          langsRes.value.forEach((l) => {
            map[l.id] = l.code.toUpperCase()
          })
          setLangMap(map)
        }
        if (profRes.status === 'fulfilled' && profRes.value.length > 0) {
          setProfiles(profRes.value)
          const active = profRes.value.find((p) => p.is_active) ?? profRes.value[0]
          setProfileId(active.id)
          listSessions(uid, tk, active.id)
            .then((list) => {
              if (cancelled) return
              const resumable = list.find((s) => s.status === 'active')
              setActiveSession(resumable ?? null)
              setPhase('menu')
            })
            .catch(() => {
              if (!cancelled) setPhase('menu')
            })
        } else {
          setPhase('menu')
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [authReady, user, token])

  const loadCard = useCallback(
    async (uid: string, tk: string, sessionId: string) => {
      const next = await getNextCard(uid, tk, sessionId)
      setCard(next)
      setSession((prev) =>
        prev ? { ...prev, answered: next.answered, total: next.total } : prev,
      )
      setFlipped(false)
    },
    [],
  )

  const beginSession = useCallback(
    async (sessionId?: string) => {
      if (!user || !token) return
      setError(null)
      try {
        if (sessionId) {
          const [next, list] = await Promise.all([
            getNextCard(user.id, token, sessionId),
            profileId ? listSessions(user.id, token, profileId) : Promise.resolve([]),
          ])
          const found = list.find((s) => s.id === sessionId)
          if (found) setSession(found)
          setCard(next)
          setFlipped(false)
          setSessionCorrect(0)
          setSessionXp(0)
          setUnlocked([])
          setPhase('study')
          return
        }
        if (!profileId) {
          setError('Сначала выбери язык в профиле')
          return
        }
        setStarting(true)
        const created = await startSession(user.id, token, profileId, {
          source,
          limit,
          category_id: categoryId ?? undefined,
        })
        setSession(created)
        setActiveSession(created.status === 'active' ? created : null)
        setSessionCorrect(0)
        setSessionXp(0)
        setUnlocked([])
        await loadCard(user.id, token, created.id)
        setPhase('study')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не получилось начать урок')
      } finally {
        setStarting(false)
      }
    },
    [user, token, profileId, source, limit, categoryId, loadCard],
  )

  const grade = useCallback(
    async (quality: number) => {
      if (!user || !token || !session || !card || answering || !flipped) return
      setAnswering(true)
      try {
        const res = await answerCard(user.id, token, session.id, card.card.learnable_id, quality)
        setSession(res.session)
        setSessionCorrect((c) => c + (quality >= 3 ? 1 : 0))
        setSessionXp((x) => x + res.xp_gained)
        if (res.newly_unlocked.length > 0) {
          setUnlocked((prev) => [...prev, ...res.newly_unlocked.filter((c) => !prev.includes(c))])
        }
        if (res.finished || !res.next_card) {
          setPhase('finished')
        } else {
          const next = await getNextCard(user.id, token, session.id)
          setCard(next)
          setSession((prev) =>
            prev ? { ...prev, answered: next.answered, total: next.total } : prev,
          )
          setFlipped(false)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не получилось ответить')
      } finally {
        setAnswering(false)
      }
    },
    [user, token, session, card, answering, flipped],
  )

  const finishEarly = useCallback(async () => {
    if (!user || !token || !session) return
    try {
      const done = await finishSession(user.id, token, session.id)
      setSession(done)
    } catch {
      /* ignore */
    }
    setActiveSession(null)
    setPhase('finished')
  }, [user, token, session])

  const speakCard = useCallback(() => {
    if (!card) return
    if (isSpeaking) {
      cancel()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    speak(card.card.front_text)
    window.setTimeout(() => setSpeaking(false), 4000)
  }, [card, isSpeaking, speak, cancel])

  // number keys 1-4 grade the flipped card
  useEffect(() => {
    if (phase !== 'study') return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      const found = GRADES.find((g) => g.key === e.key)
      if (found) {
        e.preventDefault()
        grade(found.quality)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, grade])

  // achievement titles for the finish screen
  useEffect(() => {
    if (phase !== 'finished' || unlocked.length === 0 || !user || !token || !profileId) return
    listAchievements(user.id, token, profileId)
      .then((list) => {
        const map: Record<string, string> = {}
        list.forEach((a) => {
          map[a.code] = a.title
        })
        setUnlockTitles(map)
      })
      .catch(() => undefined)
  }, [phase, unlocked, user, token, profileId])

  const progressPct = useMemo(() => {
    if (!session || session.total === 0) return 0
    return Math.round((session.answered / session.total) * 100)
  }, [session])

  const profileLabel = useMemo(() => {
    const p = profiles.find((x) => x.id === profileId)
    if (!p) return ''
    return `${langMap[p.target_language_id] ?? ''} • ${p.level}`.trim()
  }, [profiles, profileId, langMap])

  const backText = card ? card.card.back_texts.join(' / ') || '—' : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
      className="w-full flex flex-col gap-5 max-w-[760px] mx-auto"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => (phase === 'study' ? finishEarly() : navigate('/'))}
          className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center hover:bg-white/10"
          aria-label="Назад"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
        </button>
        <div>
          <h1 className="text-[22px] font-black tracking-tight leading-none">Урок</h1>
          {profileLabel !== '' && <p className="text-xs opacity-40 mt-1">{profileLabel}</p>}
        </div>
        {phase === 'study' && session && (
          <span className="ml-auto text-xs font-black tabular-nums px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06]">
            {session.answered}/{session.total} • {progressPct}%
          </span>
        )}
      </div>

      {phase === 'loading' && (
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-10 grid place-items-center">
          <span className="text-sm opacity-50 animate-pulse">Готовим слова…</span>
        </div>
      )}

      {phase === 'menu' && (
        <div className="flex flex-col gap-4">
          {activeSession && activeSession.status === 'active' && (
            <button
              onClick={() => beginSession(activeSession.id)}
              className="rounded-[20px] border border-[#F5C16A]/30 bg-[#F5C16A]/[0.07] p-5 text-left hover:bg-[#F5C16A]/[0.1] transition-colors"
            >
              <div className="flex items-center gap-2 text-[#F5C16A] text-[12px] font-black uppercase tracking-wide">
                <FontAwesomeIcon icon={faRotateRight} /> Продолжить с места остановки
              </div>
              <div className="text-[22px] font-black mt-1 tabular-nums">
                {activeSession.answered}/{activeSession.total}
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-[#F5C16A]"
                  style={{ width: `${activeSession.total > 0 ? Math.round((activeSession.answered / activeSession.total) * 100) : 0}%` }}
                />
              </div>
            </button>
          )}

          <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
            <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2">
              <FontAwesomeIcon icon={faPlay} className="text-[#5AD4B5]" /> Новый урок
            </h3>
            <div className="text-xs opacity-40 mt-1">Сначала повторения, потом новые слова</div>
            {categoryId && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#5B74FF]/10 border border-[#5B74FF]/30 text-xs font-bold text-[#8b9bff] w-fit">
                <span>Тема: {categoryName ?? '…'}</span>
                <button
                  onClick={() => {
                    setCategoryId(null)
                    setCategoryName(null)
                    setSearchParams({})
                    setSource('mixed')
                  }}
                  className="hover:text-white"
                  aria-label="Убрать тему"
                >
                  ×
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {(
                [
                  { id: 'mixed', label: 'Всё сразу' },
                  { id: 'due', label: 'Повторение' },
                  { id: 'new', label: 'Новые слова' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  disabled={Boolean(categoryId) && s.id !== 'new'}
                  title={categoryId && s.id !== 'new' ? 'С выбранной темой — только новые слова' : undefined}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${source === s.id ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'} ${categoryId && s.id !== 'new' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs opacity-40 font-bold">Слов в уроке:</span>
              {LIMITS.map((n) => (
                <button
                  key={n}
                  onClick={() => setLimit(n)}
                  className={`w-9 h-9 rounded-full text-xs font-black border transition-all ${limit === n ? 'bg-white text-black border-white' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            {profiles.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfileId(p.id)
                      setActiveSession(null)
                      if (user && token) {
                        listSessions(user.id, token, p.id)
                          .then((list) => setActiveSession(list.find((s) => s.status === 'active') ?? null))
                          .catch(() => undefined)
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${p.id === profileId ? 'bg-[#5B74FF]/20 border-[#5B74FF]/40 text-[#8b9bff]' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
                  >
                    {langMap[p.target_language_id] ?? p.level} • {p.level}
                  </button>
                ))}
              </div>
            )}
            {error && <div className="text-xs font-bold text-[#f43f5e] mt-3">{error}</div>}
            <button
              onClick={() => beginSession()}
              disabled={starting || !profileId}
              className="mt-4 w-full py-3 rounded-2xl bg-[#5AD4B5] text-black text-sm font-black hover:brightness-110 transition disabled:opacity-50"
            >
              {starting ? 'Собираем колоду…' : 'Начать урок →'}
            </button>
            {!profileId && (
              <div className="text-xs opacity-40 mt-2">Выбери язык в профиле, чтобы начать учиться</div>
            )}
          </div>
        </div>
      )}

      {phase === 'study' && card && (
        <div className="flex flex-col gap-4">
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4 }}
              className="h-full rounded-full bg-[#5AD4B5]"
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={card.card.learnable_id}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.25 }}
            >
              <FlipCard
                label={card.card.hint ?? 'СЛОВО'}
                labelAccent=""
                icon={faBookOpen}
                title={card.card.front_text}
                translation={backText}
                isFlipped={flipped}
                isSpeaking={speaking}
                onFlip={() => setFlipped((v) => !v)}
                onSpeak={speakCard}
              />
              {card.card.front_transcription && (
                <div className="text-center text-sm opacity-50 mt-2 tabular-nums">
                  [{card.card.front_transcription}]
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-4">
            {!flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="w-full py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm font-black hover:bg-white/[0.1] transition"
              >
                Показать перевод
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GRADES.map((g) => (
                  <button
                    key={g.quality}
                    onClick={() => grade(g.quality)}
                    disabled={answering}
                    className="rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={{ background: `${g.color}12`, borderColor: `${g.color}30` }}
                  >
                    <div className="text-[13px] font-black" style={{ color: g.color }}>
                      {g.label}
                    </div>
                    <div className="text-[11px] opacity-50">{g.sub} • {g.key}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs opacity-40">
            <span>
              верно {sessionCorrect} • +{sessionXp} XP
            </span>
            <button onClick={finishEarly} className="inline-flex items-center gap-1.5 font-bold hover:opacity-100 hover:text-white transition">
              <FontAwesomeIcon icon={faFlag} /> Завершить
            </button>
          </div>
          {error && <div className="text-xs font-bold text-[#f43f5e]">{error}</div>}
        </div>
      )}

      {phase === 'finished' && session && (
        <div className="rounded-[24px] border border-white/[0.06] bg-[#171717] p-6 sm:p-8 text-center overflow-hidden relative">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-[#5AD4B5]/[0.08] blur-3xl pointer-events-none" />
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-[#5AD4B5] text-black text-2xl shadow-[0_12px_40px_rgba(90,212,181,0.4)]"
          >
            <FontAwesomeIcon icon={faCheck} />
          </motion.div>
          <h2 className="text-[22px] font-black tracking-tight mt-4">Урок пройден!</h2>
          <div className="flex justify-center gap-6 mt-4">
            <div>
              <div className="text-[26px] font-black tabular-nums text-[#5AD4B5]">
                {session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0}%
              </div>
              <div className="text-[11px] opacity-40 font-bold">верно</div>
            </div>
            <div>
              <div className="text-[26px] font-black tabular-nums">+{sessionXp}</div>
              <div className="text-[11px] opacity-40 font-bold">XP</div>
            </div>
            <div>
              <div className="text-[26px] font-black tabular-nums">
                {session.correct}/{session.total}
              </div>
              <div className="text-[11px] opacity-40 font-bold">слов</div>
            </div>
          </div>
          {unlocked.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#F5C16A]/30 bg-[#F5C16A]/[0.07] p-3.5">
              <div className="text-[12px] font-black text-[#F5C16A] flex items-center justify-center gap-1.5">
                <FontAwesomeIcon icon={faTrophy} /> Новые достижения
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {unlocked.map((code) => (
                  <span key={code} className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-bold">
                    {unlockTitles[code] ?? code}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 justify-center mt-5">
            <button
              onClick={() => {
                setPhase('menu')
                setSession(null)
                setCard(null)
                setUnlocked([])
                if (user && token && profileId) {
                  listSessions(user.id, token, profileId)
                    .then((list) => setActiveSession(list.find((s) => s.status === 'active') ?? null))
                    .catch(() => undefined)
                }
              }}
              className="px-5 py-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-black hover:bg-white/[0.1]"
            >
              <FontAwesomeIcon icon={faBolt} className="mr-1.5 text-[#F5C16A]" /> Ещё урок
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-black"
            >
              На главную
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
