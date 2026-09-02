import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFire,
  faDumbbell,
  faBullseye,
  faStar,
  faTrophy,
  faBook,
  faChartLine,
  faClock,
  faPen,
  faMedal,
  faCrown,
  faBolt,
} from '@fortawesome/free-solid-svg-icons'
import CountUp from '@/components/CountUp'
import SpotlightCard from '@/components/SpotlightCard'
import { AreaChart } from '@/components/charts/area-chart'
import { Area } from '@/components/charts/area'
import { Grid } from '@/components/charts/grid'
import { XAxis } from '@/components/charts/x-axis'
import { ChartTooltip } from '@/components/charts/tooltip'

const achievements = [
  { icon: faFire, title: '3 дня подряд', desc: 'Серия без пропусков', progress: 100, rarity: 'common', color: '#ff9d5c' },
  { icon: faDumbbell, title: '50 слов', desc: 'Первый словарь', progress: 100, rarity: 'common', color: '#5AD4B5' },
  { icon: faBullseye, title: 'Первый урок', desc: 'Старт дан', progress: 100, rarity: 'common', color: '#5B74FF' },
  { icon: faStar, title: 'Цель 5 дней', desc: 'Неделя фокуса', progress: 60, rarity: 'rare', color: '#F5C16A' },
  { icon: faTrophy, title: '100 слов', desc: 'Словарь растёт', progress: 42, rarity: 'rare', color: '#F08AB4' },
  { icon: faCrown, title: 'Полиглот', desc: '500 слов', progress: 28, rarity: 'epic', color: '#a78bfa' },
]

const topics = [
  { name: 'Еда', total: 48, done: 18, color: '#5AD4B5' },
  { name: 'Путешествия', total: 52, done: 9, color: '#5B74FF' },
  { name: 'Эмоции', total: 36, done: 14, color: '#F08AB4' },
  { name: 'Работа', total: 44, done: 7, color: '#DB9F3A' },
]

const history = Array.from({ length: 14 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - (13 - i))
  return { date: d, words: 2 + (d.getDate() % 7) + Math.floor(Math.random() * 4) }
})

