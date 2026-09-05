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
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Paywall from '@/components/Paywall'
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
  listLeaderboard,
  listLearningProfiles,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  updateGoal,
  updateLearningProfile,
  updateProfile,
  uploadAvatar,
  type FriendRequestRow,
  type LeaderboardRow,
  type RemoteAchievement,
  type RemoteFriend,
  type RemoteGoal,
  type RemoteLearningProfile,
  type RemoteStat,
  type UserSearchHit,
} from '@/lib/profile-api'
import { useT, pickPlural } from '@/lib/i18n'
import { sanitizeAvatarImage } from '@/lib/image-upload'
import { DatePicker, DateField, Calendar } from '@heroui/react'
import { parseDate, getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

type AchievementItem = {
  icon: typeof faFire
  title: string
  desc: string
  condition: string
  total: number
  current: number
  progress: number
  rarity: string
  color: string
  reward: string
}

// Language-neutral fallback definitions (no display strings here):
// titles/descs/conditions/rewards are built inside the component via t().
const ACHIEVEMENT_FALLBACK_DEFS = [
  { key: 'streak3', icon: faFire, total: 3, current: 3, progress: 100, rarity: 'common', color: '#ff9d5c', rewardXp: 50 },
  { key: 'words50', icon: faDumbbell, total: 50, current: 50, progress: 100, rarity: 'common', color: '#5AD4B5', rewardXp: 100 },
  { key: 'first_lesson', icon: faBullseye, total: 1, current: 1, progress: 100, rarity: 'common', color: '#5B74FF', rewardXp: 25 },
  { key: 'goal5', icon: faStar, total: 5, current: 3, progress: 60, rarity: 'rare', color: '#F5C16A', rewardXp: 150 },
  { key: 'words100', icon: faTrophy, total: 100, current: 42, progress: 42, rarity: 'rare', color: '#F08AB4', rewardXp: 200 },
  { key: 'polyglot', icon: faCrown, total: 500, current: 142, progress: 28, rarity: 'epic', color: '#a78bfa', rewardXp: 1000 },
  { key: 'reader', icon: faBook, total: 10, current: 4, progress: 40, rarity: 'common', color: '#5AD4B5', rewardXp: 80 },
  { key: 'chatter', icon: faComments, total: 50, current: 18, progress: 36, rarity: 'rare', color: '#5B74FF', rewardXp: 120 },
  { key: 'sprint7', icon: faBolt, total: 7, current: 7, progress: 100, rarity: 'rare', color: '#ff9d5c', rewardXp: 200 },
  { key: 'excel', icon: faMedal, total: 20, current: 12, progress: 60, rarity: 'epic', color: '#F5C16A', rewardXp: 300 },
  { key: 'exam', icon: faGraduationCap, total: 1, current: 0, progress: 0, rarity: 'legendary', color: '#f43f5e', rewardXp: 500 },
  { key: 'fav', icon: faHeart, total: 5, current: 1, progress: 20, rarity: 'common', color: '#F08AB4', rewardXp: 70 },
] as const

const AchievementsBlock = memo(function AchievementsBlock({ items }: { items: AchievementItem[] }) {
  const t = useT()
  const [filter, setFilter] = useState<'all' | 'done' | 'progress'>('all')
  const [hovered, setHovered] = useState<AchievementItem | null>(null)
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

  const onEnter = useCallback((a: AchievementItem, e: React.MouseEvent) => {
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
          {t('profile.achievements.title')}
          <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] font-bold opacity-60">{doneCount}/{items.length}</span>
        </h3>
        <div className="flex items-center gap-1 p-1 rounded-full bg-black/20 border border-white/[0.04]">
          {[
            { k: 'all', label: t('profile.achievements.filter_all') },
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
                <span className="mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ background: `${a.color}12`, borderColor: `${a.color}20`, color: a.color }}>{a.total - a.current === 0 ? t('profile.achievements.done') : t('profile.achievements.left', { n: a.total - a.current })}</span>
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
                <div className="text-[11px] font-bold text-white/80">{t('profile.achievements.reason')}</div>
                <div className="text-[13px] leading-snug mt-1 text-white/90">{hovered.condition}</div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-[11px] font-bold text-white/50">{t('profile.achievements.progress')}</span>
                  <span className="text-xs font-black" style={{ color: hovered.color }}>{hovered.current}/{hovered.total} • {hovered.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden mt-1.5">
                  <div className="h-full rounded-full" style={{ width: `${hovered.progress}%`, background: hovered.color }} />
                </div>
                <div className="text-[12px] mt-2 font-bold" style={{ color: hovered.progress === 100 ? hovered.color : 'rgba(255,255,255,0.9)' }}>
                  {hovered.progress === 100 ? t('profile.achievements.tooltip_done', { reward: hovered.reward }) : t('profile.achievements.tooltip_progress', { left: hovered.total - hovered.current, pct: 100 - hovered.progress, reward: hovered.reward })}
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
  const t = useT()
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
        <Calendar aria-label={t('profile.header.birth_aria')} className="bg-transparent text-white">
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

// Day ids only — short/full labels come from the i18n dict at render time.
const WEEKDAYS = [
  { id: 'mon' },
  { id: 'tue' },
  { id: 'wed' },
  { id: 'thu' },
  { id: 'fri' },
  { id: 'sat' },
  { id: 'sun' },
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
  const t = useT()
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState({
    name: t('profile.mocks.default_name'),
    birthDate: '2002-05-15',
    city: t('profile.mocks.default_city'),
    language: 'en',
    tags: [t('profile.tags.travel'), t('profile.tags.work'), t('profile.tags.cinema'), t('profile.tags.coffee')],
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
  // Sanitized avatar blob waiting for upload on save (preview is a blob: URL).
  const pendingAvatar = useRef<{ blob: Blob; preview: string } | null>(null)
  const { user, token, ready: authReady } = useAuth()
  const tagOptions = [t('profile.tags.travel'), t('profile.tags.work'), t('profile.tags.cinema'), t('profile.tags.coffee'), t('profile.tags.food'), t('profile.tags.emotions'), t('profile.tags.music'), t('profile.tags.sport'), t('profile.tags.books'), t('profile.tags.tech')]
  const langOptions = [
    { id: 'en', label: 'English', sub: t('profile.languages.en') },
    { id: 'es', label: 'Español', sub: t('profile.languages.es') },
    { id: 'de', label: 'Deutsch', sub: t('profile.languages.de') },
    { id: 'fr', label: 'Français', sub: t('profile.languages.fr') },
  ]
  const [goals, setGoals] = useState<(RemoteGoal & { desc: string; color: string })[]>([
    { id: 'mock-1', profile_id: '', title: t('profile.mocks.goal_cafe_title'), desc: t('profile.mocks.goal_cafe_desc'), progress: 68, color: '#5AD4B5', sort: 0 },
    { id: 'mock-2', profile_id: '', title: t('profile.mocks.goal_travel_title'), desc: t('profile.mocks.goal_travel_desc'), progress: 42, color: '#5B74FF', sort: 1 },
    { id: 'mock-3', profile_id: '', title: t('profile.mocks.goal_streak_title'), desc: t('profile.mocks.goal_streak_desc'), progress: 50, color: '#F5C16A', sort: 2 },
  ])
  const [achievements, setAchievements] = useState<AchievementItem[] | null>(null)
  // Guest fallback achievements, translated at render (no t() at module scope).
  const fallbackAchievements: AchievementItem[] = useMemo(() => ACHIEVEMENT_FALLBACK_DEFS.map((d) => ({
    icon: d.icon,
    title: t(`profile.achievements.items.${d.key}.title`),
    desc: t(`profile.achievements.items.${d.key}.desc`),
    condition: t(`profile.achievements.items.${d.key}.condition`),
    total: d.total,
    current: d.current,
    progress: d.progress,
    rarity: d.rarity,
    color: d.color,
    reward: t('profile.achievements.reward', { n: d.rewardXp }),
  })), [t])
  const [friends, setFriends] = useState([
    { name: t('profile.mocks.friend_marina'), level: 'B1', streak: 12, avatar: t('profile.mocks.friend_marina_avatar') },
    { name: t('profile.mocks.friend_igor'), level: 'A2', streak: 7, avatar: t('profile.mocks.friend_igor_avatar') },
    { name: t('profile.mocks.friend_sofia'), level: 'A1', streak: 3, avatar: t('profile.mocks.friend_sofia_avatar') },
  ])
  const [friendQuery, setFriendQuery] = useState('')
  const [remoteFriends, setRemoteFriends] = useState<RemoteFriend[] | null>(null)
  const [incoming, setIncoming] = useState<FriendRequestRow[]>([])
  const [searchHits, setSearchHits] = useState<UserSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [friendsTab, setFriendsTab] = useState<'friends' | 'leaderboard'>('friends')
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [addPaywallVisible, setAddPaywallVisible] = useState(false)

  const isAuthed = Boolean(user && token)
  const isPremium = Boolean(user?.is_premium)
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
      // Client-side premium gate: adding friends is premium-only.
      // Reading list/requests stays free; no failed-request UX.
      if (!user.is_premium) {
        setAddPaywallVisible(true)
        return
      }
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

  // Leaderboard (premium-only for authed users; guests see the paywall).
  useEffect(() => {
    if (friendsTab !== 'leaderboard') return
    if (!user || !token || !user.is_premium) {
      setLeaderboard(null)
      setLeaderboardLoading(false)
      return
    }
    let cancelled = false
    setLeaderboardLoading(true)
    listLeaderboard(user.id, token)
      .then((rows) => {
        if (!cancelled) setLeaderboard(rows)
      })
      .catch(() => {
        if (!cancelled) setLeaderboard([])
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [friendsTab, user, token])
  const mockUsers = useMemo(
    () => {
      const lowerQuery = friendQuery.toLowerCase()
      return [
        { name: t('profile.mocks.user_anna'), level: 'B1', avatar: t('profile.mocks.user_anna_avatar') },
        { name: t('profile.mocks.user_dmitry'), level: 'A2', avatar: t('profile.mocks.user_dmitry_avatar') },
        { name: t('profile.mocks.user_elena'), level: 'B2', avatar: t('profile.mocks.user_elena_avatar') },
        { name: t('profile.mocks.user_pavel'), level: 'A1', avatar: t('profile.mocks.user_pavel_avatar') },
      ].filter((u) => u.name.toLowerCase().includes(lowerQuery) && !friends.some((f) => f.name === u.name))
    },
    [friendQuery, friends, t],
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.birthDate)) return t('profile.birth.invalid')
    const d = new Date(`${draft.birthDate}T00:00:00`)
    if (Number.isNaN(d.getTime())) return t('profile.birth.invalid')
    if (d.getTime() > Date.now()) return t('profile.birth.future')
    if (d.getFullYear() < 1900) return t('profile.birth.too_early')
    return null
  }, [isEditing, draft.birthDate, t])

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
    setSaveError(null)
    if (!user || !token) {
      setProfile(snapshot)
      setIsEditing(false)
      return
    }
    setSaving(true)
    // Upload a freshly picked avatar first; the file was already
    // validated + re-encoded on pick, the server verifies it again.
    const pending = pendingAvatar.current
    const avatarPromise: Promise<string | null> = pending
      ? uploadAvatar(user.id, token, pending.blob).then(
          (r) => {
            URL.revokeObjectURL(pending.preview)
            pendingAvatar.current = null
            return r.avatar_url as string | null
          },
          (e) => {
            setSaveError(e instanceof Error ? e.message : t('profile.errors.avatar_failed'))
            return profile.avatar
          },
        )
      : Promise.resolve(
          snapshot.avatar && snapshot.avatar.startsWith('blob:') ? profile.avatar : (snapshot.avatar ?? null),
        )
    avatarPromise.then((avatar) => {
      const finalSnapshot = { ...snapshot, avatar }
      setProfile(finalSnapshot)
      setIsEditing(false)
      const payload: { name?: string | null; city?: string | null; birth_date?: string | null; tags?: string[]; avatar?: string | null; gender?: string | null } = {
        name: finalSnapshot.name.trim() || null,
        city: finalSnapshot.city.trim() || null,
        birth_date: finalSnapshot.birthDate || null,
        tags: finalSnapshot.tags,
        gender: finalSnapshot.gender === 'male' || finalSnapshot.gender === 'female' ? finalSnapshot.gender : null,
      }
      // Legacy data-URL avatars that no longer fit the server cap stay untouched.
      if (!(avatar && avatar.startsWith('data:') && avatar.length > 1800)) payload.avatar = avatar
      return updateProfile(user.id, token, payload)
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
      .catch(() => setSaveError(t('profile.errors.save_failed')))
      .finally(() => setSaving(false))
    })
  }, [draft, user, token, learningProfiles, langIdByCode, birthDateError, profile.avatar, t])
  const onAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setSaveError(null)
    sanitizeAvatarImage(f).then(
      (ok) => {
        if (pendingAvatar.current) URL.revokeObjectURL(pendingAvatar.current.preview)
        pendingAvatar.current = { blob: ok.blob, preview: ok.previewUrl }
        setDraft((p) => ({ ...p, avatar: ok.previewUrl }))
      },
      (err) => setSaveError(err instanceof Error ? err.message : t('profile.errors.file_rejected')),
    )
  }, [t])
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
    if (scheduleStats.days === 0) return t('profile.schedule.off')
    const first = WEEKDAYS.map((d) => schedule[d.id][0]).find(Boolean) ?? ''
    const dayWord = pickPlural(scheduleStats.days, {
      one: t('profile.schedule.day.one'),
      few: t('profile.schedule.day.few'),
      many: t('profile.schedule.day.many'),
    })
    return t('profile.schedule.summary', {
      days: scheduleStats.days,
      dayWord,
      total: scheduleStats.total,
      from: first ? t('profile.schedule.summary_from', { time: first }) : '',
    })
  }, [schedule, scheduleStats, WEEKDAYS, t])

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
    words_200: faBook,
    reviews_100: faDumbbell,
    accuracy_90: faMedal,
    own_words_30: faPen,
    goals_5: faBullseye,
    streak_14: faFire,
    reviews_500: faBolt,
    goals_20: faStar,
    xp_5000: faCrown,
    accuracy_98: faMedal,
    words_1000: faCrown,
    streak_30: faFire,
    reviews_2000: faBolt,
    xp_20000: faTrophy,
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

  const goalMood = goal <= 10 ? t('profile.study.mood_calm')
    : goal <= 20 ? t('profile.study.mood_confident')
    : goal <= 30 ? t('profile.study.mood_serious')
    : t('profile.study.mood_polyglot')

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
                    <span className="px-2.5 py-1 rounded-full bg-white text-black text-xs font-bold flex items-center gap-1"><FontAwesomeIcon icon={faCamera} /> {t('profile.header.upload')}</span>
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onAvatarChange} />
              </div>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={t('profile.header.name_placeholder')} className="w-full max-w-[220px] px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-bold placeholder:text-white/30 focus:outline-none focus:border-white/15" />
                      <div className="flex items-center gap-1 p-1 rounded-full bg-black/20 border border-white/[0.06]" role="radiogroup" aria-label={t('profile.header.gender')}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={draft.gender === 'female'}
                          title={t('profile.header.female')}
                          onClick={() => setDraft({ ...draft, gender: draft.gender === 'female' ? '' : 'female' })}
                          className={`w-7 h-7 rounded-full grid place-items-center text-[13px] border transition-all ${draft.gender === 'female' ? 'bg-[#f43f5e]/15 border-[#f43f5e]/40 text-[#f43f5e]' : 'bg-transparent border-transparent text-white/35 hover:text-white'}`}
                        >
                          <FontAwesomeIcon icon={faVenus} />
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={draft.gender === 'male'}
                          title={t('profile.header.male')}
                          onClick={() => setDraft({ ...draft, gender: draft.gender === 'male' ? '' : 'male' })}
                          className={`w-7 h-7 rounded-full grid place-items-center text-[13px] border transition-all ${draft.gender === 'male' ? 'bg-[#5B74FF]/15 border-[#5B74FF]/40 text-[#5B74FF]' : 'bg-transparent border-transparent text-white/35 hover:text-white'}`}
                        >
                          <FontAwesomeIcon icon={faMars} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <BirthDatePicker value={draft.birthDate} onChange={handleBirthDateChange} />
                      <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder={t('profile.header.city_placeholder')} className="px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs focus:outline-none w-[120px]" />
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
                        <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-none">{profile.name || t('profile.header.no_name')}</h1>
                      )}
                      {profile.gender === 'female' && (
                        <span title={t('profile.header.female')} className="w-7 h-7 rounded-full grid place-items-center border bg-[#f43f5e]/10 border-[#f43f5e]/30 text-[#f43f5e] text-sm"><FontAwesomeIcon icon={faVenus} /></span>
                      )}
                      {profile.gender === 'male' && (
                        <span title={t('profile.header.male')} className="w-7 h-7 rounded-full grid place-items-center border bg-[#5B74FF]/10 border-[#5B74FF]/30 text-[#5B74FF] text-sm"><FontAwesomeIcon icon={faMars} /></span>
                      )}
                      {user?.is_premium && (
                        <Link
                          to="/premium"
                          className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black hover:bg-[#F5C16A]"
                        >
                          PRO
                        </Link>
                      )}
                      {remote === 'loading' && (
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-[11px] font-bold animate-pulse">{t('profile.header.loading')}</span>
                      )}
                {headerLoading ? (
                  <span className="inline-block h-6 w-36 max-w-full rounded-full bg-white/[0.06] animate-pulse" aria-hidden />
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 text-xs font-medium">
                    <FontAwesomeIcon icon={faLocationDot} className="opacity-60" /> {(isEditing ? draft.city : profile.city) || t('profile.header.no_city')}{age !== null ? t('profile.header.age', { age }) : ''}
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
                    <span className="px-2.5 py-1 rounded-full border border-dashed border-white/[0.12] text-white/35 text-xs font-semibold">{t('profile.header.no_tags')}</span>
                  )}
                </div>
              )}
            </>
          )}
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
              <button onClick={isEditing ? saveEdit : startEdit} disabled={saving || headerLoading} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${isEditing ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-white text-black border-white'} ${saving || headerLoading ? 'opacity-60' : ''}`}>
                <FontAwesomeIcon icon={isEditing ? faCheck : faPen} /> {isEditing ? (saving ? t('profile.header.saving') : t('profile.header.save')) : t('profile.header.edit')}
              </button>
              {saveError && <span className="text-[11px] font-bold text-[#f43f5e]">{saveError}</span>}
            </div>
          </div>
          {isEditing && (
            <div className="mt-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="text-xs font-bold opacity-60 mb-2">{t('profile.tags.hint')}</div>
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
                <input value={customTag} onChange={(e) => setCustomTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())} placeholder={t('profile.tags.custom_placeholder')} maxLength={20} className="flex-1 px-3 py-1.5 rounded-full bg-black/20 border border-white/[0.06] text-xs placeholder:text-white/30 focus:outline-none" />
                <button onClick={addCustomTag} className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-black">{t('profile.tags.add')}</button>
              </div>
            </div>
          )}
          {isEditing && (
            <>
              <div className="mt-3 flex sm:hidden gap-2">
                <button onClick={cancelEdit} className="flex-1 py-2 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-bold">{t('profile.header.cancel')}</button>
                <button onClick={saveEdit} disabled={saving} className="flex-1 py-2 rounded-full bg-[#5AD4B5] text-black text-xs font-black disabled:opacity-60">{saving ? t('profile.header.saving') : t('profile.header.save')}</button>
              </div>
              {saveError && <div className="sm:hidden text-[11px] font-bold text-[#f43f5e] mt-2">{saveError}</div>}
            </>
          )}

        </div>
      </div>

      {/* language — moved out of hero */}
      <div className="settings-group !mb-0">
        <h3><FontAwesomeIcon icon={faLanguage} className="mr-2 opacity-60" /> {t('profile.languages.title')}</h3>
        <p className="text-xs opacity-40 -mt-2 mb-2">{t('profile.languages.subtitle')}</p>
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
                  <div className="text-[11px] mt-1.5 opacity-50">{t('profile.languages.level_started', { level: langProfile.level })}</div>
                ) : (
                  <div className="text-[11px] mt-1.5 opacity-40 italic">
                    {isEditing ? t('profile.languages.start_editing') : t('profile.languages.not_started')}
                  </div>
                )}
              </button>
            )
          })}
        </div>
        )}
        {!isEditing && <div className="text-xs opacity-40 mt-2">{t('profile.languages.current', { label: headerLoading ? '…' : (langOptions.find((l) => l.id === profile.language)?.label ?? '') })}</div>}
        {isEditing && <div className="text-xs opacity-40 mt-2">{t('profile.languages.pick_hint')}</div>}
      </div>

      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBullseye} className="text-[#5B74FF]" /> {t('profile.goals.title')}</h3>
          <span className="text-[11px] opacity-40 font-bold">{t('profile.goals.month')}</span>
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
            <div className="text-xs opacity-40 sm:col-span-3 py-2">{t('profile.goals.empty')}</div>
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
                  <span className="text-[10px] opacity-40 ml-1">{t('profile.goals.progress_step')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        {isEditing && (
          <div className="mt-4">
            <div className="text-xs font-bold opacity-60 mb-2">{t('profile.goals.presets_hint')}</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { title: t('profile.presets.read_title'), desc: t('profile.presets.read_desc'), color: '#a78bfa' },
                { title: t('profile.presets.words_title'), desc: t('profile.presets.words_desc'), color: '#5AD4B5' },
                { title: t('profile.presets.test_title'), desc: t('profile.presets.test_desc'), color: '#5B74FF' },
                { title: t('profile.presets.dialog_title'), desc: t('profile.presets.dialog_desc'), color: '#F08AB4' },
                { title: t('profile.presets.sprint_title'), desc: t('profile.presets.sprint_desc'), color: '#ff9d5c' },
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
            {goals.length >= 3 && <div className="text-[11px] opacity-40 mt-2">{t('profile.goals.max')}</div>}
          </div>
        )}
      </div>

      {/* learning — daily goal and pace mood */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faGraduationCap} className="text-[#5AD4B5]" /> {t('profile.study.title')}</h3>
          <span className="text-[11px] opacity-40 font-bold">{t('profile.study.pace')}</span>
        </div>
        <div className="mt-4 settings-row !mx-0">
          <span className="flex flex-col gap-1"><span className="text-[13px] font-bold">{t('profile.study.daily_goal')}</span><span className="text-xs opacity-40">{t('profile.study.daily_sub', { goal, mins: Math.round(goal * 1.5) })}</span></span>
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
          <span className="text-[13px]">{t('profile.study.reminders')}</span><span className="text-xs opacity-40 font-bold">{scheduleSummary}</span>
        </div>
      </div>

      {/* notifications — per-weekday schedule, up to 3 per day */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBell} className="text-[#F5C16A]" /> {t('profile.schedule.title')}</h3>
          <span className="text-[11px] opacity-40 font-bold">
            {scheduleStats.total === 0 ? t('profile.schedule.off') : t('profile.schedule.per_week', { total: scheduleStats.total })}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button onClick={() => applyPreset('everyday')} className="px-2.5 py-1.5 rounded-full text-xs font-bold border bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]">{t('profile.schedule.everyday')}</button>
          <button onClick={() => applyPreset('weekdays')} className="px-2.5 py-1.5 rounded-full text-xs font-bold border bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]">{t('profile.schedule.weekdays')}</button>
          <button onClick={() => applyPreset('clear')} className="px-2.5 py-1.5 rounded-full text-xs font-bold border bg-transparent border-white/[0.06] text-white/50 hover:text-white">{t('profile.schedule.clear')}</button>
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
                    aria-label={t(`profile.weekdays.${d.id}_full`)}
                    onClick={() => toggleDay(d.id)}
                    className={`settings-switch ${active ? 'settings-switch--on' : ''}`}
                  >
                    <span className="settings-switch__thumb" />
                  </button>
                  <span className="text-[13px] font-bold w-7">{t(`profile.weekdays.${d.id}`)}</span>
                  <div className="flex flex-wrap items-center gap-1.5 flex-1">
                    {times.map((tm) => (
                      <span key={tm} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5C16A]/10 border border-[#F5C16A]/25 text-[#F5C16A] text-xs font-bold tabular-nums">
                        {tm}
                        <button onClick={() => removeTime(d.id, tm)} className="hover:text-white leading-none" aria-label={t('profile.schedule.remove_time', { time: tm })}>×</button>
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
                        <button onClick={() => addTime(d.id)} className="w-5 h-5 rounded-full bg-white text-black grid place-items-center text-xs font-black" aria-label={t('profile.schedule.add_time')}>+</button>
                      </span>
                    )}
                    {!active && <span className="text-xs opacity-30">{t('profile.schedule.day_off')}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="text-[11px] opacity-40 mt-2.5">
          {scheduleStats.total === 0
            ? t('profile.schedule.hint_empty')
            : t('profile.schedule.hint_custom')}
        </div>
      </div>

      {/* achievements — reworked: many, hover with progress */}
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
        <AchievementsBlock items={achievements ?? fallbackAchievements} />
      )}

      {/* friends / community */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faUsers} className="text-[#5B74FF]" /> {t('profile.friends.title')}</h3>
            <span className="text-[11px] opacity-40 font-bold">
              {isAuthed ? (remoteFriends === null ? '…' : t('profile.friends.count', { n: remoteFriends.length })) : t('profile.friends.count', { n: friends.length })}
              {incoming.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#F5C16A]/15 border border-[#F5C16A]/25 text-[#F5C16A]">{t('profile.friends.requests', { n: incoming.length })}</span>}
            </span>
          </div>
          <div className="mt-3 flex gap-1 p-1 rounded-xl border border-white/[0.06] bg-white/[0.03]">
            <button
              onClick={() => setFriendsTab('friends')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${friendsTab === 'friends' ? 'bg-white/[0.08] text-white border-white/[0.10]' : 'bg-transparent text-white/45 border-transparent hover:text-white'}`}
            >
              {t('premium.friends.tab_friends')}
            </button>
            <button
              onClick={() => setFriendsTab('leaderboard')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-all ${friendsTab === 'leaderboard' ? 'bg-white/[0.08] text-white border-white/[0.10]' : 'bg-transparent text-white/45 border-transparent hover:text-white'}`}
            >
              {t('premium.friends.tab_leaderboard')}
            </button>
          </div>
          {friendsTab === 'leaderboard' ? (
            <div className="mt-3">
              {!isAuthed || !isPremium ? (
                <Paywall compact title={t('premium.leaderboard.title')} text={t('premium.leaderboard.text')} />
              ) : leaderboardLoading ? (
                <div className="text-xs opacity-40 text-center py-4 animate-pulse">{t('premium.leaderboard.loading')}</div>
              ) : !leaderboard || leaderboard.length === 0 ? (
                <div className="text-xs opacity-40 text-center py-4">{t('premium.leaderboard.empty')}</div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((row, idx) => {
                    const medal = idx === 0 ? '#ffd76a' : idx === 1 ? '#b8c4d4' : idx === 2 ? '#d08a5a' : '#6b7280'
                    return (
                      <div
                        key={row.user_id}
                        className={`flex items-center gap-3 rounded-xl border p-3 ${row.is_self ? 'bg-[#5AD4B5]/[0.07] border-[#5AD4B5]/40' : 'bg-white/[0.03] border-white/[0.04]'}`}
                      >
                        <span className="font-mono text-[12px] font-black w-5 text-center shrink-0" style={{ color: medal }}>
                          {idx + 1}
                        </span>
                        <span className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.08] grid place-items-center font-bold text-sm shrink-0 overflow-hidden">
                          {row.avatar || (row.name?.[0] || '?').toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold leading-none truncate">
                            {row.name || t('premium.leaderboard.fallback_name')}
                            {row.level && <> • <span className="opacity-60 font-semibold">{row.level}</span></>}
                            {row.is_self && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[#5AD4B5]/15 border border-[#5AD4B5]/25 text-[#5AD4B5] text-[10px] font-black">
                                {t('premium.leaderboard.you')}
                              </span>
                            )}
                          </div>
                          <div className="text-xs opacity-40 mt-0.5">{t('premium.leaderboard.streak', { n: row.streak_days })}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
          <>
          {isAuthed ? (
            <div className="mt-3">
              <div className="relative">
                <input value={friendQuery} onChange={(e) => setFriendQuery(e.target.value)} placeholder={t('profile.friends.search_placeholder')} className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-sm placeholder:text-white/30 focus:outline-none focus:border-white/15" />
                <FontAwesomeIcon icon={faUsers} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
              </div>
              {searching && <div className="text-xs opacity-40 mt-2">{t('profile.friends.searching')}</div>}
              {!searching && friendQuery.trim().length >= 2 && searchHits.length > 0 && (
                <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0f0f0f] overflow-hidden">
                  {searchHits.map((u) => (
                    <div key={u.user_id} className="w-full flex items-center gap-2.5 p-2.5">
                      <span className="w-7 h-7 rounded-full bg-white/[0.08] grid place-items-center font-bold text-xs">
                        {(u.name?.[0] || u.email[0] || '?').toUpperCase()}
                      </span>
                      <span className="text-sm font-bold truncate">{u.name || u.email}</span>
                      {u.relation === 'accepted' ? (
                        <span className="ml-auto text-xs font-bold opacity-40">{t('profile.friends.already')}</span>
                      ) : u.relation === 'pending' ? (
                        <span className="ml-auto text-xs font-bold text-[#F5C16A]">{t('profile.friends.pending')}</span>
                      ) : (
                        <button onClick={() => handleSendRequest(u)} className="ml-auto text-xs font-black text-[#5AD4B5] hover:text-white shrink-0">{t('profile.friends.add')}</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!searching && friendQuery.trim().length >= 2 && searchHits.length === 0 && (
                <div className="text-xs opacity-40 mt-2">{t('profile.friends.not_found', { q: friendQuery.trim() })}</div>
              )}
              {isAuthed && !isPremium && addPaywallVisible && (
                <div className="mt-2">
                  <Paywall compact title={t('premium.friends.add_locked_title')} text={t('premium.friends.add_locked_text')} />
                </div>
              )}
            </div>
          ) : (
            isEditing && (
              <div className="mt-3">
                <div className="relative">
                  <input value={friendQuery} onChange={(e) => setFriendQuery(e.target.value)} placeholder={t('profile.friends.search_guest_placeholder')} className="w-full pl-8 pr-3 py-2 rounded-xl bg-black/20 border border-white/[0.06] text-sm placeholder:text-white/30 focus:outline-none focus:border-white/15" />
                  <FontAwesomeIcon icon={faUsers} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs" />
                </div>
                {friendQuery && mockUsers.length > 0 && (
                  <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0f0f0f] overflow-hidden">
                    {mockUsers.map((u) => (
                      <button key={u.name} onClick={() => { setFriends([...friends, { name: u.name, level: u.level, streak: Math.floor(Math.random() * 10) + 1, avatar: u.avatar }]); setFriendQuery('') }} className="w-full flex items-center gap-2.5 p-2.5 hover:bg-white/[0.04] text-left">
                        <span className="w-7 h-7 rounded-full bg-white/[0.08] grid place-items-center font-bold text-xs">{u.avatar}</span>
                        <span className="text-sm font-bold">{u.name}</span>
                        <span className="text-xs opacity-40">• {u.level}</span>
                        <span className="ml-auto text-xs font-black text-[#5AD4B5]">{t('profile.friends.add')}</span>
                      </button>
                    ))}
                  </div>
                )}
                {friendQuery && mockUsers.length === 0 && <div className="text-xs opacity-40 mt-2">{t('profile.friends.not_found', { q: friendQuery })}</div>}
              </div>
            )
          )}
          {isAuthed && incoming.length > 0 && (
            <div className="mt-3 rounded-xl border border-[#F5C16A]/20 bg-[#F5C16A]/[0.05] p-2.5">
              <div className="text-[11px] font-black uppercase tracking-wide text-[#F5C16A] mb-1.5">{t('profile.friends.incoming')}</div>
              <div className="space-y-1.5">
                {incoming.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-white/[0.08] grid place-items-center font-bold text-xs">
                      {(r.name?.[0] || '?').toUpperCase()}
                    </span>
                    <span className="text-sm font-bold flex-1 truncate">{r.name || t('profile.friends.fallback_name')}</span>
                    <button onClick={() => handleAnswer(r.id, true)} className="w-7 h-7 rounded-full bg-[#5AD4B5] text-black grid place-items-center hover:opacity-90" aria-label={t('profile.friends.accept')}>
                      <FontAwesomeIcon icon={faCheck} className="text-[11px]" />
                    </button>
                    <button onClick={() => handleAnswer(r.id, false)} className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 grid place-items-center hover:bg-[#f43f5e]/20 hover:text-[#f43f5e] hover:border-[#f43f5e]/30" aria-label={t('profile.friends.reject')}>
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
                        {f.name || t('profile.friends.fallback_name')}
                        {f.level && <> • <span className="opacity-60 font-semibold">{f.level}</span></>}
                      </div>
                      <div className="text-xs opacity-40">{t('profile.friends.streak', { n: f.streak_days })}</div>
                    </div>
                    <button onClick={() => handleRemoveFriend(f.friendship_id)} className="w-7 h-7 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] grid place-items-center hover:bg-[#f43f5e]/20 opacity-0 group-hover:opacity-100 transition-opacity" aria-label={t('profile.friends.remove')}>
                      <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                    </button>
                  </div>
                ))}
                {remoteFriends !== null && remoteFriends.length === 0 && (
                  <div className="text-xs opacity-40 text-center py-4">{t('profile.friends.empty_authed')}</div>
                )}
                {remoteFriends === null && (
                  <div className="text-xs opacity-40 text-center py-4 animate-pulse">{t('profile.friends.loading')}</div>
                )}
              </>
            ) : (
              <>
                {friends.map((f) => (
                  <div key={f.name} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 group">
                    <span className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.08] grid place-items-center font-bold text-sm">{f.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold leading-none">{f.name} • <span className="opacity-60 font-semibold">{f.level}</span></div>
                      <div className="text-xs opacity-40">{t('profile.friends.streak', { n: f.streak })}</div>
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
                {friends.length === 0 && <div className="text-xs opacity-40 text-center py-4">{t('profile.friends.empty_guest')}</div>}
              </>
            )}
          </div>
          </>
          )}
        </div>
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faRocket} className="text-[#5AD4B5]" /> {t('profile.quickstart.title')}</h3>
          <p className="text-xs opacity-40 mt-1">{t('profile.quickstart.subtitle')}</p>
          <div className="mt-4 grid gap-2.5">
            {[
              { title: t('profile.quickstart.review_title'), sub: t('profile.quickstart.review_sub'), icon: faBook, color: '#5AD4B5' },
              { title: t('profile.quickstart.new_title'), sub: t('profile.quickstart.new_sub'), icon: faStar, color: '#5B74FF' },
              { title: t('profile.quickstart.dialog_title'), sub: t('profile.quickstart.dialog_sub'), icon: faUsers, color: '#F08AB4' },
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
