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
import AssembleCard from '@/components/AssembleCard'
import ClozeCard from '@/components/ClozeCard'
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
  pickClozeGaps,
  resolveMode,
  shuffle,
  splitPhrase,
  wordBadge,
  type BaseMode,
  type Direction,
  type Fuzzy,
} from '@/lib/study'
import {
  listAchievements,
  listLanguages,
  listLearningProfiles,
  type RemoteLearningProfile,
} from '@/lib/profile-api'
import { formatBinding, matchesShortcut, useShortcuts, type ShortcutId } from '@/lib/shortcuts'
import { listCategories, listCategoriesWithProgress } from '@/lib/catalog-api'
import { useT } from '@/lib/i18n'
import { Skeleton, SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton'

type Phase = 'loading' | 'menu' | 'study' | 'finished'

const LIMITS = [10, 20, 30]

const BLITZ_SECONDS = 12

const AUTO_MODES: BaseMode[] = ['assemble', 'choice', 'bool']

interface DirectionInfo {
  id: Direction
  label: string
  hint: string
  group: 'flip' | 'game' | 'auto'
  icon?: IconDefinition
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
  const t = useT()

  // Text-bearing constants live in the body (not module scope) so they
  // re-render in the active language. Pure id/number constants stay out.
  const GRADES: { quality: number; bindingId: ShortcutId; label: string; sub: string; color: string }[] = [
    { quality: 1, bindingId: 'grade_again', label: t('learn.grades.again'), sub: t('learn.grades.again_sub'), color: '#f43f5e' },
    { quality: 3, bindingId: 'grade_hard', label: t('learn.grades.hard'), sub: t('learn.grades.hard_sub'), color: '#ff9d5c' },
    { quality: 4, bindingId: 'grade_good', label: t('learn.grades.good'), sub: t('learn.grades.good_sub'), color: '#5AD4B5' },
    { quality: 5, bindingId: 'grade_easy', label: t('learn.grades.easy'), sub: t('learn.grades.easy_sub'), color: '#5B74FF' },
  ]

  const DIRECTIONS: DirectionInfo[] = [
    { id: 'f2n', label: t('learn.directions.f2n_label'), hint: t('learn.directions.f2n_hint'), group: 'flip' },
    { id: 'n2f', label: t('learn.directions.n2f_label'), hint: t('learn.directions.n2f_hint'), group: 'flip' },
    { id: 'audio', label: t('learn.directions.audio_label'), hint: t('learn.directions.audio_hint'), group: 'flip', icon: faHeadphones },
    { id: 'choice', label: t('learn.directions.choice_label'), hint: t('learn.directions.choice_hint'), group: 'game', icon: faListUl },
    { id: 'assemble', label: t('learn.directions.assemble_label'), hint: t('learn.directions.assemble_hint'), group: 'game', icon: faPuzzlePiece },
    { id: 'bool', label: t('learn.directions.bool_label'), hint: t('learn.directions.bool_hint'), group: 'game', icon: faScaleBalanced },
    { id: 'mixed', label: t('learn.directions.mixed_label'), hint: t('learn.directions.mixed_hint'), group: 'auto', icon: faShuffle },
    { id: 'smart', label: t('learn.directions.smart_label'), hint: t('learn.directions.smart_hint'), group: 'auto', icon: faBrain },
  ]

  const GROUP_LABELS: Record<DirectionInfo['group'], string> = {
    flip: t('learn.groups.flip'),
    game: t('learn.groups.game'),
    auto: t('learn.groups.auto'),
  }

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
    mixed: t('learn.menu.sources.mixed'),
    due: t('learn.menu.sources.due'),
    new: t('learn.menu.sources.new'),
  }

  const refreshSessions = useCallback(() => {
    if (!user || !token || !profileId) return
    listSessions(user.id, token, profileId)
      .then(setSessions)
      .catch(() => undefined)
  }, [user, token, profileId])

  const loadCategoryNames = useCallback(async (): Promise<Record<string, string>> => {
    try {
      const list =
        user && token && profileId
          ? await listCategoriesWithProgress(user.id, token, profileId)
          : await listCategories()
      const map: Record<string, string> = {}
      list.forEach((c) => {
        map[c.id] = c.name ?? c.slug
      })
      return map
    } catch {
      return {}
    }
  }, [user, token, profileId])

  // Resolve the resume banner's category name.
  useEffect(() => {
    const id = resumeSession?.category_id
    if (!id || categoryNames[id]) return
    let cancelled = false
    loadCategoryNames()
      .then((map) => {
        if (cancelled || Object.keys(map).length === 0) return
        setCategoryNames((prev) => ({ ...prev, ...map }))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [resumeSession?.category_id, categoryNames, loadCategoryNames])

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
    loadCategoryNames()
      .then((map) => {
        if (cancelled || Object.keys(map).length === 0) return
        setCategoryName(map[id] ?? null)
        setCategoryNames((prev) => ({ ...prev, ...map }))
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
          setError(t('learn.errors.need_profile'))
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
        setError(e instanceof Error ? e.message : t('learn.errors.start_failed'))
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
        setError(e instanceof Error ? e.message : t('learn.errors.answer_failed'))
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

  // Auto grade (assemble/choice/bool): verified fact, delayed so
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
    [card, t],
  )

  // Flashcard only handles flip modes — games fall back to f2n.
  const flashMode: 'f2n' | 'n2f' | 'audio' =
    cardMode === 'n2f' || cardMode === 'audio' ? cardMode : 'f2n'

  // Phrases come as one string ("Where is the nearest metro?") — split into
  // per-word slots with a word bank; single words stay a single slot.
  const assembleTokens = useMemo(() => {
    const first = cardTexts.target[0] ?? ''
    if (card?.card.learnable_type !== 'phrase') return null
    if (cardTexts.target.length !== 1) return null
    const tokens = splitPhrase(first)
    return tokens.length > 1 ? tokens : null
  }, [card, cardTexts])
  const assembleWords = assembleTokens
    ? assembleTokens.map((tok) => tok.word.toLowerCase())
    : cardTexts.target
  const assembleLeads = assembleTokens ? assembleTokens.map((tok) => tok.lead) : undefined
  const assembleTrails = assembleTokens ? assembleTokens.map((tok) => tok.trail) : undefined
  // Cloze gaps for phrases: deterministic per card, content words preferred.
  // Tokens are lowercased — phrases are studied in one case.
  const clozeTokens = useMemo(
    () =>
      assembleTokens
        ? assembleTokens.map((tok) => ({ ...tok, word: tok.word.toLowerCase() }))
        : null,
    [assembleTokens],
  )
  const clozeGaps = useMemo(() => {
    if (!clozeTokens) return null
    return pickClozeGaps(
      clozeTokens.map((tok) => tok.word),
      card?.card.learnable_id ?? '',
    )
  }, [clozeTokens, card])

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
        setError(t('learn.errors.hint_failed'))
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
  const quizActive = choiceReady || boolReady || cardMode === 'assemble'
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
          aria-label={t('learn.header.back')}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
        </button>
        <div>
          <h1 className="text-[22px] font-black tracking-tight leading-none">{t('learn.header.title')}</h1>
          {profileLabel !== '' && <p className="text-xs opacity-40 mt-1">{profileLabel}</p>}
        </div>
        {phase === 'study' && session && (
          <span className="ml-auto text-xs font-black tabular-nums px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06]">
            {session.answered}/{session.total} • {progressPct}%
          </span>
        )}
      </div>

      {phase === 'loading' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <SkeletonCard className="min-h-[80px]">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1">
                <SkeletonLine width="40%" className="h-4" />
                <SkeletonLine width="25%" className="h-3 mt-1 opacity-50" />
              </div>
            </div>
          </SkeletonCard>
          <SkeletonCard>
            <Skeleton className="h-4 w-40 rounded-lg" />
            <Skeleton className="h-3 w-56 rounded-md mt-1 opacity-50" />
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
            <div className="flex gap-2 mt-4">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full rounded-2xl mt-5" />
          </SkeletonCard>
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
                <FontAwesomeIcon icon={faRotateRight} /> {t('learn.resume.cta')}
              </div>
              <div className="text-[13px] font-bold text-white/70 mt-1">
                {SOURCE_LABELS[resumeSession.source] ?? resumeSession.source}
                {resumeSession.category_id
                  ? ` • ${categoryNames[resumeSession.category_id] ?? t('learn.resume.topic_fallback')}`
                  : t('learn.resume.all_words')}
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
              <FontAwesomeIcon icon={faPlay} className="text-[#5AD4B5]" /> {t('learn.menu.new_lesson')}
            </h3>
            <div className="text-xs opacity-40 mt-1">{t('learn.menu.subtitle')}</div>
            {categoryId && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#5B74FF]/10 border border-[#5B74FF]/30 text-xs font-bold text-[#8b9bff] w-fit">
                <span>{t('learn.menu.topic', { name: categoryName ?? '…' })}</span>
                <button
                  onClick={() => {
                    setCategoryId(null)
                    setCategoryName(null)
                    setSearchParams({})
                    setSource('mixed')
                  }}
                  className="hover:text-white"
                  aria-label={t('learn.menu.remove_topic')}
                >
                  ×
                </button>
              </div>
            )}
            <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-4 mb-1.5">
              {t('learn.menu.step1')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'mixed', label: t('learn.menu.sources.mixed'), hint: t('learn.menu.sources.mixed_hint') },
                  { id: 'due', label: t('learn.menu.sources.due'), hint: t('learn.menu.sources.due_hint') },
                  { id: 'new', label: t('learn.menu.sources.new'), hint: t('learn.menu.sources.new_hint') },
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
                {t('learn.menu.topic_note')}
              </div>
            )}
            <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-4 mb-1.5">
              {t('learn.menu.step2')}
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
                title={BLITZ_OK_MODES.includes(direction) ? t('learn.menu.blitz_title_on', { s: BLITZ_SECONDS }) : t('learn.menu.blitz_title_off')}
                aria-pressed={blitz}
                className={`h-9 px-3 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 disabled:opacity-30 ${blitz && BLITZ_OK_MODES.includes(direction) ? 'bg-[#F5C16A]/20 border-[#F5C16A]/60 text-[#F5C16A]' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
              >
                <FontAwesomeIcon icon={faBolt} className="text-xs" />
                <span>{t('learn.menu.blitz', { s: BLITZ_SECONDS })}</span>
              </button>
              <button
                onClick={() => setHideTr((v) => !v)}
                title={t('learn.menu.hide_tr_title')}
                aria-pressed={hideTr}
                className={`h-9 px-3 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${hideTr ? 'bg-white/[0.12] border-white/25 text-white' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
              >
                <FontAwesomeIcon icon={faEyeSlash} className="text-xs opacity-80" />
                <span>{t('learn.menu.hide_tr')}</span>
              </button>
            </div>
            <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-4 mb-1.5">
              {t('learn.menu.step3')}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs opacity-40 font-bold">{t('learn.menu.words_in_lesson')}</span>
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
                <span className="text-xs opacity-40 font-bold" title={t('learn.menu.start_from_title')}>{t('learn.menu.start_from')}</span>
                <button
                  onClick={() => setOffset((v) => Math.max(0, v - limit))}
                  className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center hover:bg-white/10 text-sm"
                  aria-label={t('learn.header.back')}
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
                  aria-label={t('learn.header.forward')}
                >
                  +
                </button>
                {availability && availability.new > 0 && (
                  <span className="text-[11px] opacity-40 tabular-nums">
                    {t('learn.menu.range', { a: Math.min(offset + 1, availability.new), b: Math.min(offset + limit, availability.new), c: availability.new })}
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
                {t('learn.menu.available_prefix')} <span className="font-black text-white">{t('learn.menu.due', { n: availability.due })}</span>
                {' • '}
                <span className="font-black text-white">{t('learn.menu.new_words', { n: availability.new })}</span>
                <span className="opacity-60"> {t('learn.menu.available_suffix')}</span>
              </div>
            ) : availability ? (
              <div className="rounded-2xl border border-[#5AD4B5]/25 bg-[#5AD4B5]/[0.06] p-4 mt-3 text-center">
                <div className="text-2xl">🎉</div>
                <div className="text-[13px] font-black mt-1">{t('learn.menu.done_title')}</div>
                <div className="text-xs opacity-50 mt-0.5">{t('learn.menu.done_sub')}</div>
              </div>
            ) : null}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-2.5 mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-white/55">
              <span className="font-black text-white/80 uppercase tracking-widest text-[10px]">{t('learn.howto.title')}</span>
              <span>{t('learn.howto.click_flip')}</span>
              <span>
                <Kbd>{t('learn.howto.space')}</Kbd> {t('learn.howto.space_flip')}
              </span>
              <span>
                <Kbd>{formatBinding(bindings.grade_again)}</Kbd>–<Kbd>{formatBinding(bindings.grade_easy)}</Kbd> {t('learn.howto.grade')}
              </span>
              <span>{t('learn.howto.auto')}</span>
            </div>
            <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-4 mb-1.5">
              {t('learn.menu.step4')}
            </div>
            <button
              onClick={() => beginSession()}
              disabled={starting || !profileId || (availability !== null && availability.due === 0 && availability.new === 0)}
              className="w-full py-3 rounded-2xl bg-[#5AD4B5] text-black text-sm font-black hover:brightness-110 transition disabled:opacity-50"
            >
              {starting ? t('learn.menu.starting') : t('learn.menu.start')}
            </button>
            {!profileId && (
              <div className="text-xs opacity-40 mt-2">{t('learn.menu.no_profile')}</div>
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
              {cardMode === 'assemble' && !choiceFallback && !boolFallback && clozeTokens && clozeGaps && (
                <ClozeCard
                  tokens={clozeTokens}
                  gaps={clozeGaps}
                  native={cardTexts.native[0] ?? ''}
                  onAnswer={(kind: Fuzzy, hints: number) => scheduleAuto(autoQuality(kind, hints), 900)}
                />
              )}
              {cardMode === 'assemble' && !choiceFallback && !boolFallback && !clozeTokens && (
                <AssembleCard
                  words={assembleWords}
                  native={cardTexts.native[0] ?? ''}
                  leads={assembleLeads}
                  trails={assembleTrails}
                  onAnswer={(kind: Fuzzy, hints: number) => scheduleAuto(autoQuality(kind, hints), 900)}
                />
              )}
              {(choiceLoading || boolLoading) && (
                <div className="rounded-[24px] border border-white/[0.08] bg-[#171717] p-10 grid place-items-center min-h-[320px]">
                  <span className="text-sm opacity-50 animate-pulse">{t('learn.study.picking')}</span>
                </div>
              )}
              {(cardMode !== 'choice' && cardMode !== 'bool' && cardMode !== 'assemble') || choiceFallback || boolFallback ? (
                <StudyFlashcard
                  mode={flashMode}
                  targetTexts={cardTexts.target}
                  nativeTexts={cardTexts.native}
                  transcription={card.card.front_transcription}
                  forms={card.card.forms ?? []}
                  formsPattern={card.card.forms_pattern ?? null}
                  hint={card.card.hint}
                  flipped={flipped}
                  speakingKey={speakingKey}
                  targetLang={voiceLangs.target}
                  nativeLang={voiceLangs.native}
                  hideTranscription={hideTr}
                  badge={cardBadge}
                  ownHint={card.card.own_hint ?? null}
                  onSaveHint={(h: string) => void saveOwnHint(h)}
                  onFlip={() => setFlipped((v) => !v)}
                  onSpeak={(text: string, lang: string, key: string) => speakCard(text, lang, key)}
                  onSwipeLeft={() => grade(1)}
                  onSwipeRight={() => grade(4)}
                  onMountAudio={() => speakCard(cardTexts.target[0] ?? '', voiceLangs.target, 'audio-q')}
                />
              ) : null}
            </motion.div>
          </AnimatePresence>

          {requeuedFlash && (
            <div className="rounded-2xl border border-[#ff9d5c]/30 bg-[#ff9d5c]/[0.07] px-3.5 py-2 text-center text-[12.5px] font-bold text-[#ff9d5c]">
              {t('learn.study.requeued')}
            </div>
          )}

          <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-4">
            {manualMode && !flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="w-full py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm font-black hover:bg-white/[0.1] transition"
              >
                {cardMode === 'n2f' || cardMode === 'audio' ? t('learn.study.show_word') : t('learn.study.show_translation')}
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
                  t('learn.study.picking')
                ) : error && lastQuality.current !== null ? (
                  <button
                    onClick={() => {
                      setError(null)
                      if (lastQuality.current !== null) void submitAnswer(lastQuality.current)
                    }}
                    className="px-4 py-2 rounded-xl bg-[#f43f5e]/15 border border-[#f43f5e]/40 text-[#fb7185] hover:bg-[#f43f5e]/25 transition"
                  >
                    {t('learn.errors.retry')}
                  </button>
                ) : answering ? (
                  t('learn.study.grading')
                ) : cardMode === 'assemble' ? (
                  t('learn.study.assemble_hint')
                ) : cardMode === 'choice' ? (
                  t('learn.study.choice_hint')
                ) : cardMode === 'bool' ? (
                  t('learn.study.bool_hint')
                ) : (
                  t('learn.study.assemble_hint')
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.05] px-3.5 py-2.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11.5px] text-white/55">
            {!flipped ? (
              cardMode === 'assemble' ? (
                <>
                  <span>
                    <Kbd>Enter</Kbd> {t('learn.hints.assemble_check')}
                  </span>
                  <span>{t('learn.hints.hint_letter')}</span>
                </>
              ) : cardMode === 'audio' ? (
                <>
                  <span>
                    <Kbd>{t('learn.howto.space')}</Kbd> — {t('learn.hints.open_word')}
                  </span>
                  <span>{t('learn.hints.audio_listen')}</span>
                </>
              ) : cardMode === 'choice' ? (
                <>
                  <span>
                    <Kbd>1</Kbd>–<Kbd>4</Kbd> {t('learn.hints.choice_pick')}
                  </span>
                  {blitzActive && <span>{t('learn.hints.blitz_time', { s: BLITZ_SECONDS })}</span>}
                </>
              ) : cardMode === 'bool' ? (
                <>
                  <span>
                    <Kbd>1</Kbd> {t('learn.hints.bool_yes')} <Kbd>2</Kbd> {t('learn.hints.bool_no')}
                  </span>
                  {blitzActive && <span>{t('learn.hints.blitz_time', { s: BLITZ_SECONDS })}</span>}
                </>
              ) : (
                <>
                  <span>
                    <Kbd>{t('learn.howto.space')}</Kbd> — {cardMode === 'n2f' ? t('learn.hints.open_word') : t('learn.hints.open_translation')}
                  </span>
                  <span>{t('learn.hints.default_click')}</span>
                </>
              )
            ) : (
              <>
                <span>
                  <Kbd>{t('learn.howto.space')}</Kbd> {t('learn.hints.next')}
                </span>
                <span>
                  <Kbd>{formatBinding(bindings.flip_back)}</Kbd> {t('learn.hints.back_to_word')}
                </span>
                <span>
                  <Kbd>{formatBinding(bindings.grade_again)}</Kbd>–<Kbd>{formatBinding(bindings.grade_easy)}</Kbd> {t('learn.howto.grade')}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-between text-xs opacity-40">
            <span>
              {t('learn.progress', { c: sessionCorrect, xp: sessionXp })}
            </span>
            <button onClick={finishEarly} className="inline-flex items-center gap-1.5 font-bold hover:opacity-100 hover:text-white transition">
              <FontAwesomeIcon icon={faFlag} /> {t('learn.finish')}
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
          <h2 className="text-[22px] font-black tracking-tight mt-4">{t('learn.finished.title')}</h2>
          <div className="flex justify-center gap-6 mt-4">
            <div>
              <div className="text-[26px] font-black tabular-nums text-[#5AD4B5]">
                {session.total > 0 ? Math.round((session.correct / session.total) * 100) : 0}%
              </div>
              <div className="text-[11px] opacity-40 font-bold">{t('learn.finished.correct')}</div>
            </div>
            <div>
              <div className="text-[26px] font-black tabular-nums">+{sessionXp}</div>
              <div className="text-[11px] opacity-40 font-bold">XP</div>
            </div>
            <div>
              <div className="text-[26px] font-black tabular-nums">
                {session.correct}/{session.total}
              </div>
              <div className="text-[11px] opacity-40 font-bold">{t('learn.finished.words')}</div>
            </div>
            {blitz && maxStreak > 1 && (
              <div>
                <div className="text-[26px] font-black tabular-nums text-[#ff9d5c]">×{maxStreak}</div>
                <div className="text-[11px] opacity-40 font-bold">{t('learn.finished.streak')}</div>
              </div>
            )}
          </div>
          {unlocked.length > 0 && (
            <div className="mt-4 rounded-2xl border border-[#F5C16A]/30 bg-[#F5C16A]/[0.07] p-3.5">
              <div className="text-[12px] font-black text-[#F5C16A] flex items-center justify-center gap-1.5">
                <FontAwesomeIcon icon={faTrophy} /> {t('learn.finished.achievements')}
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
              <FontAwesomeIcon icon={faBolt} className="mr-1.5 text-[#F5C16A]" /> {t('learn.finished.more')}
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-black"
            >
              {t('learn.finished.home')}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}
