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
} from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'

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

function AchievementsBlock({ items }: { items: typeof achievements }) {
  const [filter, setFilter] = useState<'all' | 'done' | 'progress'>('all')
  const [selected, setSelected] = useState<(typeof achievements)[number] | null>(items[0] ?? null)

  const filtered = items.filter((a) => {
    if (filter === 'done') return a.progress === 100
    if (filter === 'progress') return a.progress < 100
    return true
  })
  const doneCount = items.filter((a) => a.progress === 100).length

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

      {/* полка с 3D бейджами — горизонтальный скролл, выдерживает сколько угодно */}
      <div className="mt-4 px-5">
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20" style={{ scrollbarWidth: 'thin' }}>
          {filtered.map((a) => {
            const isActive = selected?.title === a.title
            const pct = a.progress
            const circumference = 2 * Math.PI * 26
            const dashOffset = circumference * (1 - pct / 100)
            return (
              <button
                key={a.title}
                onClick={() => setSelected(a)}
                className={`group relative flex-none w-[148px] snap-start rounded-[20px] border p-3 pt-4 flex flex-col items-center gap-2 text-center transition-all duration-200 ${isActive ? 'bg-white text-black border-white shadow-[0_12px_32px_rgba(255,255,255,0.10)] scale-[1.02]' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10] hover:-translate-y-0.5'}`}
              >
                <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${a.rarity === 'common' ? 'bg-black/5 border-black/5 text-black/40' : a.rarity === 'rare' ? 'bg-[#5B74FF]/10 border-[#5B74FF]/20 text-[#5B74FF]' : a.rarity === 'epic' ? 'bg-[#a78bfa]/10 border-[#a78bfa]/20 text-[#a78bfa]' : 'bg-[#f43f5e]/10 border-[#f43f5e]/20 text-[#f43f5e]'} ${isActive ? '!bg-black/5 !border-black/10 !text-black/60' : ''}`}>{a.rarity}</span>
                <div className="relative w-[72px] h-[72px] grid place-items-center">
                  <svg viewBox="0 0 64 64" className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke={isActive ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'} strokeWidth="5" />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke={a.color}
                      strokeWidth="5"
                      strokeLinecap="round"
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: dashOffset }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                      style={{ strokeDasharray: circumference }}
                      opacity={isActive ? 1 : 0.95}
                    />
                  </svg>
                  <span className={`w-10 h-10 rounded-xl grid place-items-center border text-[16px] ${isActive ? 'bg-black/[0.04] border-black/10' : ''}`} style={{ background: isActive ? 'rgba(0,0,0,0.04)' : `${a.color}14`, borderColor: isActive ? 'rgba(0,0,0,0.08)' : `${a.color}22`, color: isActive ? '#111' : a.color }}>
                    <FontAwesomeIcon icon={a.icon} />
                  </span>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[10px] font-black tabular-nums border shadow-sm" style={{ background: isActive ? '#111' : a.color, color: isActive ? '#fff' : '#000', borderColor: isActive ? '#111' : 'rgba(255,255,255,0.9)' }}>{pct}%</span>
                </div>
                <span className={`text-[12px] font-black leading-tight line-clamp-1 mt-1 ${isActive ? 'text-black' : 'text-white'}`}>{a.title}</span>
                <span className={`text-[11px] leading-none line-clamp-1 ${isActive ? 'text-black/60' : 'opacity-40'}`}>{a.desc}</span>
                {a.progress === 100 ? <span className="mt-1 text-[10px] font-black text-[#5AD4B5]">✓ Получено</span> : <span className="mt-1 text-[10px] font-bold opacity-40">{a.total - a.current} осталось</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* деталка выбранного — без ховера, всегда видно за что и сколько осталось */}
      {selected && (
        <motion.div key={selected.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-5 mb-5 mt-1 rounded-2xl bg-[#0f0f0f] border border-white/[0.06] p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex gap-3 flex-1 min-w-0">
            <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 border" style={{ background: `${selected.color}14`, borderColor: `${selected.color}22`, color: selected.color }}>
              <FontAwesomeIcon icon={selected.icon} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-black leading-none flex flex-wrap items-center gap-2">
                {selected.title} <span className="px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] font-bold opacity-60">{selected.rarity}</span>
              </div>
              <div className="text-xs opacity-50 mt-1">{selected.condition} • <span style={{ color: selected.color }} className="font-bold">{selected.reward}</span></div>
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-[220px]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${selected.progress}%` }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: selected.color }} />
                </div>
                <span className="text-xs font-black tabular-nums" style={{ color: selected.color }}>{selected.progress}%</span>
              </div>
            </div>
          </div>
          <div className="sm:w-[140px] shrink-0 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3 flex flex-col justify-center gap-1">
            <div className="text-[11px] font-bold opacity-40 uppercase tracking-wide">Прогресс</div>
            <div className="text-sm font-black tabular-nums" style={{ color: selected.progress === 100 ? selected.color : 'white' }}>{selected.current} / {selected.total}</div>
            <div className="text-xs font-bold" style={{ color: selected.progress === 100 ? selected.color : 'rgba(255,255,255,0.5)' }}>{selected.progress === 100 ? `✓ Получено` : `Осталось ${selected.total - selected.current} • ${100 - selected.progress}%`}</div>
            <div className="text-[11px] opacity-30">{selected.progress === 100 ? 'Награда получена' : `До награды ${selected.reward}`}</div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default function Profile() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }} className="w-full flex flex-col gap-5">
      {/* hero — personal */}
      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#171717] p-0">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#5AD4B5]/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '18px 18px' }} />
        <div className="relative p-6 sm:p-7">
          <div className="flex gap-4">
            <div className="relative shrink-0">
              <div className="w-[84px] h-[84px] rounded-[20px] bg-gradient-to-br from-[#5AD4B5] to-[#5B74FF] p-[2px] shadow-[0_12px_32px_rgba(91,116,255,0.22)]">
                <div className="w-full h-full rounded-[18px] bg-[#0f0f0f] grid place-items-center text-[28px]">А</div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#5AD4B5] text-black grid place-items-center text-[11px] font-black border-2 border-[#171717]">A2</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[26px] sm:text-[30px] font-black tracking-tight leading-none">Алексей</h1>
                <span className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black">PRO</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 text-xs font-medium">
                  <FontAwesomeIcon icon={faLocationDot} className="opacity-60" /> Москва • 24 года
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="px-2.5 py-1 rounded-full bg-[#5AD4B5]/10 border border-[#5AD4B5]/20 text-[#5AD4B5] text-xs font-bold">✈️ Путешествия</span>
                <span className="px-2.5 py-1 rounded-full bg-[#5B74FF]/10 border border-[#5B74FF]/20 text-[#8b9bff] text-xs font-bold">💼 Работа</span>
                <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/60 text-xs font-semibold">🎬 Кино</span>
                <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-white/60 text-xs font-semibold">☕ Кофе</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5">
              <div className="text-[11px] tracking-[0.08em] uppercase font-bold opacity-40 flex items-center gap-1.5"><FontAwesomeIcon icon={faLanguage} /> Языки</div>
              <div className="text-sm font-bold mt-1">Русский → English</div>
              <div className="text-xs opacity-50">с нуля • 3 мес.</div>
            </div>
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3.5">
              <div className="text-[11px] tracking-[0.08em] uppercase font-bold opacity-40 flex items-center gap-1.5"><FontAwesomeIcon icon={faHeart} className="text-[#F08AB4]" /> Интересы</div>
              <div className="text-sm font-bold mt-1">Еда и эмоции</div>
              <div className="text-xs opacity-50">любимые темы</div>
            </div>
            <div className="rounded-2xl bg-[#5AD4B5] p-3.5 text-black">
              <div className="text-[11px] tracking-[0.08em] uppercase font-black opacity-60 flex items-center gap-1"><FontAwesomeIcon icon={faRocket} /> Цель</div>
              <div className="text-sm font-black mt-1">B1 к июню</div>
              <div className="text-xs font-semibold opacity-60">ещё 58 слов</div>
            </div>
          </div>
        </div>
      </div>

      {/* goals — во всю ширину, без О себе */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBullseye} className="text-[#5B74FF]" /> Цели на месяц</h3>
          <span className="text-[11px] opacity-40 font-bold">май • 2026</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { title: 'Заговорить в кафе', desc: 'Заказать еду без пауз', progress: 68, color: '#5AD4B5' },
            { title: '20 фраз для путешествий', desc: 'Аэропорт, отель, город', progress: 42, color: '#5B74FF' },
            { title: 'Серия 14 дней', desc: 'Не пропускать', progress: 50, color: '#F5C16A' },
          ].map((g) => (
            <div key={g.title} className="rounded-xl bg-white/[0.03] border border-white/[0.04] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{g.title}</span>
                <span className="text-xs font-black" style={{ color: g.color }}>{g.progress}%</span>
              </div>
              <div className="text-xs opacity-50">{g.desc}</div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-2.5">
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${g.progress}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: g.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* achievements — переделано: много, hover с прогрессом */}
      <AchievementsBlock items={achievements} />

      {/* friends / community */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faUsers} className="text-[#5B74FF]" /> Друзья учат</h3>
          <div className="mt-4 space-y-3">
            {[
              { name: 'Марина', level: 'B1', streak: 12, avatar: 'М' },
              { name: 'Игорь', level: 'A2', streak: 7, avatar: 'И' },
              { name: 'София', level: 'A1', streak: 3, avatar: 'С' },
            ].map((f) => (
              <div key={f.name} className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.04] p-3">
                <span className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.08] grid place-items-center font-bold text-sm">{f.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold leading-none">{f.name} • <span className="opacity-60 font-semibold">{f.level}</span></div>
                  <div className="text-xs opacity-40">🔥 {f.streak} дней</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-bold">+</span>
              </div>
            ))}
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
