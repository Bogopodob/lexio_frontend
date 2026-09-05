import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faVenus,
  faMars,
  faFire,
  faDumbbell,
  faBullseye,
  faStar,
  faTrophy,
  faBook,
  faLocationDot,
  faLanguage,
  faHeart,
  faRocket,
  faUsers,
  faCrown,
  faMedal,
  faBolt,
  faComments,
  faBell,
  faGraduationCap,
  faPen,
  faCheck,
  faCamera,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { useState, useEffect, useRef, useCallback, useMemo, memo, lazy, Suspense } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/context/AuthContext'
import {
  answerFriendRequest,
  createGoal,
  createLearningProfile,
  deleteGoal,
  getProfile,
  getStats,
  listAchievements,
  listFriendRequests,
  listFriends,
  listGoals,
  listLanguages,
  listLearningProfiles,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  updateGoal,
  updateLearningProfile,
  updateProfile,
  type FriendRequestRow,
  type RemoteAchievement,
  type RemoteFriend,
  type RemoteGoal,
  type RemoteLearningProfile,
  type RemoteStat,
  type UserSearchHit,
} from '@/lib/profile-api'
import { DatePicker, DateField, Calendar } from '@heroui/react'
import { parseDate, getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

const achievementsFallback = [
  { icon: faFire, title: '3 дня подряд', desc: 'Серия', condition: 'Учи 3 дня без пропуска', total: 3, current: 3, progress: 100, rarity: 'common', color: '#ff9d5c', reward: '+50 XP' },
  { icon: faDumbbell, title: '50 слов', desc: 'Первый словарь', condition: 'Выучи 50 слов', total: 50, current: 50, progress: 100, rarity: 'common', color: '#5AD4B5', reward: '+100 XP' },
  { icon: faBullseye, title: 'Первый урок', desc: 'Старт дан', condition: 'Пройди первый урок', total: 1, current: 1, progress: 100, rarity: 'common', color: '#5B74FF', reward: '+25 XP' },
  { icon: faStar, title: 'Цель 5 дней', desc: 'Неделя фокуса', condition: 'Достигай цель 5 дней', total: 5, current: 3, progress: 60, rarity: 'rare', color: '#F5C16A', reward: '+150 XP' },
  { icon: faTrophy, title: '100 слов', desc: 'Словарь растёт', condition: 'Выучи 100 слов', total: 100, current: 42, progress: 42, rarity: 'rare', color: '#F08AB4', reward: '+200 XP' },
  { icon: faCrown, title: 'Полиглот', desc: '500 слов', condition: 'Выучи 500 слов', total: 500, current: 142, progress: 28, rarity: 'epic', color: '#a78bfa', reward: '+1000 XP' },
  { icon: faBook, title: 'Книгочей', desc: '10 текстов', condition: 'Прочитай 10 текстов', total: 10, current: 4, progress: 40, rarity: 'common', color: '#5AD4B5', reward: '+80 XP' },
  { icon: faComments, title: 'Болтун', desc: '50 фраз', condition: 'Выучи 50 фраз', total: 50, current: 18, progress: 36, rarity: 'rare', color: '#5B74FF', reward: '+120 XP' },
  { icon: faBolt, title: 'Спринт 7', desc: '7 дней подряд', condition: 'Серия 7 дней', total: 7, current: 7, progress: 100, rarity: 'rare', color: '#ff9d5c', reward: '+200 XP' },
  { icon: faMedal, title: 'Отличник', desc: '95% точность', condition: 'Точность ≥95% (20 слов)', total: 20, current: 12, progress: 60, rarity: 'epic', color: '#F5C16A', reward: '+300 XP' },
  { icon: faGraduationCap, title: 'Экзамен B1', desc: 'Сдай тест', condition: 'Пройди тест B1', total: 1, current: 0, progress: 0, rarity: 'legendary', color: '#f43f5e', reward: '+500 XP' },
  { icon: faHeart, title: 'Любимчик', desc: '5 тем изучено', condition: 'Закрой 5 тем', total: 5, current: 1, progress: 20, rarity: 'common', color: '#F08AB4', reward: '+70 XP' },
]

const AchievementsBlock = memo(function AchievementsBlock({ items }: { items: typeof achievementsFallback }) {
  const [filter, setFilter] = useState<'all' | 'done' | 'progress'>('all')
  const [hovered, setHovered] = useState<(typeof achievementsFallback)[number] | null>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const hoverTimeout = useRef<number | null>(null)
  const itemCircumferences = useMemo(() => items.map((a) => {
    const circumference = 2 * Math.PI * 26
    const dashOffset = circumference * (1 - a.progress / 100)
    return { circumference, dashOffset }
  }), [items])

  const filtered = useMemo(() => items.filter((a) => {
    if (filter === 'done') return a.progress === 100
    if (filter === 'progress') return a.progress < 100
    return true
  }), [items, filter])
  const doneCount = useMemo(() => items.filter((a) => a.progress === 100).length, [items])

  const onEnter = useCallback((a: (typeof achievementsFallback)[number], e: React.MouseEvent) => {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ x: rect.left + rect.width / 2, y: rect.top })
    setHovered(a)
  }, [])
  const onLeave = useCallback(() => {
    if (hoverTimeout.current) window.clearTimeout(hoverTimeout.current)
    hoverTimeout.current = window.setTimeout(() => setHovered(null), 80) as unknown as number
  }, [])

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] overflow-hidden">
      <div className="p-5 pb-0 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-black tracking-tight flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#F5C16A]/15 border border-[#F5C16A]/20 grid place-items-center text-[#F5C16A]"><FontAwesomeIcon icon={faTrophy} /></span>
          Достижения
          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] font-bold opacity-60">{doneCount}/{items.length}</span>
        </h3>
        <div className="flex items-center gap-1 p-1 rounded-full bg-black/20 border border-white/[0.04]">
          {[
            { k: 'all', label: 'Все' },
            { k: 'done', label: '✓' },
            { k: 'progress', label: '…' },
          ].map((f) => (
            <button
              key={f.k}
              onClick={() => setFilter(f.k as never)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === f.k ? 'bg-white text-black border-white' : 'bg-transparent border-transparent text-white/40 hover:text-white hover:bg-white/[0.06]'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 px-5">
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10" style={{ scrollbarWidth: 'thin' }}>
          {filtered.map((a) => {
            const pct = a.progress
            const circumference = 2 * Math.PI * 26
            const dashOffset = circumference * (1 - pct / 100)
            const isCommon = a.rarity === 'common'
            return (
              <div
                key={a.title}
                onMouseEnter={(e) => onEnter(a, e)}
                onMouseLeave={onLeave}
                onMouseMove={(e) => onEnter(a, e)}
                className="group relative flex-none w-[148px] snap-start rounded-[20px] border p-3 pt-4 flex flex-col items-center gap-2 text-center transition-all duration-200 cursor-default hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                style={{
                  background: isCommon ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                  borderColor: isCommon ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.06)',
                }}
              >
                <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${a.rarity === 'common' ? 'bg-white/10 border-white/15 text-white/70' : a.rarity === 'rare' ? 'bg-[#5B74FF]/15 border-[#5B74FF]/25 text-[#8b9bff]' : a.rarity === 'epic' ? 'bg-[#a78bfa]/15 border-[#a78bfa]/25 text-[#a78bfa]' : 'bg-[#f43f5e]/15 border-[#f43f5e]/25 text-[#f43f5e]'}`}>{a.rarity}</span>
                <div className="relative w-[72px] h-[72px] grid place-items-center">
                  <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke={a.color}
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: circumference }}
                      whileInView={{ strokeDashoffset: dashOffset }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      style={{ strokeDasharray: circumference }}
                    />
                  </svg>
                  <span className="w-10 h-10 rounded-xl grid place-items-center border text-[16px] shadow-sm" style={{ background: `${a.color}18`, borderColor: `${a.color}30`, color: isCommon ? '#fff' : a.color, boxShadow: `0 0 12px ${a.color}18` }}>
                    <FontAwesomeIcon icon={a.icon} />
                  </span>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums border shadow-sm whitespace-nowrap" style={{ background: a.color, color: '#000', borderColor: 'rgba(255,255,255,0.9)' }}>{pct}%</span>
                </div>
                <span className="text-[12px] font-black leading-tight line-clamp-1 mt-1 text-white">{a.title}</span>
                <span className="text-[11px] leading-none text-white/50 line-clamp-1">{a.desc}</span>
                <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: `${a.color}12`, borderColor: `${a.color}20`, color: a.color }}>{a.total - a.current === 0 ? 'Готово' : `${a.total - a.current} осталось`}</span>
              </div>
            )
          })}
        </div>
      </div>

      {hovered &&
        createPortal(
          <div className="fixed z-[80] pointer-events-none -translate-x-1/2 -translate-y-full" style={{ left: pos.x, top: pos.y - 10 }}>
            <div className="w-[280px] rounded-2xl border border-white/[0.10] bg-[#1e1e1e] shadow-[0_20px_60px_rgba(0,0,0,0.55)] p-4 pointer-events-auto">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl grid place-items-center border shrink-0" style={{ background: `${hovered.color}16`, borderColor: `${hovered.color}28`, color: hovered.color }}>
                  <FontAwesomeIcon icon={hovered.icon} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-black leading-none flex items-center gap-1.5">
                    {hovered.title}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${hovered.rarity === 'common' ? 'bg-white/[0.08] border-white/[0.12] text-white/70' : hovered.rarity === 'rare' ? 'bg-[#5B74FF]/15 border-[#5B74FF]/30 text-[#8b9bff]' : hovered.rarity === 'epic' ? 'bg-[#a78bfa]/15 border-[#a78bfa]/30 text-[#a78bfa]' : 'bg-[#f43f5e]/15 border-[#f43f5e]/30 text-[#f43f5e]'}`}>{hovered.rarity}</span>
                  </div>
                  <div className="text-xs text-white/60 mt-1">{hovered.desc}</div>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                <div className="text-[11px] font-bold text-white/80">За что:</div>
                <div className="text-[13px] leading-snug mt-1 text-white/90">{hovered.condition}</div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-bold text-white/50">Прогресс</span>
                  <span className="text-xs font-black" style={{ color: hovered.color }}>{hovered.current}/{hovered.total} • {hovered.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden mt-1.5">
                  <div className="h-full rounded-full" style={{ width: `${hovered.progress}%`, background: hovered.color }} />
                </div>
                <div className="text-[12px] mt-2 font-bold" style={{ color: hovered.progress === 100 ? hovered.color : 'rgba(255,255,255,0.9)' }}>
                  {hovered.progress === 100 ? `✓ Получено • ${hovered.reward}` : `Осталось: ${hovered.total - hovered.current} • ${100 - hovered.progress}% • Награда: ${hovered.reward}`}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
})

const BirthDatePicker = memo(function BirthDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const dateValue = useMemo(() => {
    try {
      return value ? parseDate(value.slice(0, 10)) : undefined
    } catch {
      return undefined
    }
  }, [value])
  const minValue = useMemo(() => parseDate('1900-01-01'), [])
  const maxValue = useMemo(() => today(getLocalTimeZone()), [])

  const handleChange = useCallback((v: DateValue | null) => {
    if (!v) return
    onChange(v.toString().slice(0, 10))
  }, [onChange])

  return (
    <DatePicker
      value={dateValue}
      onChange={handleChange}
      minValue={minValue}
      maxValue={maxValue}
      granularity="day"
      className="shrink-0 w-[182px]"
    >
      <DateField.Group className="flex items-center gap-1 w-full px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs text-white focus-within:border-white/15">
        <DateField.Input className="flex-1 min-w-0 flex items-center whitespace-nowrap overflow-visible text-white/90 tabular-nums">
          {(segment) => <DateField.Segment segment={segment} className="px-[3px] py-px rounded-md tabular-nums focus:bg-white/20 focus:text-white focus:outline-none text-white/90 data-[placeholder]:text-white/30" />}
        </DateField.Input>
        <DateField.Suffix className="shrink-0 flex items-center">
          <DatePicker.Trigger className="text-white/50 hover:text-white rounded-full w-5 h-5 shrink-0 grid place-items-center">
            <DatePicker.TriggerIndicator className="text-xs" />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover className="max-w-none w-max bg-[#1e1e1e] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <Calendar aria-label="Дата рождения" className="bg-transparent text-white">
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>
              {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
            </Calendar.GridHeader>
            <Calendar.GridBody>
              {(date) => <Calendar.Cell date={date} />}
            </Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>
              {({ year, formattedYear }) => <Calendar.YearPickerCell year={year}>{formattedYear}</Calendar.YearPickerCell>}
            </Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  )
})

const WEEKDAYS = [
  { id: 'mon', label: 'Пн', full: 'Понедельник' },
  { id: 'tue', label: 'Вт', full: 'Вторник' },
  { id: 'wed', label: 'Ср', full: 'Среда' },
  { id: 'thu', label: 'Чт', full: 'Четверг' },
  { id: 'fri', label: 'Пт', full: 'Пятница' },
  { id: 'sat', label: 'Сб', full: 'Суббота' },
  { id: 'sun', label: 'Вс', full: 'Воскресенье' },
] as const

type DayKey = typeof WEEKDAYS[number]['id']

function emptySchedule(): Record<DayKey, string[]> {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
}

function sanitizeSchedule(raw: unknown): Record<DayKey, string[]> {
  const out = emptySchedule()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const d of WEEKDAYS) {
    const list = (raw as Record<string, unknown>)[d.id]
    if (!Array.isArray(list)) continue
    out[d.id] = [...new Set(list.filter((t): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.trim())))]
      .sort()
      .slice(0, 3)
  }
  return out
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    name: 'Алексей',
    birthDate: '2002-05-15',
    city: 'Москва',
    language: 'en',
    tags: ['Путешествия', 'Работа', 'Кино', 'Кофе'],
    avatar: null as string | null,
    level: 'A2' as string,
    gender: '' as string,
  })
  const [draft, setDraft] = useState(profile)
  const [customTag, setCustomTag] = useState('')
  const [remote, setRemote] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [langIdByCode, setLangIdByCode] = useState<Record<string, string>>({})
  const [hasLearningProfile, setHasLearningProfile] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [learningProfiles, setLearningProfiles] = useState<RemoteLearningProfile[]>([])
  const [profileStats, setProfileStats] = useState<Record<string, RemoteStat>>({})
  const [goal, setGoal] = useState(20)
  const fileRef = useRef<HTMLInputElement>(null)
  const { user, token, ready: authReady } = useAuth()
  const tagOptions = ['Путешествия', 'Работа', 'Кино', 'Кофе', 'Еда', 'Эмоции', 'Музыка', 'Спорт', 'Книги', 'Технологии']
  const langOptions = [
    { id: 'en', label: 'English', sub: 'Английский' },
    { id: 'es', label: 'Español', sub: 'Испанский' },
    { id: 'de', label: 'Deutsch', sub: 'Немецкий' },
    { id: 'fr', label: 'Français', sub: 'Французский' },
  ]
  const [goals, setGoals] = useState<(RemoteGoal & { desc: string; color: string })[]>([
    { id: 'mock-1', profile_id: '', title: 'Заговорить в кафе', desc: 'Заказать еду без пауз', progress: 68, color: '#5AD4B5', sort: 0 },
    { id: 'mock-2', profile_id: '', title: '20 фраз для путешествий', desc: 'Аэропорт, отель, город', progress: 42, color: '#5B74FF', sort: 1 },
    { id: 'mock-3', profile_id: '', title: 'Серия 14 дней', desc: 'Не пропускать', progress: 50, color: '#F5C16A', sort: 2 },
  ])
  const [achievements, setAchievements] = useState<typeof achievementsFallback | null>(null)
  const [friends, setFriends] = useState([
    { name: 'Марина', level: 'B1', streak: 12, avatar: 'М' },
    { name: 'Игорь', level: 'A2', streak: 7, avatar: 'И' },
    { name: 'София', level: 'A1', streak: 3, avatar: 'С' },
  ])
  const [friendQuery, setFriendQuery] = useState('')
  const [remoteFriends, setRemoteFriends] = useState<RemoteFriend[] | null>(null)
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([])
  const [searchHits, setSearchHits] = useState<UserSearchHit[]>([])
  const [searching, setSearching] = useState(false)

  const isAuthed = Boolean(user && token)
  // Settled flags: authed users see skeletons until server data arrives,
  // mocks are for guests only — no mock flash.
  const [goalsLoaded, setGoalsLoaded] = useState(false)
  const [achievementsLoaded, setAchievementsLoaded] = useState(false)
  const headerLoading = isAuthed && (remote === 'idle' || remote === 'loading')
  const goalsLoading = isAuthed && !goalsLoaded
  const achievementsLoading = isAuthed && !achievementsLoaded

  // Friends from the server (guests keep mocks).
  useEffect(() => {
    if (!user || !token) {
      setRemoteFriends(null)
      setIncoming([])
      return
    }
    let cancelled = false
    const uid = user.id
    const tk = token
    listFriends(uid, tk)
      .then((list) => {
        if (!cancelled) setRemoteFriends(list)
      })
      .catch(() => undefined)
    listFriendRequests(uid, tk, 'incoming')
      .then((list) => {
        if (!cancelled) setIncoming(list)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user, token])

  // Debounced user search.
  useEffect(() => {
    if (!user || !token || friendQuery.trim().length < 2) {
      setSearchHits([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = window.setTimeout(() => {
      searchUsers(user.id, token, friendQuery.trim())
        .then((hits) => {
          setSearchHits(hits)
          setSearching(false)
        })
        .catch(() => setSearching(false))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [friendQuery, user, token])

  const reloadFriends = useCallback(() => {
    if (!user || !token) return
    listFriends(user.id, token)
      .then(setRemoteFriends)
      .catch(() => undefined)
    listFriendRequests(user.id, token, 'incoming')
      .then(setIncoming)
      .catch(() => undefined)
  }, [user, token])

  const handleSendRequest = useCallback(
    (hit: UserSearchHit) => {
      if (!user || !token) return
      sendFriendRequest(user.id, token, { user_id: hit.user_id })
        .then(() => {
          setSearchHits((prev) =>
            prev.map((h) => (h.user_id === hit.user_id ? { ...h, relation: 'pending' } : h)),
          )
          setFriendQuery('')
        })
        .catch(() => undefined)
    },
    [user, token],
  )

  const handleAnswer = useCallback(
    (requestId: string, accept: boolean) => {
      if (!user || !token) return
      answerFriendRequest(user.id, token, requestId, accept)
        .then(() => reloadFriends())
        .catch(() => undefined)
    },
    [user, token, reloadFriends],
  )

  const handleRemoveFriend = useCallback(
    (friendshipId: string) => {
      if (!user || !token) return
      removeFriend(user.id, token, friendshipId)
        .then(() => reloadFriends())
        .catch(() => undefined)
    },
    [user, token, reloadFriends],
  )
  const mockUsers = useMemo(
    () => {
      const lowerQuery = friendQuery.toLowerCase()
      return [
        { name: 'Анна', level: 'B1', avatar: 'А' },
        { name: 'Дмитрий', level: 'A2', avatar: 'Д' },
        { name: 'Елена', level: 'B2', avatar: 'Е' },
        { name: 'Павел', level: 'A1', avatar: 'П' },
      ].filter((u) => u.name.toLowerCase().includes(lowerQuery) && !friends.some((f) => f.name === u.name))
    },
    [friendQuery, friends],
  )

  const age = useMemo(() => {
    const raw = draft.birthDate || profile.birthDate
    if (!raw) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
    const d = new Date(`${raw}T00:00:00`)
    if (Number.isNaN(d.getTime())) return null
    const now = new Date()
    if (d.getTime() > now.getTime()) return null
    const years = now.getFullYear() - d.getFullYear()
    const hadBirthday =
      now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate())
    return hadBirthday ? years : years - 1
  }, [draft.birthDate, profile.birthDate])

  const birthDateError = useMemo(() => {
    if (!isEditing || !draft.birthDate) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) return 'Некорректная дата'
    const d = new Date(`${draft.birthDate}T00:00:00`)
    if (Number.isNaN(d.getTime())) return 'Некорректная дата'
    if (d.getTime() > Date.now()) return 'Дата рождения не может быть в будущем'
    if (d.getFullYear() < 1900) return 'Год должен быть не раньше 1900'
    return null
  }, [isEditing, draft.birthDate])

  const handleBirthDateChange = useCallback((v: string) => {
    setDraft((p) => ({ ...p, birthDate: v }))
  }, [])

  useEffect(() => {
    if (!authReady || !user || !token) return
    let cancelled = false
    setRemote('loading')
    Promise.allSettled([getProfile(user.id, token), listLanguages(), listLearningProfiles(user.id, token)])
      .then(([profileRes, languagesRes, profilesRes]) => {
        if (cancelled) return
        if (profileRes.status === 'rejected' && profilesRes.status === 'rejected') {
          setRemote('error')
          return
        }
        const idByCode: Record<string, string> = {}
        if (languagesRes.status === 'fulfilled') {
          languagesRes.value.forEach((l) => { idByCode[l.code] = l.id })
          setLangIdByCode(idByCode)
        }
        const profiles = profilesRes.status === 'fulfilled' ? profilesRes.value : []
        setLearningProfiles(profiles)
        const active = profiles.find((p) => p.is_active) ?? profiles[0] ?? null
        setHasLearningProfile(active !== null)
        setActiveProfileId(active ? active.id : null)
        if (active && typeof active.daily_goal === 'number') setGoal(active.daily_goal)
        const remoteProfile = profileRes.status === 'fulfilled' ? profileRes.value : null
        // Authed users get honest server state: missing fields stay EMPTY,
        // mocks remain for guests only.
        const serverFields = {
          name: remoteProfile?.name || user.name?.trim() || '',
          birthDate: remoteProfile?.birth_date ? remoteProfile.birth_date.slice(0, 10) : '',
          city: remoteProfile?.city || '',
          tags: Array.isArray(remoteProfile?.tags) ? (remoteProfile.tags as string[]) : [],
          avatar: remoteProfile?.avatar ?? null,
          gender: remoteProfile?.gender === 'male' || remoteProfile?.gender === 'female' ? remoteProfile.gender : '',
        }
        let language = 'en'
        let level = 'A2'
        if (active) {
          const code = Object.keys(idByCode).find((c) => idByCode[c] === active.target_language_id)
          if (code && ['en', 'es', 'de', 'fr'].includes(code)) language = code
          if (active.level) level = active.level
        }
        setProfile((prev) => ({ ...prev, ...serverFields, language, level }))
        setDraft((prev) => ({ ...prev, ...serverFields, language }))
        if (remoteProfile?.reminder_schedule != null) {
          setSchedule(sanitizeSchedule(remoteProfile.reminder_schedule))
        }
        setScheduleApplied(true)
        setRemote('ready')
      })
    return () => { cancelled = true }
  }, [authReady, user, token])

  const startEdit = useCallback(() => { setDraft(profile); setIsEditing(true); setSaveError(null) }, [profile])
  const cancelEdit = useCallback(() => setIsEditing(false), [])
  const saveEdit = useCallback(() => {
    if (birthDateError) {
      setSaveError(birthDateError)
      return
    }
    const snapshot = draft
    setProfile(snapshot)
    setIsEditing(false)
    setSaveError(null)
    if (!user || !token) return
    setSaving(true)
    const payload: { name?: string | null; city?: string | null; birth_date?: string | null; tags?: string[]; avatar?: string | null; gender?: string | null } = {
      name: snapshot.name.trim() || null,
      city: snapshot.city.trim() || null,
      birth_date: snapshot.birthDate || null,
      tags: snapshot.tags,
      gender: snapshot.gender === 'male' || snapshot.gender === 'female' ? snapshot.gender : null,
    }
    if (snapshot.avatar && snapshot.avatar.length <= 2000) payload.avatar = snapshot.avatar
    updateProfile(user.id, token, payload)
      .then(async () => {
        // Language IS the learning profile: ensure one exists for the chosen
        // language and make it active (backend deactivates the rest).
        const targetId = langIdByCode[snapshot.language]
        const nativeId = langIdByCode.ru
        if (!targetId || !nativeId) return
        try {
          let profile = learningProfiles.find((p) => p.target_language_id === targetId)
          if (!profile) {
            profile = await createLearningProfile(user.id, token as string, targetId, nativeId)
            setLearningProfiles((prev) => [...prev, profile as RemoteLearningProfile])
          }
          const updated = await updateLearningProfile(user.id, token as string, profile.id, {
            is_active: true,
          })
          setLearningProfiles((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : { ...p, is_active: false })),
          )
          setActiveProfileId(updated.id)
          setHasLearningProfile(true)
          if (updated.level) {
            setProfile((prev) => ({ ...prev, level: (updated as RemoteLearningProfile).level }))
          }
        } catch {
          // profile stays local-only; base data is already saved
        }
      })
      .catch(() => setSaveError('Не сохранилось на сервер — проверь соединение'))
      .finally(() => setSaving(false))
  }, [draft, user, token, learningProfiles, langIdByCode, birthDateError])
  const onAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setDraft((p) => ({ ...p, avatar: r.result as string }))
    r.readAsDataURL(f)
  }, [])
  const toggleTag = useCallback((tag: string) => {
    setDraft((p) => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter((t) => t !== tag) : p.tags.length < 6 ? [...p.tags, tag] : p.tags }))
  }, [])
  const addCustomTag = useCallback(() => {
    const t = customTag.trim()
    if (!t || draft.tags.includes(t) || draft.tags.length >= 6) return
    setDraft((p) => ({ ...p, tags: [...p.tags, t] }))
    setCustomTag('')
  }, [customTag, draft.tags])
  const [schedule, setSchedule] = useState<Record<DayKey, string[]>>(() => {
    try {
      const raw = localStorage.getItem('lexio:reminder-schedule')
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const base: Record<DayKey, string[]> = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] }
          let found = false
          for (const d of (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[])) {
            const list = (parsed as Record<string, unknown>)[d]
            if (Array.isArray(list)) {
              base[d] = list.filter((t): t is string => typeof t === 'string').slice(0, 3)
              if (base[d].length > 0) found = true
            }
          }
          if (found) return base
        }
      }
    } catch {
      /* ignore */
    }
    return { mon: ['09:00'], tue: ['09:00'], wed: ['09:00'], thu: ['09:00'], fri: ['09:00'], sat: [], sun: [] }
  })
  const [scheduleApplied, setScheduleApplied] = useState(false)
  const [timeDraft, setTimeDraft] = useState('09:00')

  useEffect(() => {
    try {
      localStorage.setItem('lexio:reminder-schedule', JSON.stringify(schedule))
    } catch {
      /* ignore */
    }
    if (!scheduleApplied || !user || !token) return
    const timer = window.setTimeout(() => {
      updateProfile(user.id, token, { reminder_schedule: schedule }).catch(() => undefined)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [schedule, scheduleApplied, user, token])

  const scheduleStats = useMemo(() => {
    const days = WEEKDAYS.filter((d) => schedule[d.id].length > 0)
    const total = days.reduce((n, d) => n + schedule[d.id].length, 0)
    return { days: days.length, total }
  }, [schedule, WEEKDAYS])

  const scheduleSummary = useMemo(() => {
    if (scheduleStats.days === 0) return 'выключены'
    const first = WEEKDAYS.map((d) => schedule[d.id][0]).find(Boolean) ?? ''
    const dayWord = scheduleStats.days === 1 ? 'день' : scheduleStats.days < 5 ? 'дня' : 'дней'
    return `${scheduleStats.days} ${dayWord} • ${scheduleStats.total} в неделю${first ? ` • с ${first}` : ''}`
  }, [schedule, scheduleStats, WEEKDAYS])

  const toggleDay = useCallback((day: DayKey) => {
    setSchedule((prev) => ({ ...prev, [day]: prev[day].length > 0 ? [] : ['09:00'] }))
  }, [])

  const addTime = useCallback((day: DayKey) => {
    const t = timeDraft.trim()
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return
    setSchedule((prev) => {
      const list = prev[day]
      if (list.includes(t) || list.length >= 3) return prev
      return { ...prev, [day]: [...list, t].sort() }
    })
  }, [timeDraft])

  const removeTime = useCallback((day: DayKey, time: string) => {
    setSchedule((prev) => ({ ...prev, [day]: prev[day].filter((t) => t !== time) }))
  }, [])

  const applyPreset = useCallback((kind: 'weekdays' | 'everyday' | 'clear') => {
    if (kind === 'clear') {
      setSchedule(emptySchedule())
      return
    }
    const days: DayKey[] = kind === 'everyday'
      ? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
      : ['mon', 'tue', 'wed', 'thu', 'fri']
    setSchedule((prev) => {
      const next = { ...prev }
      for (const d of (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as DayKey[])) {
        next[d] = days.includes(d) ? ['09:00'] : []
      }
      return next
    })
  }, [])

  const ACHIEVEMENT_ICONS: Record<string, typeof faFire> = {
    streak_3: faFire,
    words_50: faDumbbell,
    first_lesson: faBullseye,
    goal_streak_5: faStar,
    words_100: faTrophy,
    words_500: faCrown,
    phrases_50: faComments,
    streak_7: faBolt,
    accuracy_95: faMedal,
  }

  // Goals + achievements of the active language profile (guests keep mocks).
  useEffect(() => {
    if (!user || !token || !activeProfileId) return
    let cancelled = false
    const uid = user.id
    const tk = token
    const pid = activeProfileId
    listGoals(uid, tk, pid)
      .then((list) => {
        if (cancelled) return
        if (list.length === 0) {
          setGoals([])
          return
        }
        setGoals(
          list.map((g, i) => ({
            id: g.id,
            profile_id: g.profile_id,
            title: g.title,
            desc: g.desc ?? '',
            color: g.color ?? ['#5AD4B5', '#5B74FF', '#F5C16A'][i % 3],
            progress: g.progress,
            sort: g.sort,
          })),
        )
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setGoalsLoaded(true)
      })
    listAchievements(uid, tk, pid)
      .then((list) => {
        if (cancelled) return
        if (list.length === 0) {
          setAchievements([])
          return
        }
        setAchievements(
          list.map((a) => ({
            icon: ACHIEVEMENT_ICONS[a.code] ?? faStar,
            title: a.title,
            desc: a.desc ?? '',
            condition: a.condition,
            total: a.target,
            current: Math.min(a.progress, a.target),
            progress: a.target > 0 ? Math.round((Math.min(a.progress, a.target) / a.target) * 100) : 0,
            rarity: a.rarity,
            color: a.color ?? '#5AD4B5',
            reward: `+${a.reward_xp} XP`,
          })),
        )
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setAchievementsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [user, token, activeProfileId])

  // No learning profile: nothing will load the lists — settle quietly.
  useEffect(() => {
    if (isAuthed && remote === 'ready' && !activeProfileId) {
      setGoalsLoaded(true)
      setAchievementsLoaded(true)
    }
  }, [isAuthed, remote, activeProfileId])

  // Mini-stats for every language profile (shown under each language card).
  useEffect(() => {
    if (!user || !token || learningProfiles.length === 0) return
    let cancelled = false
    const uid = user.id
    const tk = token
    Promise.allSettled(
      learningProfiles.map((p) =>
        getStats(uid, tk, p.id).then((s) => ({ id: p.id, stat: s })),
      ),
    ).then((results) => {
      if (cancelled) return
      const map: Record<string, RemoteStat> = {}
      for (const r of results) {
        if (r.status === 'fulfilled') map[r.value.id] = r.value.stat
      }
      setProfileStats(map)
    })
    return () => {
      cancelled = true
    }
  }, [user, token, learningProfiles])

  const goalKey = (g: { id?: string; title: string }) => g.id ?? g.title

  const removeGoal = useCallback(
    (g: { id?: string; title: string }) => {
      const key = goalKey(g)
      setGoals((prev) => prev.filter((x) => goalKey(x) !== key))
      if (user && token && activeProfileId && g.id && !g.id.startsWith('mock-')) {
        deleteGoal(user.id, token, activeProfileId, g.id).catch(() => undefined)
      }
    },
    [user, token, activeProfileId],
  )

  const addGoal = useCallback(
    (preset: { title: string; desc: string; color: string }) => {
      if (goals.length >= 3) return
      if (user && token && activeProfileId) {
        createGoal(user.id, token, activeProfileId, preset)
          .then((created) =>
            setGoals((prev) =>
              prev.length >= 3
                ? prev
                : [
                    ...prev,
                    {
                      id: created.id,
                      profile_id: created.profile_id,
                      title: created.title,
                      desc: created.desc ?? preset.desc,
                      color: created.color ?? preset.color,
                      progress: created.progress,
                      sort: created.sort,
                    },
                  ],
            ),
          )
          .catch(() => undefined)
        return
      }
      setGoals((prev) =>
        prev.length >= 3
          ? prev
          : [...prev, { id: `mock-${Date.now()}`, profile_id: '', sort: prev.length, ...preset, progress: 0 }],
      )
    },
    [goals.length, user, token, activeProfileId],
  )

  const patchGoal = useCallback(
    (g: { id?: string; title: string }, patch: { title?: string; desc?: string; progress?: number }) => {
      const key = goalKey(g)
      setGoals((prev) => prev.map((x) => (goalKey(x) === key ? { ...x, ...patch } : x)))
      if (user && token && activeProfileId && g.id && !g.id.startsWith('mock-')) {
        updateGoal(user.id, token, activeProfileId, g.id, patch).catch(() => undefined)
      }
    },
    [user, token, activeProfileId],
  )

  const goalMood = goal <= 10 ? '🐢 Спокойный темп — главное каждый день'
    : goal <= 20 ? '💪 Уверенный темп — так держать'
    : goal <= 30 ? '🔥 Серьёзный настрой — мозг скажет спасибо'
    : '🚀 Режим полиглота — осторожно, затягивает'

  const changeGoal = useCallback((delta: number) => {
    setGoal((prev) => {
      const next = Math.min(50, Math.max(5, prev + delta))
      if (user && token && activeProfileId && next !== prev) {
        updateLearningProfile(user.id, token, activeProfileId, { daily_goal: next }).catch(() => undefined)
      }
      return next
    })
  }, [user, token, activeProfileId])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }} className="w-full flex flex-col gap-5">
      {/* hero — personal + edit */}
      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#171717] p-0">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#5AD4B5]/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '18px 18px' }} />
        <div className="relative p-6 sm:p-7">
          <div className="flex justify-between items-start gap-4">
            <div className="flex gap-4 flex-1 min-w-0">
              <div className="relative shrink-0 group/avatar">
                <div className="w-[84px] h-[84px] rounded-[20px] bg-gradient-to-br from-[#5AD4B5] to-[#5B74FF] p-[2px] shadow-[0_12px_32px_rgba(91,116,255,0.22)]">
                  <div className="w-full h-full rounded-[18px] bg-[#0f0f0f] grid place-items-center text-[28px] overflow-hidden">
                    {headerLoading ? <span className="w-full h-full animate-pulse bg-white/[0.07]" aria-hidden /> : isEditing && draft.avatar ? <img src={draft.avatar} alt="avatar" className="w-full h-full object-cover" /> : !isEditing && profile.avatar ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" /> : draft.name[0] || '?'}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#5AD4B5] text-black grid place-items-center text-[11px] font-black border-2 border-[#171717]">{headerLoading ? '–' : profile.level}</span>
                {isEditing && (
                  <button onClick={() => fileRef.current?.click()} className="absolute inset-0 rounded-[20px] bg-black/60 backdrop-blur grid place-items-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                    <span className="px-2.5 py-1 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1"><FontAwesomeIcon icon={faCamera} /> Загрузить</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatarChange} />
              </div>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Имя" className="w-full max-w-[220px] px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-bold placeholder:text-white/30 focus:outline-none focus:border-white/15" />
                      <div className="flex items-center gap-1 p-1 rounded-full bg-black/20 border border-white/[0.06]" role="radiogroup" aria-label="Пол">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={draft.gender === 'female'}
                          title="Женский"
                          onClick={() => setDraft({ ...draft, gender: draft.gender === 'female' ? '' : 'female' })}
                          className={`w-7 h-7 rounded-full grid place-items-center text-[13px] border transition-all ${draft.gender === 'female' ? 'bg-[#f43f5e]/15 border-[#f43f5e]/40 text-[#f43f5e]' : 'bg-transparent border-transparent text-white/35 hover:text-white'}`}
                        >
                          <FontAwesomeIcon icon={faVenus} />
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={draft.gender === 'male'}
                          title="Мужской"
                          onClick={() => setDraft({ ...draft, gender: draft.gender === 'male' ? '' : 'male' })}
                          className={`w-7 h-7 rounded-full grid place-items-center text-[13px] border transition-all ${draft.gender === 'male' ? 'bg-[#5B74FF]/15 border-[#5B74FF]/40 text-[#5B74FF]' : 'bg-transparent border-transparent text-white/35 hover:text-white'}`}
                        >
                          <FontAwesomeIcon icon={faMars} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <BirthDatePicker value={draft.birthDate} onChange={handleBirthDateChange} />
                      <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Город" className="px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs focus:outline-none w-[120px]" />
                    </div>
                    {birthDateError && (
                      <div className="text-[11px] font-bold text-[#f43f5e]">{birthDateError}</div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {headerLoading ? (
                        <span className="inline-block h-8 w-44 max-w-full rounded-xl bg-white/[0.07] animate-pulse" aria-hidden />
                      ) : (
                        <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-none">{profile.name || 'Без имени'}</h1>
                      )}
                      {profile.gender === 'female' && (
                        <span title="Женский" className="w-7 h-7 rounded-full grid place-items-center border bg-[#f43f5e]/10 border-[#f43f5e]/30 text-[#f43f5e] text-sm"><FontAwesomeIcon icon={faVenus} /></span>
                      )}
                      {profile.gender === 'male' && (
                        <span title="Мужской" className="w-7 h-7 rounded-full grid place-items-center border bg-[#5B74FF]/10 border-[#5B74FF]/30 text-[#5B74FF] text-sm"><FontAwesomeIcon icon={faMars} /></span>
                      )}
                      <span className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black">PRO</span>
                      {remote === 'loading' && (
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-[11px] font-bold animate-pulse">Загрузка…</span>
                      )}
                {headerLoading ? (
                  <span className="inline-block h-6 w-36 max-w-full rounded-full bg-white/[0.06] animate-pulse" aria-hidden />
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 text-xs font-medium">
                    <FontAwesomeIcon icon={faLocationDot} className="opacity-60" /> {(isEditing ? draft.city : profile.city) || 'Город не указан'}{age !== null ? ` • ${age} лет` : ''}
                  </span>
                )}
              </div>
              {headerLoading ? (
                <div className="flex flex-wrap gap-1.5 mt-3" aria-hidden>
                  <span className="h-6 w-20 rounded-full bg-white/[0.06] animate-pulse" />
                  <span className="h-6 w-16 rounded-full bg-white/[0.06] animate-pulse" />
                  <span className="h-6 w-24 rounded-full bg-white/[0.06] animate-pulse" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(isEditing ? draft.tags : profile.tags).map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/70 text-xs font-semibold">{t}</span>
                  ))}
                  {(isEditing ? draft.tags : profile.tags).length === 0 && (
                    <span className="px-2.5 py-1 rounded-full border border-dashed border-white/[0.12] text-white/35 text-xs font-semibold">Нет тегов — добавь через «Редактировать»</span>
                  )}
                </div>
              )}
            </>
          )}
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
              <button onClick={isEditing ? saveEdit : startEdit} disabled={saving || headerLoading} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${isEditing ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-white text-black border-white'} ${saving || headerLoading ? 'opacity-60' : ''}`}>
                <FontAwesomeIcon icon={isEditing ? faCheck : faPen} /> {isEditing ? (saving ? 'Сохраняем…' : 'Сохранить') : 'Редактировать'}
              </button>
              {saveError && <span className="text-[11px] font-bold text-[#f43f5e]">{saveError}</span>}
            </div>
          </div>
          {isEditing && (
            <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-xs font-bold opacity-60 mb-2">Теги — выбери из списка или добавь свой (до 6)</div>
              <div className="flex flex-wrap gap-1.5">
                {tagOptions.map((tag) => {
                  const active = draft.tags.includes(tag)
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)} className={`px-2.5 py-1 rounded-full text-xs font-bold border ${active ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:bg-white/[0.08]'}`}>
                      {tag} {active ? '×' : '+'}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-2.5">
                <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())} placeholder="Свой тег..." maxLength={20} className="flex-1 px-3 py-1.5 rounded-full bg-black/20 border border-white/[0.06] text-xs placeholder:text-white/30 focus:outline-none" />
                <button onClick={addCustomTag} className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-black">Добавить</button>
              </div>
            </div>
          )}
          {isEditing && (
            <>
              <div className="mt-3 flex sm:hidden gap-2">
                <button onClick={cancelEdit} className="flex-1 py-2 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-bold">Отмена</button>
                <button onClick={saveEdit} disabled={saving} className="flex-1 py-2 rounded-full bg-[#5AD4B5] text-black text-xs font-black disabled:opacity-60">{saving ? 'Сохраняем…' : 'Сохранить'}</button>
              </div>
              {saveError && <div className="sm:hidden text-[11px] font-bold text-[#f43f5e] mt-2">{saveError}</div>}
            </>
          )}

        </div>
      </div>

      {/* язык — вынесен из hero */}
      <div className="settings-group !mb-0">
        <h3><FontAwesomeIcon icon={faLanguage} className="mr-2 opacity-60" /> Язык обучения</h3>
        <p className="text-xs opacity-40 -mt-2 mb-2">Выбери язык — изменится контент</p>
        {headerLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] animate-pulse">
                <div className="h-4 w-2/3 rounded-lg bg-white/[0.07]" />
                <div className="h-3 w-1/2 rounded-lg bg-white/[0.06] mt-2" />
              </div>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {langOptions.map((l) => {
            const active = (isEditing ? draft.language : profile.language) === l.id
            const langProfile = learningProfiles.find((p) => p.target_language_id === langIdByCode[l.id])
            const stat = langProfile ? profileStats[langProfile.id] : undefined
            return (
              <button key={l.id} onClick={() => isEditing && setDraft({ ...draft, language: l.id })} disabled={!isEditing} className={`p-3 rounded-xl border text-left transition-all ${active ? 'bg-[#5AD4B5]/10 border-[#5AD4B5]/30 text-[#5AD4B5]' : 'bg-white/[0.03] border-white/[0.06] opacity-60 hover:opacity-100 hover:bg-white/[0.06]'} ${!isEditing ? 'cursor-default' : ''}`}>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="text-sm font-black truncate">{l.label}</div>
                  {langProfile ? (
                    <span className="px-1.5 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.1] text-[10px] font-black shrink-0">
                      {langProfile.level}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-md border border-dashed border-white/[0.15] text-[10px] font-bold opacity-50 shrink-0">
                      0
                    </span>
                  )}
                </div>
                <div className="text-xs opacity-60">{l.sub}</div>
                {langProfile && stat && (stat.words_learned > 0 || stat.xp > 0 || stat.streak_days > 0) ? (
                  <div className="text-[11px] mt-1.5 tabular-nums opacity-80 font-semibold">
                    📚 {stat.words_learned} • 🔥 {stat.streak_days} • ⚡ {stat.xp}
                  </div>
                ) : langProfile ? (
                  <div className="text-[11px] mt-1.5 opacity-50">Уровень {langProfile.level} • только старт</div>
                ) : (
                  <div className="text-[11px] mt-1.5 opacity-40 italic">
                    {isEditing ? 'Выбери и сохрани, чтобы начать' : 'Не начат'}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        )}
        {!isEditing && <div className="text-xs opacity-40 mt-2">Текущий: Русский → {headerLoading ? '…' : langOptions.find((l) => l.id === profile.language)?.label}</div>}
        {isEditing && <div className="text-xs opacity-40 mt-2">Нажми на язык, чтобы выбрать (до сохранения)</div>}
      </div>

      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBullseye} className="text-[#5B74FF]" /> Цели на месяц</h3>
          <span className="text-[11px] opacity-40 font-bold">май • 2026</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {goalsLoading ? (
            [0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3.5 animate-pulse" aria-hidden>
                <div className="h-4 w-3/4 rounded-lg bg-white/[0.07]" />
                <div className="h-3 w-1/2 rounded-lg bg-white/[0.06] mt-2" />
                <div className="h-1.5 rounded-full bg-white/[0.06] mt-2.5" />
              </div>
            ))
          ) : goals.length === 0 ? (
            <div className="text-xs opacity-40 sm:col-span-3 py-2">Целей пока нет — добавь через «Редактировать» выше 👆</div>
          ) : goals.map((g) => (
            <div key={g.id ?? g.title} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3.5 relative">
              {isEditing && (
                <button onClick={() => removeGoal(g)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#f43f5e] text-white grid place-items-center text-[10px] border border-[#171717]">×</button>
              )}
              <div className="flex items-center justify-between">
                {isEditing ? <input value={g.title} onChange={(e) => setGoals((prev) => prev.map((x) => (goalKey(x) === goalKey(g) ? { ...x, title: e.target.value } : x)))} onBlur={(e) => patchGoal(g, { title: e.target.value })} className="text-[13px] font-bold bg-transparent border-b border-white/10 focus:outline-none focus:border-white/20 w-full" /> : <span className="text-[13px] font-bold">{g.title}</span>}
                <span className="text-xs font-black ml-2" style={{ color: g.color }}>{g.progress}%</span>
              </div>
              {isEditing ? <input value={g.desc} onChange={(e) => setGoals((prev) => prev.map((x) => (goalKey(x) === goalKey(g) ? { ...x, desc: e.target.value } : x)))} onBlur={(e) => patchGoal(g, { desc: e.target.value })} className="text-xs opacity-50 bg-transparent border-b border-white/10 w-full mt-1 focus:outline-none" /> : <div className="text-xs opacity-50">{g.desc}</div>}
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-2.5">
                <motion.div initial={false} animate={{ width: `${g.progress}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: g.color }} />
              </div>
              {isEditing && (
                <div className="flex items-center gap-1.5 mt-2">
                  <button onClick={() => patchGoal(g, { progress: Math.max(0, g.progress - 10) })} className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center text-[11px] hover:bg-white/10">−</button>
                  <button onClick={() => patchGoal(g, { progress: Math.min(100, g.progress + 10) })} className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center text-[11px] hover:bg-white/10">+</button>
                  <span className="text-[10px] opacity-40 ml-1">прогресс ±10</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {isEditing && (
          <div className="mt-4">
            <div className="text-xs font-bold opacity-60 mb-2">Готовые цели — выбери до 3</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { title: 'Читать 5 текстов', desc: '5 текстов • 20 мин', color: '#a78bfa' },
                { title: 'Выучить 30 слов', desc: '7 дней • 30 слов', color: '#5AD4B5' },
                { title: 'Пройти тест A2', desc: 'Грамматика • 15 мин', color: '#5B74FF' },
                { title: 'Диалог без пауз', desc: 'Разговор • 10 мин', color: '#F08AB4' },
                { title: 'Спринт 5 дней', desc: 'Серия • 5 дней', color: '#ff9d5c' },
              ].filter(g => !goals.some(x => x.title === g.title)).map((g) => (
                <button
                  key={g.title}
                  onClick={() => addGoal(g)}
                  disabled={goals.length >= 3}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-bold border ${goals.length >= 3 ? 'opacity-30 cursor-not-allowed bg-white/[0.04] border-white/[0.06]' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/[0.10]'}`}
                >
                  + {g.title}
                </button>
              ))}
            </div>
            {goals.length >= 3 && <div className="text-[11px] opacity-40 mt-2">Максимум 3 цели — удали одну, чтобы добавить</div>}
          </div>
        )}
      </div>

      {/* обучение — дневная цель и настроение темпа */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faGraduationCap} className="text-[#5AD4B5]" /> Обучение</h3>
          <span className="text-[11px] opacity-40 font-bold">твой темп</span>
        </div>
        <div className="mt-4 settings-row !mx-0">
          <span className="flex flex-col gap-1"><span className="text-[13px] font-bold">Дневная цель</span><span className="text-xs opacity-40">{goal} слов • ~{Math.round(goal * 1.5)} мин</span></span>
          <span className="flex items-center gap-2">
            <button onClick={() => changeGoal(-5)} className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center hover:bg-white/10 text-sm">−</button>
            <span className="min-w-[36px] text-center text-[13px] font-black tabular-nums">{goal}</span>
            <button onClick={() => changeGoal(5)} className="w-7 h-7 rounded-full bg-white text-black grid place-items-center hover:bg-white/90 text-sm font-black">+</button>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-3">
          <div className="h-full bg-[#5AD4B5] rounded-full transition-all" style={{ width: `${(goal / 50) * 100}%` }} />
        </div>
        <motion.div
          key={goalMood}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-xs opacity-60 mt-2.5 font-semibold"
        >
          {goalMood}
        </motion.div>
        <div className="mt-2 settings-row !mx-0">
          <span className="text-[13px]">Напоминания</span><span className="text-xs opacity-40 font-bold">{scheduleSummary}</span>
        </div>
      </div>

      {/* уведомления — расписание по дням недели, до 3 на день */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBell} className="text-[#F5C16A]" /> Уведомления</h3>
          <span className="text-[11px] opacity-40 font-bold">
            {scheduleStats.total === 0 ? 'выключены' : `${scheduleStats.total} в неделю`}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={() => applyPreset('everyday')} className="px-2.5 py-1.5 rounded-full text-xs font-bold border bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]">Каждый день 09:00</button>
          <button onClick={() => applyPreset('weekdays')} className="px-2.5 py-1.5 rounded-full text-xs font-bold border bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]">Будни 09:00</button>
          <button onClick={() => applyPreset('clear')} className="px-2.5 py-1.5 rounded-full text-xs font-bold border bg-transparent border-white/[0.06] text-white/50 hover:text-white">Очистить</button>
        </div>
        <div className="mt-3 grid gap-1.5">
          {WEEKDAYS.map((d) => {
            const times = schedule[d.id]
            const active = times.length > 0
            return (
              <div key={d.id} className={`rounded-xl border px-3 py-2 transition-colors ${active ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-transparent border-white/[0.04] opacity-60'}`}>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-label={d.full}
                    onClick={() => toggleDay(d.id)}
                    className={`settings-switch ${active ? 'settings-switch--on' : ''}`}
                  >
                    <span className="settings-switch__thumb" />
                  </button>
                  <span className="text-[13px] font-bold w-7">{d.label}</span>
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {times.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5C16A]/10 border border-[#F5C16A]/25 text-[#F5C16A] text-xs font-bold tabular-nums">
                        {t}
                        <button onClick={() => removeTime(d.id, t)} className="hover:text-white leading-none" aria-label={`Убрать ${t}`}>×</button>
                      </span>
                    ))}
                    {active && times.length < 3 && (
                      <span className="inline-flex items-center gap-1">
                        <input
                          type="time"
                          value={timeDraft}
                          onChange={(e) => setTimeDraft(e.target.value)}
                          className="px-1.5 py-0.5 rounded-lg bg-black/20 border border-white/[0.08] text-xs text-white/80 focus:outline-none focus:border-white/20 [color-scheme:dark]"
                        />
                        <button onClick={() => addTime(d.id)} className="w-5 h-5 rounded-full bg-white text-black grid place-items-center text-xs font-black" aria-label="Добавить время">+</button>
                      </span>
                    )}
                    {!active && <span className="text-xs opacity-30">выходной 😴</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="text-[11px] opacity-40 mt-2.5">
          {scheduleStats.total === 0
            ? 'Включи хотя бы один день — и мы напомним позаниматься 💌'
            : 'Можно задать разным дням разное время — хоть каждому своё 🎯'}
        </div>
      </div>

      {/* achievements — переделано: много, hover с прогрессом */}
      {achievementsLoading ? (
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5" aria-hidden>
          <div className="h-5 w-40 rounded-lg bg-white/[0.07] animate-pulse" />
          <div className="mt-4 flex gap-3 overflow-hidden">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-none w-[148px] rounded-[20px] border border-white/[0.06] p-3 pt-4 flex flex-col items-center gap-2 animate-pulse">
                <div className="w-[72px] h-[72px] rounded-full bg-white/[0.07]" />
                <div className="h-4 w-24 rounded-lg bg-white/[0.07]" />
                <div className="h-3 w-16 rounded-lg bg-white/[0.06]" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <AchievementsBlock items={achievements ?? achievementsFallback} />
      )}

      {/* friends / community */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faUsers} className="text-[#5B74FF]" /> Друзья учат</h3>
            <span className="text-[11px] opacity-40 font-bold">
              {isAuthed ? (remoteFriends === null ? '…' : `${remoteFriends.length} друга`) : `${friends.length} друга`}
              {incoming.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#F5C16A]/15 border border-[#F5C16A]/25 text-[#F5C16A]">+{incoming.length} заявки</span>}
            </span>
          </div>
          {isAuthed ? (
            <div className="mt-3">
              <div className="relative">
                <input value={friendQuery} onChange={(e) => setFriendQuery(e.target.value)} placeholder="Поиск по имени или email…" className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-sm placeholder:text-white/30 focus:outline-none focus:border-white/15" />
                <FontAwesomeIcon icon={faUsers} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
              </div>
              {searching && <div className="text-xs opacity-40 mt-2">Ищем…</div>}
              {!searching && friendQuery.trim().length >= 2 && searchHits.length > 0 && (
                <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0f0f0f] overflow-hidden">
                  {searchHits.map((u) => (
                    <div key={u.user_id} className="w-full flex items-center gap-2.5 p-2.5">
                      <span className="w-7 h-7 rounded-full bg-white/[0.08] grid place-items-center font-bold text-xs">
                        {(u.name?.[0] || u.email[0] || '?').toUpperCase()}
                      </span>
                      <span className="text-sm font-bold truncate">{u.name || u.email}</span>
                      {u.relation === 'accepted' ? (
                        <span className="ml-auto text-xs font-bold opacity-40">Уже друзья</span>
                      ) : u.relation === 'pending' ? (
                        <span className="ml-auto text-xs font-bold text-[#F5C16A]">Заявка отправлена</span>
                      ) : (
                        <button onClick={() => handleSendRequest(u)} className="ml-auto text-xs font-black text-[#5AD4B5] hover:text-white shrink-0">+ Добавить</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!searching && friendQuery.trim().length >= 2 && searchHits.length === 0 && (
                <div className="text-xs opacity-40 mt-2">Никого не нашли по “{friendQuery.trim()}”</div>
              )}
            </div>
          ) : (
            isEditing && (
              <div className="mt-3">
                <div className="relative">
                  <input value={friendQuery} onChange={(e) => setFriendQuery(e.target.value)} placeholder="Поиск — Анна, Дмитрий..." className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-sm placeholder:text-white/30 focus:outline-none focus:border-white/15" />
                  <FontAwesomeIcon icon={faUsers} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
                </div>
                {friendQuery && mockUsers.length > 0 && (
                  <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0f0f0f] overflow-hidden">
                    {mockUsers.map((u) => (
                      <button key={u.name} onClick={() => { setFriends([...friends, { name: u.name, level: u.level, streak: Math.floor(Math.random() * 10) + 1, avatar: u.avatar }]); setFriendQuery('') }} className="w-full flex items-center gap-2.5 p-2.5 hover:bg-white/[0.04] text-left">
                        <span className="w-7 h-7 rounded-full bg-white/[0.08] grid place-items-center font-bold text-xs">{u.avatar}</span>
                        <span className="text-sm font-bold">{u.name}</span>
                        <span className="text-xs opacity-40">• {u.level}</span>
                        <span className="ml-auto text-xs font-black text-[#5AD4B5]">+ Добавить</span>
                      </button>
                    ))}
                  </div>
                )}
                {friendQuery && mockUsers.length === 0 && <div className="text-xs opacity-40 mt-2">Никого не нашли по “{friendQuery}”</div>}
              </div>
            )
          )}
          {isAuthed && incoming.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#F5C16A]/20 bg-[#F5C16A]/[0.05] p-2.5">
              <div className="text-[11px] font-black uppercase tracking-wide text-[#F5C16A] mb-1.5">Входящие заявки</div>
              <div className="space-y-1.5">
                {incoming.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-white/[0.08] grid place-items-center font-bold text-xs">
                      {(r.name?.[0] || '?').toUpperCase()}
                    </span>
                    <span className="text-sm font-bold flex-1 truncate">{r.name || 'Пользователь'}</span>
                    <button onClick={() => handleAnswer(r.id, true)} className="w-7 h-7 rounded-full bg-[#5AD4B5] text-black grid place-items-center hover:opacity-90" aria-label="Принять">
                      <FontAwesomeIcon icon={faCheck} className="text-[11px]" />
                    </button>
                    <button onClick={() => handleAnswer(r.id, false)} className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 grid place-items-center hover:bg-[#f43f5e]/20 hover:text-[#f43f5e] hover:border-[#f43f5e]/30" aria-label="Отклонить">
                      <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 space-y-2.5">
            {isAuthed ? (
              <>
                {(remoteFriends ?? []).map((f) => (
                  <div key={f.user_id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 group">
                    <span className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.08] grid place-items-center font-bold text-sm">
                      {f.avatar || (f.name?.[0] || '?').toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold leading-none truncate">
                        {f.name || 'Пользователь'}
                        {f.level && <> • <span className="opacity-60 font-semibold">{f.level}</span></>}
                      </div>
                      <div className="text-xs opacity-40">🔥 {f.streak_days} дней</div>
                    </div>
                    <button onClick={() => handleRemoveFriend(f.friendship_id)} className="w-7 h-7 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] grid place-items-center hover:bg-[#f43f5e]/20 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Убрать из друзей">
                      <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                    </button>
                  </div>
                ))}
                {remoteFriends !== null && remoteFriends.length === 0 && (
                  <div className="text-xs opacity-40 text-center py-4">Пока нет друзей — найди их через поиск выше 👆</div>
                )}
                {remoteFriends === null && (
                  <div className="text-xs opacity-40 text-center py-4 animate-pulse">Загружаем друзей…</div>
                )}
              </>
            ) : (
              <>
                {friends.map((f) => (
                  <div key={f.name} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 group">
                    <span className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.08] grid place-items-center font-bold text-sm">{f.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold leading-none">{f.name} • <span className="opacity-60 font-semibold">{f.level}</span></div>
                      <div className="text-xs opacity-40">🔥 {f.streak} дней</div>
                    </div>
                    {isEditing ? (
                      <button onClick={() => setFriends(friends.filter((x) => x.name !== f.name))} className="w-7 h-7 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] grid place-items-center hover:bg-[#f43f5e]/20">
                        <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-bold opacity-60">•</span>
                    )}
                  </div>
                ))}
                {friends.length === 0 && <div className="text-xs opacity-40 text-center py-4">Пока нет друзей — добавь через поиск выше</div>}
              </>
            )}
          </div>
        </div>
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faRocket} className="text-[#5AD4B5]" /> Быстрый старт</h3>
          <p className="text-xs opacity-40 mt-1">что сделать за 5 минут</p>
          <div className="mt-4 grid gap-2.5">
            {[
              { title: 'Повторить 12 слов', sub: 'слабые • 2 мин', icon: faBook, color: '#5AD4B5' },
              { title: '5 новых слов', sub: 'тема Еда • 3 мин', icon: faStar, color: '#5B74FF' },
              { title: 'Диалог 3 мин', sub: 'кафе • голосом', icon: faUsers, color: '#F08AB4' },
            ].map((a) => (
              <button key={a.title} type="button" className="w-full flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 text-left hover:bg-white/[0.06] hover:border-white/[0.08] transition-colors group">
                <span className="w-9 h-9 rounded-xl grid place-items-center border shrink-0 transition-colors" style={{ background: `${a.color}14`, borderColor: `${a.color}22`, color: a.color }}>
                  <FontAwesomeIcon icon={a.icon} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-bold leading-none">{a.title}</span>
                  <span className="block text-xs opacity-50">{a.sub}</span>
                </span>
                <span className="w-6 h-6 rounded-full bg-white text-black grid place-items-center text-[10px] opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
