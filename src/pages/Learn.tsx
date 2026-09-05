import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowRightArrowLeft,
  faBolt,
  faBrain,
  faCheck,
  faEyeSlash,
  faFlag,
  faHeadphones,
  faKeyboard,
  faListUl,
  faPlay,
  faPuzzlePiece,
  faRotateRight,
  faScaleBalanced,
  faShuffle,
  faTrophy,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'
import StudyFlashcard from '@/components/StudyFlashcard'
import ChoiceCard from '@/components/ChoiceCard'
import BoolCard from '@/components/BoolCard'
import AnagramCard from '@/components/AnagramCard'
import BlitzBar from '@/components/BlitzBar'
import { useSpeech } from '@/hooks/useSpeech'
import { useAuth } from '@/context/AuthContext'
import {
  answerCard,
  finishSession,
  getAvailability,
  getDistractors,
  getNextCard,
  listSessions,
  saveWordHint,
  startSession,
  type Availability,
  type NextCardData,
  type RemoteSession,
} from '@/lib/learn-api'
import {
  autoQuality,
  hashOf,
  resolveMode,
  shuffle,
  wordBadge,
  type BaseMode,
  type Direction,
} from '@/lib/study'
import {
  listAchievements,
  listLanguages,
  listLearningProfiles,
  type RemoteLearningProfile,
} from '@/lib/profile-api'
import { formatBinding, matchesShortcut, useShortcuts } from '@/lib/shortcuts'
import { listCategories } from '@/lib/catalog-api'

type Phase = 'loading' | 'menu' | 'study' | 'finished'

const GRADES = [
  { quality: 1, bindingId: 'grade_again', label: 'Снова', sub: 'не помню', color: '#f43f5e' },
  { quality: 3, bindingId: 'grade_hard', label: 'Трудно', sub: 'еле вспомнил', color: '#ff9d5c' },
  { quality: 4, bindingId: 'grade_good', label: 'Хорошо', sub: 'вспомнил', color: '#5AD4B5' },
  { quality: 5, bindingId: 'grade_easy', label: 'Легко', sub: 'сразу', color: '#5B74FF' },
] as const

const LIMITS = [10, 20, 30]

const BLITZ_SECONDS = 12

const AUTO_MODES: BaseMode[] = ['typing', 'choice', 'bool', 'anagram']

interface DirectionInfo {
  id: Direction
  label: string
  hint: string
  group: 'flip' | 'game' | 'auto'
  icon?: IconDefinition
}

const DIRECTIONS: DirectionInfo[] = [
  { id: 'f2n', label: 'Слово — перевод', hint: 'видишь слово, вспоминаешь перевод', group: 'flip' },
  { id: 'n2f', label: 'Перевод — слово', hint: 'видишь перевод, вспоминаешь слово', group: 'flip' },
  { id: 'typing', label: 'Ввод слова', hint: 'печатаешь слово на английском, опечатки прощаются', group: 'flip', icon: faKeyboard },
  { id: 'audio', label: 'На слух', hint: 'слышишь слово, вспоминаешь значение', group: 'flip', icon: faHeadphones },
  { id: 'choice', label: 'Выбор из 4', hint: 'слово + 4 варианта перевода', group: 'game', icon: faListUl },
  { id: 'anagram', label: 'Собери слово', hint: 'буквы перемешаны — собери слово обратно', group: 'game', icon: faPuzzlePiece },
  { id: 'bool', label: 'Верно / нет', hint: 'пара «слово — перевод»: правда или ложь?', group: 'game', icon: faScaleBalanced },
  { id: 'mixed', label: 'Микс', hint: 'режим случаен для каждой карточки', group: 'auto', icon: faShuffle },
  { id: 'smart', label: 'Умный микс', hint: 'режим по зрелости слова: новое — карточки, зрелое — игры', group: 'auto', icon: faBrain },
]

const GROUP_LABELS: Record<DirectionInfo['group'], string> = {
  flip: 'Карточки',
  game: 'Игры',
  auto: 'Автомикс',
}

const BLITZ_OK_MODES: Direction[] = ['choice', 'bool', 'mixed', 'smart']

function LangChip({ code }: { code: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded-md bg-black/25 border border-white/15 text-[10.5px] font-black tracking-wide leading-none">
      {code}
    </span>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.12] text-[10.5px] font-black text-white/85 font-sans">
      {children}
    </kbd>
  )
}

