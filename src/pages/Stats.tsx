import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'
import {
  getDueCount,
  getStats,
  listLanguages,
  listLearningProfiles,
  type RemoteLearningProfile,
  type RemoteStat,
} from '@/lib/profile-api'
import { AreaChart } from '@/components/charts/area-chart'
import { Area } from '@/components/charts/area'
import { Grid } from '@/components/charts/grid'
import { XAxis } from '@/components/charts/x-axis'
import { ChartTooltip } from '@/components/charts/tooltip'
import { BarChart } from '@/components/charts/bar-chart'
import { Bar } from '@/components/charts/bar'
import { BarXAxis } from '@/components/charts/bar-x-axis'
import { BarYAxis } from '@/components/charts/bar-y-axis'
import { PieChart } from '@/components/charts/pie-chart'
import { PieSlice } from '@/components/charts/pie-slice'
import { PieCenter } from '@/components/charts/pie-center'
import { RingChart } from '@/components/charts/ring-chart'
import { Ring } from '@/components/charts/ring'
import { RingCenter } from '@/components/charts/ring-center'
import { useTheme } from '@/context/ThemeContext'

type Period = 'day' | 'week' | 'month' | 'year' | 'custom'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'День' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'year', label: 'Год' },
]

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

const C_FOCUS = '#5AD4B5'
const C_WORDS = '#5B74FF'
const C_GRAMMAR = '#F08AB4'
const C_PHRASES = '#DB9F3A'

function fmtDur(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} мин`
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`
}

// mock daily data per period
function genDaily(period: Period): { date: Date; minutes: number; words: number }[] {
  const now = new Date()
  let days = 7
  if (period === 'day') days = 1
  else if (period === 'week') days = 7
  else if (period === 'month') days = 30
  else if (period === 'year') days = 365
  const out: { date: Date; minutes: number; words: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    d.setHours(12, 0, 0, 0)
    // deterministic pseudo random based on date
    const seed = d.getDate() * 17 + d.getMonth() * 31 + 7
    const minutes = period === 'day' ? 0 : 5 + (seed % 28) + Math.floor(Math.random() * 8)
    const words = Math.floor(minutes * 0.7) + (seed % 5)
    out.push({ date: d, minutes, words })
  }
  return out
}

function genHourly(): { label: string; minutes: number }[] {
  const buckets = [2, 4, 8, 12, 18, 22, 15, 9, 5, 3, 6, 10, 4] // 09-21
  return buckets.map((v, i) => ({ label: `${String(9 + i).padStart(2, '0')}:00`, minutes: v }))
}

function heatColor(minutes: number, isLight: boolean): string {
  if (minutes === 0) return isLight ? '#f1f4f9' : '#1e1e1e'
  if (minutes < 10) return 'rgba(90,212,181,0.22)'
  if (minutes < 18) return 'rgba(90,212,181,0.38)'
  if (minutes < 26) return 'rgba(90,212,181,0.62)'
  return '#5AD4B5'
}

