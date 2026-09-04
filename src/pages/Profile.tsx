import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
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
  createLearningProfile,
  getProfile,
  listLanguages,
  listLearningProfiles,
  updateProfile,
} from '@/lib/profile-api'
import { DatePicker, DateField, Calendar } from '@heroui/react'
import { parseDate, getLocalTimeZone, today } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'

const achievements = [
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

const AchievementsBlock = memo(function AchievementsBlock({ items }: { items: typeof achievements }) {
  const [filter, setFilter] = useState<'all' | 'done' | 'progress'>('all')
  const [hovered, setHovered] = useState<(typeof achievements)[number] | null>(null)
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

  const onEnter = useCallback((a: (typeof achievements)[number], e: React.MouseEvent) => {
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
  })
  const [draft, setDraft] = useState(profile)
  const [customTag, setCustomTag] = useState('')
  const [remote, setRemote] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [langIdByCode, setLangIdByCode] = useState<Record<string, string>>({})
  const [hasLearningProfile, setHasLearningProfile] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { user, token, ready: authReady } = useAuth()
  const tagOptions = ['Путешествия', 'Работа', 'Кино', 'Кофе', 'Еда', 'Эмоции', 'Музыка', 'Спорт', 'Книги', 'Технологии']
  const langOptions = [
    { id: 'en', label: 'English', sub: 'Английский' },
    { id: 'es', label: 'Español', sub: 'Испанский' },
    { id: 'de', label: 'Deutsch', sub: 'Немецкий' },
    { id: 'fr', label: 'Français', sub: 'Французский' },
  ]
  const [goals, setGoals] = useState([
    { title: 'Заговорить в кафе', desc: 'Заказать еду без пауз', progress: 68, color: '#5AD4B5' },
    { title: '20 фраз для путешествий', desc: 'Аэропорт, отель, город', progress: 42, color: '#5B74FF' },
    { title: 'Серия 14 дней', desc: 'Не пропускать', progress: 50, color: '#F5C16A' },
  ])
  const [friends, setFriends] = useState([
    { name: 'Марина', level: 'B1', streak: 12, avatar: 'М' },
    { name: 'Игорь', level: 'A2', streak: 7, avatar: 'И' },
    { name: 'София', level: 'A1', streak: 3, avatar: 'С' },
  ])
  const [friendQuery, setFriendQuery] = useState('')
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
    const d = new Date(draft.birthDate || profile.birthDate)
    const diff = Date.now() - d.getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)))
  }, [draft.birthDate, profile.birthDate])

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
        const active = profiles.find((p) => p.is_active) ?? profiles[0] ?? null
        setHasLearningProfile(active !== null)
        const remoteProfile = profileRes.status === 'fulfilled' ? profileRes.value : null
        const sessionName = user.name?.trim() || null
        const applyProfile = <T extends { name: string; birthDate: string; city: string; tags: string[]; avatar: string | null }>(prev: T): T => {
          if (!remoteProfile && !sessionName) return prev
          const next = { ...prev }
          if (remoteProfile?.name) next.name = remoteProfile.name
          else if (sessionName) next.name = sessionName
          if (remoteProfile?.birth_date) next.birthDate = remoteProfile.birth_date.slice(0, 10)
          if (remoteProfile?.city) next.city = remoteProfile.city
          if (Array.isArray(remoteProfile?.tags) && (remoteProfile?.tags?.length ?? 0) > 0) next.tags = remoteProfile.tags as string[]
          if (remoteProfile?.avatar) next.avatar = remoteProfile.avatar
          return next
        }
        setProfile((prev) => {
          const next = applyProfile(prev)
          if (active) {
            const code = Object.keys(idByCode).find((c) => idByCode[c] === active.target_language_id)
            if (code && ['en', 'es', 'de', 'fr'].includes(code)) next.language = code
            if (active.level) next.level = active.level
          }
          return next
        })
        setDraft((prev) => applyProfile(prev))
        setRemote('ready')
      })
    return () => { cancelled = true }
  }, [authReady, user, token])

  const startEdit = useCallback(() => { setDraft(profile); setIsEditing(true); setSaveError(null) }, [profile])
  const cancelEdit = useCallback(() => setIsEditing(false), [])
  const saveEdit = useCallback(() => {
    const snapshot = draft
    setProfile(snapshot)
    setIsEditing(false)
    setSaveError(null)
    if (!user || !token) return
    setSaving(true)
    const payload: { name?: string; city?: string; birth_date?: string; tags?: string[]; avatar?: string | null } = {
      name: snapshot.name,
      city: snapshot.city,
      birth_date: snapshot.birthDate,
      tags: snapshot.tags,
    }
    if (snapshot.avatar && snapshot.avatar.length <= 2000) payload.avatar = snapshot.avatar
    updateProfile(user.id, token, payload)
      .then(() => {
        if (!hasLearningProfile) {
          const targetId = langIdByCode[snapshot.language]
          const nativeId = langIdByCode.ru
          if (targetId && nativeId) {
            return createLearningProfile(user.id, token as string, targetId, nativeId)
              .then(() => setHasLearningProfile(true))
              .catch(() => undefined)
          }
        }
        return undefined
      })
      .catch(() => setSaveError('Не сохранилось на сервер — проверь соединение'))
      .finally(() => setSaving(false))
  }, [draft, user, token, hasLearningProfile, langIdByCode])
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
                    {isEditing && draft.avatar ? <img src={draft.avatar} alt="avatar" className="w-full h-full object-cover" /> : !isEditing && profile.avatar ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" /> : draft.name[0] || 'А'}
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#5AD4B5] text-black grid place-items-center text-[11px] font-black border-2 border-[#171717]">{profile.level}</span>
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
                    <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Имя" className="w-full max-w-[220px] px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-bold placeholder:text-white/30 focus:outline-none focus:border-white/15" />
                    <div className="flex flex-wrap gap-2">
                      <BirthDatePicker value={draft.birthDate} onChange={handleBirthDateChange} />
                      <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Город" className="px-2.5 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs focus:outline-none w-[120px]" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-none">{profile.name}</h1>
                      <span className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black">PRO</span>
                      {remote === 'loading' && (
                        <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-[11px] font-bold animate-pulse">Загрузка…</span>
                      )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 text-xs font-medium">
                  <FontAwesomeIcon icon={faLocationDot} className="opacity-60" /> {(isEditing ? draft.city : profile.city) || 'Город'} • {age} лет
                </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(isEditing ? draft.tags : profile.tags).map((t) => (
                        <span key={t} className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/70 text-xs font-semibold">{t}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
              <button onClick={isEditing ? saveEdit : startEdit} disabled={saving} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border ${isEditing ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-white text-black border-white'} ${saving ? 'opacity-60' : ''}`}>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {langOptions.map((l) => {
            const active = (isEditing ? draft.language : profile.language) === l.id
            return (
              <button key={l.id} onClick={() => isEditing && setDraft({ ...draft, language: l.id })} disabled={!isEditing} className={`p-3 rounded-xl border text-left transition-all ${active ? 'bg-[#5AD4B5]/10 border-[#5AD4B5]/30 text-[#5AD4B5]' : 'bg-white/[0.03] border-white/[0.06] opacity-60 hover:opacity-100 hover:bg-white/[0.06]'} ${!isEditing ? 'cursor-default' : ''}`}>
                <div className="text-sm font-black">{l.label}</div>
                <div className="text-xs opacity-60">{l.sub}</div>
              </button>
            )
          })}
        </div>
        {!isEditing && <div className="text-xs opacity-40 mt-2">Текущий: Русский → {langOptions.find((l) => l.id === profile.language)?.label}</div>}
        {isEditing && <div className="text-xs opacity-40 mt-2">Нажми на язык, чтобы выбрать (до сохранения)</div>}
      </div>

      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBullseye} className="text-[#5B74FF]" /> Цели на месяц</h3>
          <span className="text-[11px] opacity-40 font-bold">май • 2026</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(isEditing ? goals : goals).map((g) => (
            <div key={g.title} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3.5 relative">
              {isEditing && (
                <button onClick={() => setGoals((prev) => prev.filter((x) => x.title !== g.title))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#f43f5e] text-white grid place-items-center text-[10px] border border-[#171717]">×</button>
              )}
              <div className="flex items-center justify-between">
                {isEditing ? <input value={g.title} onChange={(e) => setGoals((prev) => prev.map((x) => (x.title === g.title ? { ...x, title: e.target.value } : x)))} className="text-[13px] font-bold bg-transparent border-b border-white/10 focus:outline-none focus:border-white/20 w-full" /> : <span className="text-[13px] font-bold">{g.title}</span>}
                <span className="text-xs font-black ml-2" style={{ color: g.color }}>{g.progress}%</span>
              </div>
              {isEditing ? <input value={g.desc} onChange={(e) => setGoals((prev) => prev.map((x) => (x.title === g.title ? { ...x, desc: e.target.value } : x)))} className="text-xs opacity-50 bg-transparent border-b border-white/10 w-full mt-1 focus:outline-none" /> : <div className="text-xs opacity-50">{g.desc}</div>}
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-2.5">
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${g.progress}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: g.color }} />
              </div>
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
                  onClick={() => { if (goals.length < 3) setGoals([...goals, { ...g, progress: 0 }]) }}
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

      {/* achievements — переделано: много, hover с прогрессом */}
      <AchievementsBlock items={achievements} />

      {/* friends / community */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faUsers} className="text-[#5B74FF]" /> Друзья учат</h3>
            <span className="text-[11px] opacity-40 font-bold">{friends.length} друга</span>
          </div>
          {isEditing && (
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
          )}
          <div className="mt-4 space-y-2.5">
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