export default function Profile() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }} className="w-full flex flex-col gap-5">
      {/* hero */}
      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#171717] p-0">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#5AD4B5]/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '18px 18px' }} />
        <div className="relative p-6 sm:p-7 flex flex-col lg:flex-row gap-6">
          <div className="flex gap-4 flex-1 min-w-0">
            <div className="relative shrink-0">
              <div className="w-[84px] h-[84px] rounded-[20px] bg-gradient-to-br from-[#5AD4B5] to-[#5B74FF] p-[2px] shadow-[0_12px_32px_rgba(91,116,255,0.22)]">
                <div className="w-full h-full rounded-[18px] bg-[#0f0f0f] grid place-items-center text-[28px]">А</div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#5AD4B5] text-black grid place-items-center text-[11px] font-black border-2 border-[#171717]">A2</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[24px] sm:text-[28px] font-black tracking-tight leading-none">Алексей</h1>
                <span className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black tracking-wide">PRO</span>
                <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs font-semibold flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faFire} className="text-[#ff9d5c]" /> 7 дней
                </span>
              </div>
              <p className="text-white/50 text-[13px] mt-1 truncate">aleksey@example.com • учит английский 3 мес.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-semibold">
                  <FontAwesomeIcon icon={faBook} className="opacity-60" /> 142 слова
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5AD4B5]/10 border border-[#5AD4B5]/20 text-[#5AD4B5] text-xs font-bold">
                  <FontAwesomeIcon icon={faClock} /> 18 мин сегодня
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-semibold">
                  <FontAwesomeIcon icon={faBullseye} className="text-[#5B74FF]" /> 92% точность
                </span>
              </div>
            </div>
          </div>
          <div className="flex lg:flex-col gap-3 lg:w-[260px] shrink-0">
            <div className="flex-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
              <div className="text-[11px] tracking-[0.08em] uppercase font-bold opacity-40">Уровень</div>
              <div className="text-[22px] font-black mt-1">A2 • База</div>
              <div className="text-xs opacity-50">Следующий B1 — ещё 58 слов</div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-3">
                <motion.div initial={{ width: 0 }} animate={{ width: '42%' }} transition={{ duration: 0.9, ease: 'easeOut' }} className="h-full bg-[#5AD4B5]" />
              </div>
            </div>
            <div className="hidden sm:flex flex-1 rounded-2xl bg-[#5AD4B5] p-4 text-black flex-col justify-center">
              <div className="text-[11px] tracking-[0.08em] uppercase font-black opacity-60">Дневная цель</div>
              <div className="text-[22px] font-black leading-none mt-1">12 / 20</div>
              <div className="text-xs font-semibold opacity-70">слов сегодня</div>
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Всего слов', value: 142, sub: '+6 за неделю', icon: faBook, color: '#5AD4B5' },
          { label: 'Минут', value: 18, sub: 'сегодня', icon: faClock, color: '#5B74FF', suffix: 'м' },
          { label: 'Серия', value: 7, sub: 'дней', icon: faFire, color: '#ff9d5c' },
          { label: 'Точность', value: 92, sub: '% верно', icon: faBullseye, color: '#F08AB4', suffix: '%' },
        ].map((s) => (
          <div key={s.label} className="rounded-[18px] border border-white/[0.06] bg-[#171717] p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.06] grid place-items-center text-white/70">
                <FontAwesomeIcon icon={s.icon} />
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] opacity-60">{s.sub}</span>
            </div>
            <div className="text-[26px] font-black tracking-tight tabular-nums" style={{ color: s.color }}>
              <CountUp to={s.value} duration={0.9} />{s.suffix || ''}
            </div>
            <div className="text-xs font-bold tracking-wide opacity-40 uppercase">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
        {/* topics */}
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBook} className="text-[#5AD4B5]" /> Прогресс по темам</h3>
            <span className="text-[11px] opacity-40 font-mono">4 темы</span>
          </div>
          <div className="mt-4 grid gap-3">
            {topics.map((t) => {
              const pct = Math.round((t.done / t.total) * 100)
              return (
                <div key={t.name} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-white/[0.04] transition-colors">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}66` }} />
                  <span className="text-[13px] font-semibold w-[110px] truncate">{t.name}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-[180px]">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }} className="h-full rounded-full" style={{ background: t.color }} />
                  </div>
                  <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color: t.color }}>{pct}%</span>
                  <span className="text-xs opacity-40 font-mono w-[68px] text-right hidden sm:block">{t.done}/{t.total}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* achievements */}
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faTrophy} className="text-[#F5C16A]" /> Достижения</h3>
            <span className="text-[11px] opacity-40 font-bold">6 • {achievements.filter((a) => a.progress === 100).length} получено</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {achievements.map((a) => (
              <SpotlightCard key={a.title} spotlightColor={`${a.color}22` as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0">
                <div className={`relative rounded-2xl border p-3 flex flex-col items-center gap-2 text-center h-[118px] justify-center overflow-hidden ${a.progress === 100 ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-[#0f0f0f] border-white/[0.04] opacity-80'}`}>
                  {a.rarity === 'epic' && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#a78bfa] shadow-[0_0_8px_#a78bfa]" />}
                  <span className="w-9 h-9 rounded-xl grid place-items-center text-[15px] border" style={{ background: `${a.color}14`, borderColor: `${a.color}22`, color: a.color }}>
                    <FontAwesomeIcon icon={a.icon} />
                  </span>
                  <span className="text-[12px] font-bold leading-tight">{a.title}</span>
                  <span className="text-[11px] opacity-40 leading-none">{a.desc}</span>
                  {a.progress < 100 && (
                    <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden mt-1">
                      <div className="h-full rounded-full" style={{ width: `${a.progress}%`, background: a.color }} />
                    </div>
                  )}
                  {a.progress === 100 && <FontAwesomeIcon icon={faStar} className="text-[#F5C16A] text-[10px]" />}
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </div>

      {/* history */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faChartLine} className="text-[#5B74FF]" /> История • 14 дней</h3>
          <span className="text-[11px] opacity-40">слов / день</span>
        </div>
        <div className="h-[200px] mt-3">
          <AreaChart data={history as unknown as Record<string, unknown>[]} xDataKey="date" aspectRatio="3 / 1">
            <Grid horizontal numTicksRows={3} stroke="rgba(255,255,255,0.06)" />
            <Area dataKey="words" fill="var(--chart-line-primary)" fillOpacity={0.18} strokeWidth={2} />
            <XAxis />
            <ChartTooltip />
          </AreaChart>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/[0.06] bg-[#171717] p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#5AD4B5]/10 border border-[#5AD4B5]/20 grid place-items-center text-[#5AD4B5]"><FontAwesomeIcon icon={faPen} /></span>
          <div>
            <div className="text-sm font-bold">Продолжить</div>
            <div className="text-xs opacity-50">12 слов в очереди</div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#171717] p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#5B74FF]/10 border border-[#5B74FF]/20 grid place-items-center text-[#5B74FF]"><FontAwesomeIcon icon={faMedal} /></span>
          <div>
            <div className="text-sm font-bold">Рейтинг</div>
            <div className="text-xs opacity-50">Топ 18% учеников</div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[#171717] p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#F08AB4]/10 border border-[#F08AB4]/20 grid place-items-center text-[#F08AB4]"><FontAwesomeIcon icon={faBolt} /></span>
          <div>
            <div className="text-sm font-bold">Испытание</div>
            <div className="text-xs opacity-50">5 дней — награда</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