export default function Stats() {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  const [period, setPeriod] = useState<Period>('week')
  const [hoveredRing, setHoveredRing] = useState<number | null>(null)
  const { user, token, ready: authReady } = useAuth()
  const [statProfiles, setStatProfiles] = useState<RemoteLearningProfile[]>([])
  const [statLangMap, setStatLangMap] = useState<Record<string, string>>({})
  const [statProfileId, setStatProfileId] = useState<string | null>(null)
  const [realStat, setRealStat] = useState<RemoteStat | null>(null)
  const [dueCount, setDueCount] = useState<number | null>(null)

  // Real per-language-profile stats (charts below stay demo until history API lands).
  useEffect(() => {
    if (!authReady || !user || !token) return
    let cancelled = false
    Promise.allSettled([listLanguages(), listLearningProfiles(user.id, token)]).then(
      ([langsRes, profRes]) => {
        if (cancelled) return
        if (langsRes.status === 'fulfilled') {
          const map: Record<string, string> = {}
          langsRes.value.forEach((l) => {
            map[l.id] = l.code.toUpperCase()
          })
          setStatLangMap(map)
        }
        if (profRes.status === 'fulfilled' && profRes.value.length > 0) {
          setStatProfiles(profRes.value)
          const active = profRes.value.find((p) => p.is_active) ?? profRes.value[0]
          setStatProfileId(active.id)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [authReady, user, token])

  useEffect(() => {
    if (!user || !token || !statProfileId) return
    let cancelled = false
    getStats(user.id, token, statProfileId)
      .then((s) => {
        if (!cancelled) setRealStat(s)
      })
      .catch(() => undefined)
    getDueCount(user.id, token, statProfileId)
      .then((n) => {
        if (!cancelled) setDueCount(n)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [user, token, statProfileId])

  const daily = useMemo(() => genDaily(period), [period])
  const hourly = useMemo(() => genHourly(), [period])
  const totalMin = daily.reduce((s, d) => s + d.minutes, 0)
  const avgMin = Math.round(totalMin / Math.max(1, daily.length))
  const bestDay = daily.reduce((m, d) => (d.minutes > m.minutes ? d : m), daily[0])
  const totalWords = daily.reduce((s, d) => s + d.words, 0)
  const avgWords = Math.round(totalWords / Math.max(1, daily.length))

  const goal = 20 // daily goal minutes
  const pct = Math.min(100, Math.round((avgMin / goal) * 100))

  // weekday avg for non-day
  const weekdayAvg = useMemo(() => {
    const sums = new Array(7).fill(0)
    const counts = new Array(7).fill(0)
    for (const d of daily) {
      const wd = (d.date.getDay() + 6) % 7
      sums[wd] += d.minutes
      counts[wd] += 1
    }
    return WEEKDAYS.map((label, i) => ({ label, minutes: Math.round(sums[i] / Math.max(1, counts[i])) }))
  }, [daily])

  // for year - monthly
  const monthly = useMemo(() => {
    if (period !== 'year') return []
    const byM = new Array(12).fill(0).map((_, mi) => {
      const ds = daily.filter((d) => d.date.getMonth() === mi)
      const avg = ds.length ? Math.round(ds.reduce((s, d) => s + d.minutes, 0) / ds.length) : 0
      return { label: MONTHS[mi], minutes: avg }
    })
    return byM.filter((m) => m.minutes > 0)
  }, [daily, period])

  const pieData = useMemo(
    () => [
      { label: 'Еда', value: 48, color: C_FOCUS },
      { label: 'Путешествия', value: 52, color: C_WORDS },
      { label: 'Эмоции', value: 36, color: C_GRAMMAR },
      { label: 'Работа', value: 44, color: C_PHRASES },
    ],
    [],
  )

  const ringData = useMemo(
    () => [
      { label: 'Слова', value: avgWords, maxValue: 20, color: C_FOCUS },
      { label: 'Минуты', value: avgMin, maxValue: goal, color: C_WORDS },
      { label: 'Точность', value: 92, maxValue: 100, color: C_GRAMMAR },
    ],
    [avgWords, avgMin],
  )

  const pills = useMemo(() => {
    if (period === 'day') {
      const todayMin = daily[daily.length - 1]?.minutes ?? 0
      const todayWords = daily[daily.length - 1]?.words ?? 0
      return [
        { label: 'Сегодня', value: `${todayWords} слов`, sub: fmtDur(todayMin), color: C_FOCUS, glow: '90,212,181' },
        { label: 'Цель', value: `${Math.round((todayMin / goal) * 100)}%`, sub: fmtDur(goal), color: C_WORDS, glow: '91,116,255' },
        { label: 'Пик часа', value: '18:00', sub: '12 мин', color: C_GRAMMAR, glow: '240,138,180' },
        { label: 'Серия', value: '7 дней', sub: '🔥 рекорд', color: C_PHRASES, glow: '219,159,58' },
      ]
    }
    const word = period === 'week' ? 'неделю' : period === 'month' ? 'месяц' : 'год'
    return [
      { label: `Слов за ${word}`, value: `${totalWords}`, sub: `${avgWords}/день`, color: C_FOCUS, glow: '90,212,181' },
      { label: 'Минут всего', value: fmtDur(totalMin), sub: `${avgMin}/день`, color: C_WORDS, glow: '91,116,255' },
      { label: 'Лучший день', value: fmtDur(bestDay.minutes), sub: bestDay.date.toLocaleDateString('ru-RU'), color: C_GRAMMAR, glow: '240,138,180' },
      { label: 'Серия', value: '7 дней', sub: '92% точность', color: C_PHRASES, glow: '219,159,58' },
    ]
  }, [period, daily, totalWords, totalMin, avgWords, avgMin, bestDay])

  const mainTitle = period === 'day' ? 'Фокус по часам' : period === 'week' ? 'Тренд недели' : period === 'month' ? 'Тренд месяца' : 'Тренд года'
  const mainSub = period === 'day' ? 'сегодня' : period === 'week' ? `${totalWords} слов` : `${fmtDur(totalMin)} всего`

  const mainIsBar = period === 'day' || period === 'year'
  const mainData = period === 'day' ? hourly : period === 'year' ? monthly : daily

  return (
    <div className="w-full flex flex-col gap-5">
      {/* period */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur">
          {PERIODS.map((p) => {
            const active = period === p.key
            return (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="px-3.5 py-1.5 rounded-lg text-[12px] font-bold border cursor-pointer transition-all"
                style={
                  active
                    ? {
                        background: 'rgba(90,212,181,0.14)',
                        color: '#5AD4B5',
                        borderColor: 'rgba(90,212,181,0.28)',
                        boxShadow: isLight ? undefined : '0 0 14px rgba(90,212,181,0.18)',
                      }
                    : {
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.55)',
                        borderColor: 'transparent',
                      }
                }
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <span className="text-xs opacity-40">период • {mainSub}</span>
      </div>

      {/* language profile + real stats */}
      {statProfiles.length > 0 && (
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex flex-wrap items-center gap-2">
            {statProfiles.map((p) => {
              const active = p.id === statProfileId
              return (
                <button
                  key={p.id}
                  onClick={() => setStatProfileId(p.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-black border transition-all ${active ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:bg-white/[0.08]'}`}
                >
                  {statLangMap[p.target_language_id] ?? p.level} • {p.level}
                </button>
              )
            })}
            <span className="text-[11px] opacity-40 font-bold ml-1">статистика профиля</span>
          </div>
          {realStat && (
            <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { label: 'Слов выучено', value: String(realStat.words_learned), color: '#5AD4B5' },
                { label: 'Серия', value: `${realStat.streak_days} дн.`, color: '#F5C16A' },
                { label: 'Рекорд серии', value: `${realStat.best_streak} дн.`, color: '#ff9d5c' },
                { label: 'XP', value: String(realStat.xp), color: '#5B74FF' },
                {
                  label: 'Точность',
                  value: `${Math.round(realStat.accuracy * 100)}%`,
                  color: '#F08AB4',
                },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
                  <div className="text-[10px] tracking-[0.08em] uppercase font-bold opacity-40">{s.label}</div>
                  <div className="text-[20px] font-black mt-0.5 tabular-nums" style={{ color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          )}
          {dueCount !== null && (
            <div className="text-xs opacity-50 mt-3">
              Сегодня к повторению: <span className="font-black text-white">{dueCount}</span>
            </div>
          )}
        </div>
      )}

      {/* pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {pills.map((p, pi) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * pi, duration: 0.28 }}
            className="relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-[#171717] p-4"
          >
            <div className="text-[11px] tracking-[0.08em] uppercase font-bold opacity-40">{p.label}</div>
            <div className="text-[22px] font-black mt-1 tabular-nums" style={{ color: p.color }}>
              {p.value}
            </div>
            <div className="text-xs opacity-50 mt-0.5">{p.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* main + pie */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[15px] font-black tracking-tight">{mainTitle}</h3>
            <span className="text-[11px] opacity-40 font-mono">{mainSub}</span>
          </div>
          <div className="h-[260px]">
            {mainIsBar ? (
              <BarChart data={mainData as unknown as Record<string, unknown>[]} xDataKey="label" aspectRatio="2.2 / 1">
                <Grid horizontal />
                <Bar dataKey="minutes" fill="var(--chart-line-primary)" />
                <BarXAxis showAllLabels />
                <BarYAxis />
                <ChartTooltip />
              </BarChart>
            ) : (
              <AreaChart data={mainData as unknown as Record<string, unknown>[]} xDataKey={period === 'week' || period === 'month' ? 'date' : 'date'} aspectRatio="2.2 / 1">
                <Grid horizontal />
                <Area dataKey="minutes" fill="var(--chart-line-primary)" fillOpacity={0.22} strokeWidth={2} />
                <XAxis />
                <ChartTooltip />
              </AreaChart>
            )}
          </div>
        </div>

        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5 overflow-hidden">
          <h3 className="text-[15px] font-black tracking-tight">Темы</h3>
          <p className="text-xs opacity-40">распределение слов</p>
          <div className="flex items-center justify-center py-2">
            <PieChart data={pieData} size={240} innerRadius={62} padAngle={0.02} cornerRadius={6}>
              <PieSlice index={0} hoverEffect="translate" />
              <PieSlice index={1} hoverEffect="translate" />
              <PieSlice index={2} hoverEffect="translate" />
              <PieSlice index={3} hoverEffect="translate" />
              <PieCenter>
                {({ value, label }) => (
                  <div className="text-center select-none">
                    <div className="text-[22px] font-black tabular-nums" style={{ color: (pieData.find((p) => p.label === label)?.color as string) ?? '#fff' }}>
                      {value}
                    </div>
                    <div className="text-[10px] tracking-[0.08em] uppercase opacity-40 font-bold">{label || 'слов'}</div>
                  </div>
                )}
              </PieCenter>
            </PieChart>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {pieData.map((p) => (
              <span key={p.label} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                <span className="opacity-60">{p.label}</span>
                <span className="font-bold" style={{ color: p.color }}>{p.value}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* second row: weekday avg + ring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-black tracking-tight">{period === 'day' ? 'План дня' : 'По дням недели'}</h3>
            <span className="text-[11px] opacity-40 font-mono">среднее</span>
          </div>
          {period === 'day' ? (
            <div className="space-y-2.5">
              {[
                { name: 'Утро • новые слова', min: 18, color: C_FOCUS },
                { name: 'День • повторение', min: 12, color: C_WORDS },
                { name: 'Вечер • фразы', min: 9, color: C_GRAMMAR },
              ].map((r) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full" style={{ background: r.color, boxShadow: `0 0 8px ${r.color}60` }} />
                  <span className="text-[13px] flex-1 truncate">{r.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-[160px]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(r.min / 20) * 100}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full" style={{ background: r.color }} />
                  </div>
                  <span className="font-mono text-xs font-bold w-12 text-right">{r.min} мин</span>
                </div>
              ))}
            </div>
          ) : (
            <BarChart data={weekdayAvg as unknown as Record<string, unknown>[]} xDataKey="label" aspectRatio="2 / 1">
              <Grid horizontal />
              <Bar dataKey="minutes" fill="var(--chart-line-primary)" />
              <BarXAxis />
              <BarYAxis />
              <ChartTooltip />
            </BarChart>
          )}
        </div>

        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5 flex flex-col">
          <h3 className="text-[15px] font-black tracking-tight">Цели</h3>
          <div className="flex items-center gap-6 py-3 flex-1">
            <RingChart data={ringData} size={200} hoveredIndex={hoveredRing} onHoverChange={setHoveredRing}>
              <Ring index={0} showGlow />
              <Ring index={1} showGlow />
              <Ring index={2} showGlow />
              <RingCenter>
                {({ value, label }) => (
                  <div className="text-center">
                    <div className="text-[20px] font-black tabular-nums" style={{ color: (ringData.find((r) => r.label === label)?.color as string) ?? '#fff' }}>{value}</div>
                    <div className="text-[10px] tracking-[0.08em] uppercase opacity-40 font-bold">{label || 'Слова'}</div>
                  </div>
                )}
              </RingCenter>
            </RingChart>
            <div className="flex-1 grid gap-2">
              {ringData.map((r, ri) => {
                const pct = Math.round((r.value / r.maxValue) * 100)
                const hot = hoveredRing === ri
                return (
                  <div
                    key={r.label}
                    onMouseEnter={() => setHoveredRing(ri)}
                    onMouseLeave={() => setHoveredRing(null)}
                    className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 cursor-default transition-colors"
                    style={{ background: hot ? `${r.color}14` : 'transparent' }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: r.color, boxShadow: hot ? `0 0 10px ${r.color}` : undefined }} />
                    <span className="text-xs flex-1">{r.label}</span>
                    <span className="font-mono text-xs font-bold">{pct}%</span>
                    <span className="text-xs opacity-50">{r.value}/{r.maxValue}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* heatmap + top days */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-black tracking-tight">Активность</h3>
            <span className="text-[11px] opacity-40 font-mono">{daily.length} дн • {fmtDur(totalMin)}</span>
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="min-w-max">
              <div className="flex gap-[3px]">
                {Array.from({ length: Math.ceil(daily.length / 7) }, (_, c) => (
                  <div key={c} className="flex flex-col gap-[3px]">
                    {Array.from({ length: 7 }, (_, r) => {
                      const idx = c * 7 + r
                      const cell = daily[idx]
                      if (!cell) return <div key={r} className="w-[11px] h-[11px] rounded-[3px] bg-white/[0.04]" />
                      return (
                        <div
                          key={r}
                          title={`${cell.date.toLocaleDateString('ru-RU')} — ${cell.minutes ? fmtDur(cell.minutes) : 'нет'}`}
                          className="w-[11px] h-[11px] rounded-[3px]"
                          style={{ background: heatColor(cell.minutes, isLight) }}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] opacity-40">
            меньше
            {[0, 8, 16, 24, 30].map((v) => (
              <span key={v} className="w-2.5 h-2.5 rounded-[2px]" style={{ background: heatColor(v, isLight) }} />
            ))}
            больше
          </div>
        </div>

        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-black tracking-tight">Лучшие дни</h3>
            <span className="text-[11px] opacity-40 font-mono">топ-5</span>
          </div>
          <div className="space-y-2.5 flex-1">
            {[...daily]
              .sort((a, b) => b.minutes - a.minutes)
              .slice(0, 5)
              .map((d, i) => {
                const max = Math.max(...daily.map((x) => x.minutes), 1)
                return (
                  <div key={d.date.toISOString()} className="flex items-center gap-3">
                    <span className="font-mono text-[11px] font-bold w-4 text-right" style={{ color: i === 0 ? '#ffd76a' : i === 1 ? '#b8c4d4' : i === 2 ? '#d08a5a' : '#6b7280' }}>
                      {i + 1}
                    </span>
                    <span className="text-xs w-10 opacity-60">{WEEKDAYS[(d.date.getDay() + 6) % 7]}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(d.minutes / max) * 100}%`, background: d.minutes >= goal ? '#5AD4B5' : '#5B74FF' }} />
                    </div>
                    <span className="font-mono text-xs font-bold w-12 text-right" style={{ color: d.minutes >= goal ? '#5AD4B5' : '#5B74FF' }}>
                      {fmtDur(d.minutes)}
                    </span>
                  </div>
                )
              })}
          </div>
          <div className="text-[11px] opacity-40 mt-3">{daily.filter((d) => d.minutes >= goal).length} дн достигли цели • средний {fmtDur(avgMin)}</div>
        </div>
      </div>

      {/* goal progress */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-black tracking-tight">Прогресс к цели</h3>
          <span className="text-[11px] opacity-40 font-mono">цель {fmtDur(goal)}/день</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[32px] font-black tabular-nums" style={{ color: pct >= 100 ? '#5AD4B5' : '#5B74FF' }}>
            {pct}%
          </span>
          <span className="text-sm opacity-50">средний день — {fmtDur(avgMin)}</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mt-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full"
            style={{ background: pct >= 100 ? 'linear-gradient(90deg,#5B74FF,#5AD4B5)' : '#5B74FF', boxShadow: pct >= 100 ? '0 0 14px rgba(90,212,181,0.5)' : undefined }}
          />
        </div>
        <div className="text-xs opacity-40 mt-2">{pct >= 100 ? `Цель превышена на ${fmtDur(avgMin - goal)}` : `До цели не хватает ${fmtDur(goal - avgMin)}`}</div>
      </div>
    </div>
  )
}