export default function Learn() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, token, ready: authReady } = useAuth()
  const { speak, isSpeaking, cancel } = useSpeech({ lang: 'en-US', rate: 0.92 })

  const [phase, setPhase] = useState<Phase>('loading')
  const [profiles, setProfiles] = useState<RemoteLearningProfile[]>([])
  const [langMap, setLangMap] = useState<Record<string, string>>({})
  const [profileId, setProfileId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<RemoteSession[]>([])
  const [source, setSource] = useState<'mixed' | 'due' | 'new'>('mixed')
  const [direction, setDirection] = useState<Direction>(() => {
    const saved = localStorage.getItem('lexio:card-direction')
    return (DIRECTIONS.some((d) => d.id === saved) ? saved : 'mixed') as Direction
  })
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState<string | null>(null)
  const [availability, setAvailability] = useState<Availability | null>(null)
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({})

  const clearAuto = useCallback(() => {
    if (autoTimer.current !== null) {
      window.clearTimeout(autoTimer.current)
      autoTimer.current = null
    }
  }, [])

  const resetRound = useCallback(() => {
    clearAuto()
    setFlipped(false)
    setForceReveal(false)
    setRequeuedFlash(false)
    setChoiceData(null)
    setBoolData(null)
    lastQuality.current = null
  }, [clearAuto])

  // Resume is scoped to the current topic: each category keeps its own
  // continuation, a fresh start abandons only the matching one (backend).
  // NOTE: must stay below the categoryId declaration (TDZ otherwise).
  const resumeSession =
    sessions.find(
      (s) => s.status === 'active' && (s.category_id ?? null) === (categoryId ?? null),
    ) ?? null

  const SOURCE_LABELS: Record<string, string> = {
    mixed: 'Всё сразу',
    due: 'Повторение',
    new: 'Новые слова',
  }

  const refreshSessions = useCallback(() => {
    if (!user || !token || !profileId) return
    listSessions(user.id, token, profileId)
      .then(setSessions)
      .catch(() => undefined)
  }, [user, token, profileId])

  // Resolve the resume banner's category name.
  useEffect(() => {
    const id = resumeSession?.category_id
    if (!id || categoryNames[id]) return
    let cancelled = false
    listCategories()
      .then((list) => {
        if (cancelled) return
        setCategoryNames((prev) => {
          const next = { ...prev }
          list.forEach((c) => {
            next[c.id] = c.name ?? c.slug
          })
          return next
        })
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [resumeSession?.category_id, categoryNames])

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
    setOffset(0)
    // Same route, new topic: drop any in-progress study screen back to menu.
    setPhase('menu')
    setSession(null)
    setCard(null)
    resetRound()
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
  }, [searchParams, resetRound])
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
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const [blitz, setBlitz] = useState(() => localStorage.getItem('lexio:blitz') === '1')
  const [hideTr, setHideTr] = useState(() => localStorage.getItem('lexio:hide-tr') === '1')
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [best, setBest] = useState(() => Number(localStorage.getItem('lexio:blitz-best') ?? 0) || 0)
  const [requeuedFlash, setRequeuedFlash] = useState(false)
  const [forceReveal, setForceReveal] = useState(false)
  const [choiceData, setChoiceData] = useState<{ forId: string; options: string[]; correctIdx: number } | 'loading' | 'short' | null>(null)
  const [boolData, setBoolData] = useState<{ forId: string; shown: string; isCorrect: boolean } | 'loading' | 'short' | null>(null)

  const choicePickRef = useRef<((i: number) => void) | null>(null)
  const boolAnswerRef = useRef<((v: boolean) => void) | null>(null)
  const anagramKeyRef = useRef<((key: string) => void) | null>(null)
  const autoTimer = useRef<number | null>(null)
  const lastQuality = useRef<number | null>(null)

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
              setSessions(list)
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

  const refreshAvailability = useCallback(() => {
    if (!user || !token || !profileId) {
      setAvailability(null)
      return
    }
    getAvailability(user.id, token, profileId, categoryId ? { category_id: categoryId } : {})
      .then(setAvailability)
      .catch(() => setAvailability(null))
  }, [user, token, profileId, categoryId])

  useEffect(() => {
    if (phase !== 'menu') return
    refreshAvailability()
  }, [phase, refreshAvailability])

  const loadCard = useCallback(
    async (uid: string, tk: string, sessionId: string) => {
      const next = await getNextCard(uid, tk, sessionId)
      setCard(next)
      setSession((prev) =>
        prev ? { ...prev, answered: next.answered, total: next.total } : prev,
      )
      resetRound()
    },
    [resetRound],
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
          resetRound()
          setSessionCorrect(0)
          setSessionXp(0)
          setStreak(0)
          setMaxStreak(0)
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
          offset: source === 'due' ? 0 : offset,
        })
        setSession(created)
        setSessions((prev) => {
          const rest = prev.filter(
            (s) =>
              !(
                s.status === 'active' &&
                (s.category_id ?? null) === (created.category_id ?? null)
              ),
          )
          return [created, ...rest]
        })
        setSessionCorrect(0)
        setSessionXp(0)
        setStreak(0)
        setMaxStreak(0)
        setUnlocked([])
        await loadCard(user.id, token, created.id)
        setPhase('study')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не получилось начать урок')
      } finally {
        setStarting(false)
      }
    },
    [user, token, profileId, source, limit, categoryId, offset, loadCard, resetRound],
  )

  useEffect(() => clearAuto, [clearAuto])

  const submitAnswer = useCallback(
    async (quality: number) => {
      if (!user || !token || !session || !card || answering) return
      clearAuto()
      lastQuality.current = quality
      setError(null)
      setAnswering(true)
      try {
        const res = await answerCard(user.id, token, session.id, card.card.learnable_id, quality)
        setSession(res.session)
        setSessionCorrect((c) => c + (quality >= 3 ? 1 : 0))
        setSessionXp((x) => x + res.xp_gained)
        setRequeuedFlash(res.requeued)
        setStreak((s) => {
          const ns = quality >= 3 ? s + 1 : 0
          setMaxStreak((m) => {
            const nm = Math.max(m, ns)
            setBest((b) => {
              if (nm > b) {
                localStorage.setItem('lexio:blitz-best', String(nm))
                return nm
              }
              return b
            })
            return nm
          })
          return ns
        })
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
          setForceReveal(false)
          setRequeuedFlash(false)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не получилось ответить')
      } finally {
        setAnswering(false)
      }
    },
    [user, token, session, card, answering, clearAuto],
  )

  // Manual grade (flip modes): only after seeing the answer.
  const grade = useCallback(
    (quality: number) => {
      if (!flipped) return
      void submitAnswer(quality)
    },
    [flipped, submitAnswer],
  )

  // Auto grade (typing/choice/bool/anagram): verified fact, delayed so
  // the feedback stays visible.
  const scheduleAuto = useCallback(
    (quality: number, delayMs: number) => {
      clearAuto()
      setAnswering(true)
      autoTimer.current = window.setTimeout(() => {
        autoTimer.current = null
        setAnswering(false)
        void submitAnswer(quality)
      }, delayMs)
    },
    [clearAuto, submitAnswer],
  )

  const finishEarly = useCallback(async () => {
    if (!user || !token || !session) return
    clearAuto()
    try {
      const done = await finishSession(user.id, token, session.id)
      setSession(done)
    } catch {
      /* ignore */
    }
    refreshSessions()
    setPhase('finished')
  }, [user, token, session, refreshSessions, clearAuto])

  const speakCard = useCallback(
    (text: string, lang: string, key: string) => {
      if (isSpeaking) {
        cancel()
        setSpeakingKey(null)
        return
      }
      setSpeakingKey(key)
      speak(text, lang)
      window.setTimeout(() => setSpeakingKey(null), 4000)
    },
    [isSpeaking, speak, cancel],
  )

  const voiceLangs = useMemo(() => {
    const active = profiles.find((p) => p.id === profileId)
    const code = (id?: string) => {
      const c = id ? (langMap[id] ?? '') : ''
      return c ? `${c.toLowerCase()}-${c.toUpperCase()}` : 'en-US'
    };
    return {
      target: code(active?.target_language_id) || 'en-US',
      native: code(active?.native_language_id) || 'ru-RU',
    }
  }, [profiles, profileId, langMap])

  useEffect(() => {
    localStorage.setItem('lexio:card-direction', direction)
  }, [direction])

  useEffect(() => {
    localStorage.setItem('lexio:blitz', blitz ? '1' : '0')
  }, [blitz])

  useEffect(() => {
    localStorage.setItem('lexio:hide-tr', hideTr ? '1' : '0')
  }, [hideTr])

  // Both word lists per card (backend sends target/native, fallback to legacy fields).
  const cardTexts = useMemo(() => {
    const c = card?.card
    return {
      target: c?.target_texts?.length ? c.target_texts : c ? [c.front_text] : [],
      native: c?.native_texts ?? c?.back_texts ?? [],
    }
  }, [card])

  // Sync mode resolution (mixed / smart mix by word maturity).
  // Choice/bool distractor sufficiency is checked async after that.
  const cardMode = useMemo<BaseMode>(() => {
    const c = card?.card
    return resolveMode(
      direction,
      c?.learnable_id ?? '',
      card?.progress
        ? {
            repetition: card.progress.repetition,
            interval_days: card.progress.interval_days,
            easiness_factor: card.progress.easiness_factor,
          }
        : null,
      cardTexts.native.length > 0,
    )
  }, [direction, card, cardTexts])

  const cardBadge = useMemo(
    () =>
      wordBadge(
        card?.progress
          ? {
              repetition: card.progress.repetition,
              interval_days: card.progress.interval_days,
              easiness_factor: card.progress.easiness_factor,
            }
          : null,
      ),
    [card],
  )

  const saveOwnHint = useCallback(
    async (hintText: string) => {
      if (!user || !token || !profileId || !card) return
      try {
        const res = await saveWordHint(user.id, token, profileId, {
          learnable_type: card.card.learnable_type,
          learnable_id: card.card.learnable_id,
          own_hint: hintText,
        })
        setCard((prev) =>
          prev ? { ...prev, card: { ...prev.card, own_hint: res.own_hint } } : prev,
        )
      } catch {
        setError('Не получилось сохранить подсказку')
      }
    },
    [user, token, profileId, card],
  )

  // Quiz data: distractors for choice / wrong-pair material for bool.
  useEffect(() => {
    if (phase !== 'study' || !card || !user || !token || !profileId || cardMode !== 'choice') {
      if (cardMode !== 'choice') setChoiceData(null)
      return
    }
    const c = card.card
    if (choiceData && typeof choiceData === 'object' && choiceData.forId === c.learnable_id) return
    setChoiceData('loading')
    let cancelled = false
    getDistractors(user.id, token, profileId, {
      learnable_type: c.learnable_type,
      learnable_id: c.learnable_id,
      side: 'native',
      category_id: session?.category_id ?? undefined,
      count: 3,
    })
      .then((opts) => {
        if (cancelled) return
        if (opts.length < 2) {
          setChoiceData('short')
          return
        }
        const correct = cardTexts.native[0]
        const options = shuffle([correct, ...opts.slice(0, 3)])
        setChoiceData({ forId: c.learnable_id, options, correctIdx: options.indexOf(correct) })
      })
      .catch(() => {
        if (!cancelled) setChoiceData('short')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, card, cardMode, cardTexts, user, token, profileId, session?.category_id])

  useEffect(() => {
    if (phase !== 'study' || !card || !user || !token || !profileId || cardMode !== 'bool') {
      if (cardMode !== 'bool') setBoolData(null)
      return
    }
    const c = card.card
    if (boolData && typeof boolData === 'object' && boolData.forId === c.learnable_id) return
    setBoolData('loading')
    let cancelled = false
    getDistractors(user.id, token, profileId, {
      learnable_type: c.learnable_type,
      learnable_id: c.learnable_id,
      side: 'native',
      category_id: session?.category_id ?? undefined,
      count: 1,
    })
      .then((opts) => {
        if (cancelled) return
        if (opts.length === 0) {
          setBoolData('short')
          return
        }
        const showCorrect = hashOf(c.learnable_id) % 2 === 0
        setBoolData({
          forId: c.learnable_id,
          shown: showCorrect ? cardTexts.native[0] : opts[0],
          isCorrect: showCorrect,
        })
      })
      .catch(() => {
        if (!cancelled) setBoolData('short')
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, card, cardMode, cardTexts, user, token, profileId, session?.category_id])

  const choiceReady = cardMode === 'choice' && choiceData !== null && typeof choiceData === 'object'
  const boolReady = cardMode === 'bool' && boolData !== null && typeof boolData === 'object'
  const choiceForCard =
    choiceReady && typeof choiceData === 'object' && card && choiceData.forId === card.card.learnable_id
      ? choiceData
      : null
  const boolForCard =
    boolReady && typeof boolData === 'object' && card && boolData.forId === card.card.learnable_id
      ? boolData
      : null
  const choiceFallback = cardMode === 'choice' && choiceData !== null && choiceData !== 'loading' && !choiceReady
  const boolFallback = cardMode === 'bool' && boolData !== null && boolData !== 'loading' && !boolReady
  const choiceLoading = cardMode === 'choice' && !choiceForCard && !choiceFallback
  const boolLoading = cardMode === 'bool' && !boolForCard && !boolFallback
  const blitzActive = blitz && (choiceForCard !== null || boolForCard !== null)
  const quizActive = choiceReady || boolReady || cardMode === 'anagram'
  const manualMode = !AUTO_MODES.includes(cardMode) || choiceFallback || boolFallback

  const { bindings } = useShortcuts()

  // Keyboard-first lesson: Space flips / advances, grade keys evaluate,
  // quiz modes answer from the keyboard too.
  // Capture phase + stopPropagation so the focused card doesn't double-flip.
  useEffect(() => {
    if (phase !== 'study') return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (choiceReady && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        choicePickRef.current?.(Number(e.key) - 1)
        return
      }
      if (boolReady && (e.key === '1' || e.key === '2')) {
        e.preventDefault()
        boolAnswerRef.current?.(e.key === '1')
        return
      }
      if (cardMode === 'anagram' && (e.key === 'Backspace' || /^[a-zA-Zа-яА-ЯёЁ]$/.test(e.key))) {
        e.preventDefault()
        anagramKeyRef.current?.(e.key)
        return
      }
      if (e.key === ' ') {
        // In auto modes Space belongs to the answer — never flip/grade.
        if (!manualMode && !flipped) return
        e.preventDefault()
        e.stopPropagation()
        if (!flipped) setFlipped(true)
        else grade(4)
        return
      }
      if (!manualMode) return
      if (flipped && matchesShortcut(e, bindings.flip_back)) {
        e.preventDefault()
        e.stopPropagation()
        setFlipped(false)
        return
      }
      const found = GRADES.find((g) => matchesShortcut(e, bindings[g.bindingId]))
      if (found) {
        e.preventDefault()
        grade(found.quality)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [phase, grade, flipped, bindings, setFlipped, manualMode, cardMode, choiceReady, boolReady])

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

  const langCodes = useMemo(() => {
    const p = profiles.find((x) => x.id === profileId)
    return {
      target: (p && langMap[p.target_language_id]) || 'EN',
      native: (p && langMap[p.native_language_id]) || 'RU',
    }
  }, [profiles, profileId, langMap])

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
          {resumeSession && (
            <button
              onClick={() => beginSession(resumeSession.id)}
              className="rounded-[20px] border border-[#F5C16A]/30 bg-[#F5C16A]/[0.07] p-5 text-left hover:bg-[#F5C16A]/[0.1] transition-colors"
            >
              <div className="flex items-center gap-2 text-[#F5C16A] text-[12px] font-black uppercase tracking-wide">
                <FontAwesomeIcon icon={faRotateRight} /> Продолжить с места остановки
              </div>
              <div className="text-[13px] font-bold text-white/70 mt-1">
                {SOURCE_LABELS[resumeSession.source] ?? resumeSession.source}
                {resumeSession.category_id
                  ? ` • ${categoryNames[resumeSession.category_id] ?? 'тема'}`
                  : ' • все слова'}
              </div>
              <div className="text-[22px] font-black mt-1 tabular-nums">
                {resumeSession.answered}/{resumeSession.total}
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-[#F5C16A]"
                  style={{ width: `${resumeSession.total > 0 ? Math.round((resumeSession.answered / resumeSession.total) * 100) : 0}%` }}
                />
              </div>
            </button>
          )}

          <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
            <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2">
              <FontAwesomeIcon icon={faPlay} className="text-[#5AD4B5]" /> Новый урок
            </h3>
            <div className="text-xs opacity-40 mt-1">Пара шагов — и погнали: что учим, как спрашиваем, сколько берём, жмём старт</div>
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
            <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-4 mb-1.5">
              Шаг 1 — что учим
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'mixed', label: 'Всё сразу', hint: 'повторения + новые' },
                  { id: 'due', label: 'Повторение', hint: 'только долги' },
                  { id: 'new', label: 'Новые слова', hint: 'то, что не видел' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  title={s.hint}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${source === s.id ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {categoryId && source !== 'new' && (
              <div className="text-[11px] opacity-40 mt-2">
                Повторения — по всем словам, новые — из выбранной темы
              </div>
            )}
            <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-4 mb-1.5">
              Шаг 2 — как спрашиваем
            </div>
            {(['flip', 'game', 'auto'] as const).map((group) => (
              <div key={group} className="mb-1.5">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-1">
                  {GROUP_LABELS[group]}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DIRECTIONS.filter((d) => d.group === group).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDirection(d.id)}
                      title={`${d.label} — ${d.hint}`}
                      aria-pressed={direction === d.id}
                      className={`h-9 px-3 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${direction === d.id ? 'bg-[#5B74FF]/20 border-[#5B74FF]/60 text-white shadow-[0_0_18px_rgba(91,116,255,0.3)]' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
                    >
                      {(d.id === 'f2n' || d.id === 'n2f') && (
                        <>
                          <LangChip code={d.id === 'f2n' ? langCodes.target : langCodes.native} />
                          <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[10px] opacity-60" />
                          <LangChip code={d.id === 'f2n' ? langCodes.native : langCodes.target} />
                        </>
                      )}
                      {d.icon && d.id !== 'f2n' && d.id !== 'n2f' && (
                        <FontAwesomeIcon icon={d.icon} className="text-xs opacity-80" />
                      )}
                      <span>{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-[11.5px] opacity-50 mt-1">
              {DIRECTIONS.find((d) => d.id === direction)?.hint}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <button
                onClick={() => setBlitz((v) => !v)}
                disabled={!BLITZ_OK_MODES.includes(direction)}
                title={BLITZ_OK_MODES.includes(direction) ? 'Таймер 12 сек + серия верных ответов' : 'Блиц работает с выбором, парами и миксом'}
                aria-pressed={blitz}
                className={`h-9 px-3 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 disabled:opacity-30 ${blitz && BLITZ_OK_MODES.includes(direction) ? 'bg-[#F5C16A]/20 border-[#F5C16A]/60 text-[#F5C16A]' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
              >
                <FontAwesomeIcon icon={faBolt} className="text-xs" />
                <span>Блиц ⏱ {BLITZ_SECONDS}с</span>
              </button>
              <button
                onClick={() => setHideTr((v) => !v)}
                title="Транскрипция скрыта — открывается по тапу"
                aria-pressed={hideTr}
                className={`h-9 px-3 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${hideTr ? 'bg-white/[0.12] border-white/25 text-white' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
              >
                <FontAwesomeIcon icon={faEyeSlash} className="text-xs opacity-80" />
                <span>Спрятать транскрипцию</span>
              </button>
            </div>
            <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-4 mb-1.5">
              Шаг 3 — сколько берём
            </div>
            <div className="flex items-center gap-2">
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
            {source !== 'due' && (
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-xs opacity-40 font-bold" title="Пропустить первые N новых слов — например, начать со 120-го">Начать с N-го слова:</span>
                <button
                  onClick={() => setOffset((v) => Math.max(0, v - limit))}
                  className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center hover:bg-white/10 text-sm"
                  aria-label="Назад"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, (availability?.new ?? 1) - 1)}
                  value={offset}
                  onChange={(e) => {
                    const v = Math.floor(Number(e.target.value))
                    setOffset(Number.isFinite(v) ? Math.max(0, v) : 0)
                  }}
                  className="w-[76px] px-2.5 py-1.5 rounded-xl bg-black/20 border border-white/[0.06] text-xs font-black tabular-nums text-center focus:outline-none focus:border-white/20"
                />
                <button
                  onClick={() => setOffset((v) => v + limit)}
                  className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center hover:bg-white/10 text-sm font-black"
                  aria-label="Вперёд"
                >
                  +
                </button>
                {availability && availability.new > 0 && (
                  <span className="text-[11px] opacity-40 tabular-nums">
                    слова {Math.min(offset + 1, availability.new)}–{Math.min(offset + limit, availability.new)} из {availability.new}
                  </span>
                )}
              </div>
            )}
            {profiles.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfileId(p.id)
                      setSessions([])
                      setOffset(0)
                      if (user && token) {
                        listSessions(user.id, token, p.id)
                          .then(setSessions)
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
            {availability && (availability.due > 0 || availability.new > 0) ? (
              <div className="text-xs opacity-60 mt-3">
                Доступно: <span className="font-black text-white">{availability.due} на повторение</span>
                {' • '}
                <span className="font-black text-white">{availability.new} новых</span>
                <span className="opacity-60"> — остальное продолжишь в следующих уроках</span>
              </div>
            ) : availability ? (
              <div className="rounded-2xl border border-[#5AD4B5]/25 bg-[#5AD4B5]/[0.06] p-4 mt-3 text-center">
                <div className="text-2xl">🎉</div>
                <div className="text-[13px] font-black mt-1">Всё выучено!</div>
                <div className="text-xs opacity-50 mt-0.5">Повторений нет, новых слов нет — так держать</div>
              </div>
            ) : null}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-2.5 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-white/55">
              <span className="font-black text-white/80 uppercase tracking-widest text-[10px]">Как отвечать</span>
              <span>🖱️ клик — перевернуть</span>
              <span>
                <Kbd>Пробел</Kbd> — перевод, ещё раз — дальше ✓
              </span>
              <span>
                <Kbd>{formatBinding(bindings.grade_again)}</Kbd>–<Kbd>{formatBinding(bindings.grade_easy)}</Kbd> — оценка
              </span>
              <span>🎮 игры и ввод оцениваются сами</span>
            </div>
            <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-4 mb-1.5">
              Шаг 4 — погнали
            </div>
            <button
              onClick={() => beginSession()}
              disabled={starting || !profileId || (availability !== null && availability.due === 0 && availability.new === 0)}
              className="w-full py-3 rounded-2xl bg-[#5AD4B5] text-black text-sm font-black hover:brightness-110 transition disabled:opacity-50"
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

          {blitzActive && (
            <BlitzBar
              seconds={BLITZ_SECONDS}
              streak={streak}
              best={best}
              onTimeout={() => setForceReveal(true)}
            />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${card.card.learnable_id}:${card.position}`}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.25 }}
            >
              {choiceForCard && (
                <ChoiceCard
                  question={cardTexts.target[0] ?? ''}
                  transcription={card.card.front_transcription}
                  questionSpeak={{ text: cardTexts.target[0] ?? '', lang: voiceLangs.target }}
                  options={choiceForCard.options}
                  correctIdx={choiceForCard.correctIdx}
                  speakingKey={speakingKey}
                  forceReveal={forceReveal}
                  pickRef={choicePickRef}
                  onSpeak={(text, lang, key) => speakCard(text, lang, key)}
                  onAnswer={(ok) => scheduleAuto(ok ? 4 : 1, 900)}
                />
              )}
              {boolForCard && (
                <BoolCard
                  word={cardTexts.target[0] ?? ''}
                  translation={boolForCard.shown}
                  isCorrect={boolForCard.isCorrect}
                  wordSpeak={{ text: cardTexts.target[0] ?? '', lang: voiceLangs.target }}
                  speakingKey={speakingKey}
                  forceReveal={forceReveal}
                  answerRef={boolAnswerRef}
                  onSpeak={(text, lang, key) => speakCard(text, lang, key)}
                  onAnswer={(ok) => scheduleAuto(ok ? 4 : 1, 900)}
                />
              )}
              {cardMode === 'anagram' && (
                <AnagramCard
                  word={cardTexts.target[0] ?? ''}
                  transcription={card.card.front_transcription}
                  wordSpeak={{ text: cardTexts.target[0] ?? '', lang: voiceLangs.target }}
                  speakingKey={speakingKey}
                  keyRef={anagramKeyRef}
                  onSpeak={(text, lang, key) => speakCard(text, lang, key)}
                  onSolved={(mistakes) => scheduleAuto(mistakes === 0 ? 5 : 3, 900)}
                  onGiveUp={() => scheduleAuto(1, 1200)}
                />
              )}
              {(choiceLoading || boolLoading) && (
                <div className="rounded-[24px] border border-white/[0.08] bg-[#171717] p-10 grid place-items-center min-h-[320px]">
                  <span className="text-sm opacity-50 animate-pulse">Подбираем варианты…</span>
                </div>
              )}
              {(cardMode !== 'choice' && cardMode !== 'bool' && cardMode !== 'anagram') || choiceFallback || boolFallback ? (
                <StudyFlashcard
                  mode={cardMode === 'choice' || cardMode === 'bool' ? 'f2n' : cardMode}
                  targetTexts={cardTexts.target}
                  nativeTexts={cardTexts.native}
                  transcription={card.card.front_transcription}
                  hint={card.card.hint}
                  flipped={flipped}
                  speakingKey={speakingKey}
                  targetLang={voiceLangs.target}
                  nativeLang={voiceLangs.native}
                  hideTranscription={hideTr}
                  badge={cardBadge}
                  ownHint={card.card.own_hint ?? null}
                  onSaveHint={(h) => void saveOwnHint(h)}
                  onFlip={() => setFlipped((v) => !v)}
                  onSpeak={(text, lang, key) => speakCard(text, lang, key)}
                  onSwipeLeft={() => grade(1)}
                  onSwipeRight={() => grade(4)}
                  onChecked={(kind, hints) => scheduleAuto(autoQuality(kind, hints), 1500)}
                  onMountAudio={() => speakCard(cardTexts.target[0] ?? '', voiceLangs.target, 'audio-q')}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {requeuedFlash && (
            <div className="rounded-2xl border border-[#ff9d5c]/30 bg-[#ff9d5c]/[0.07] px-3.5 py-2 text-center text-[12.5px] font-bold text-[#ff9d5c]">
              🔁 Не запомнилось — слово вернётся в конце урока
            </div>
          )}

          <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-4">
            {manualMode && !flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="w-full py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm font-black hover:bg-white/[0.1] transition"
              >
                {cardMode === 'n2f' || cardMode === 'audio' ? 'Показать слово' : 'Показать перевод'}
              </button>
            ) : manualMode ? (
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
                    <div className="text-[11px] opacity-50">{g.sub} • {formatBinding(bindings[g.bindingId])}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-[13px] font-bold text-white/45 py-3">
                {choiceLoading || boolLoading ? (
                  'Подбираем варианты…'
                ) : error && lastQuality.current !== null ? (
                  <button
                    onClick={() => {
                      setError(null)
                      if (lastQuality.current !== null) void submitAnswer(lastQuality.current)
                    }}
                    className="px-4 py-2 rounded-xl bg-[#f43f5e]/15 border border-[#f43f5e]/40 text-[#fb7185] hover:bg-[#f43f5e]/25 transition"
                  >
                    Не отправилось — попробовать снова
                  </button>
                ) : answering ? (
                  '⏳ Ставим оценку…'
                ) : cardMode === 'typing' ? (
                  '⌨️ Напечатай ответ на карточке ↑ и жми Enter'
                ) : cardMode === 'choice' ? (
                  'Выбери верный вариант ↑ — оценка сама'
                ) : cardMode === 'bool' ? (
                  'Пара верна? Ответь ↑ — оценка сама'
                ) : (
                  'Собери слово из букв ↑ — оценка сама'
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11.5px] text-white/55">
            {!flipped ? (
              cardMode === 'typing' ? (
                <>
                  <span>
                    <Kbd>Enter</Kbd> — проверить ответ
                  </span>
                  <span>💡 — подсказать букву</span>
                </>
              ) : cardMode === 'audio' ? (
                <>
                  <span>
                    <Kbd>Пробел</Kbd> — открыть слово
                  </span>
                  <span>🔊 слушай и вспоминай</span>
                </>
              ) : cardMode === 'choice' ? (
                <>
                  <span>
                    <Kbd>1</Kbd>–<Kbd>4</Kbd> — выбрать вариант
                  </span>
                  {blitzActive && <span>⏱ успей за {BLITZ_SECONDS}с</span>}
                </>
              ) : cardMode === 'bool' ? (
                <>
                  <span>
                    <Kbd>1</Kbd> — верно, <Kbd>2</Kbd> — неверно
                  </span>
                  {blitzActive && <span>⏱ успей за {BLITZ_SECONDS}с</span>}
                </>
              ) : cardMode === 'anagram' ? (
                <>
                  <span>печатай буквы • <Kbd>⌫</Kbd> — убрать</span>
                  <span>клик — тоже работает</span>
                </>
              ) : (
                <>
                  <span>
                    <Kbd>Пробел</Kbd> — {cardMode === 'n2f' ? 'открыть слово' : 'открыть перевод'}
                  </span>
                  <span>🖱️ или кликни по карточке</span>
                </>
              )
            ) : (
              <>
                <span>
                  <Kbd>Пробел</Kbd> — дальше ✓
                </span>
                <span>
                  <Kbd>{formatBinding(bindings.flip_back)}</Kbd> — назад к слову
                </span>
                <span>
                  <Kbd>{formatBinding(bindings.grade_again)}</Kbd>–<Kbd>{formatBinding(bindings.grade_easy)}</Kbd> — оценка
                </span>
              </>
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
            {blitz && maxStreak > 1 && (
              <div>
                <div className="text-[26px] font-black tabular-nums text-[#ff9d5c]">×{maxStreak}</div>
                <div className="text-[11px] opacity-40 font-bold">серия</div>
              </div>
            )}
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
                    .then(setSessions)
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
