import { useState } from 'react'
import { motion } from 'framer-motion'
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
import { AreaChart } from '@/components/charts/area-chart'
import { Area } from '@/components/charts/area'
import { Grid } from '@/components/charts/grid'
import { XAxis } from '@/components/charts/x-axis'
import { ChartTooltip } from '@/components/charts/tooltip'

const topicCards = [
  { icon: 'utensils', title: 'Еда', count: '48 слов', sub: 'ресторан • рынок', tone: 'topic-card--mint' },
  { icon: 'plane', title: 'Путешествия', count: '52 слова', sub: 'аэропорт • город', tone: 'topic-card--sky' },
  { icon: 'smile', title: 'Эмоции', count: '36 слов', sub: 'чувства • общение', tone: 'topic-card--rose' },
  { icon: 'briefcase', title: 'Работа', count: '44 слова', sub: 'офис • проекты', tone: 'topic-card--sand' },
]

const topicIconMap = {
  utensils: faUtensils,
  plane: faPlane,
  smile: faFaceSmile,
  briefcase: faBriefcase,
} as const

const grammarCards = [
  { dot: 'grammar-card__dot--mint', title: 'Глаголы', subtitle: '200 слов • 34 выучено', progress: 17, level: 'Основа речи', accent: 'rgba(90,212,181,0.22)' },
  { dot: 'grammar-card__dot--blue', title: 'Существительные', subtitle: '300 слов • 12 выучено', progress: 4, level: 'База словаря', accent: 'rgba(91,116,255,0.22)' },
  { dot: 'grammar-card__dot--pink', title: 'Прилагательные', subtitle: '150 слов • 8 выучено', progress: 5, level: 'Описание', accent: 'rgba(240,138,180,0.22)' },
  { dot: 'grammar-card__dot--gold', title: 'Фразы', subtitle: '80 фраз • 0 выучено', progress: 0, level: 'Практика', accent: 'rgba(219,159,58,0.22)' },
]

const phraseCards = [
  { label: 'РЕСТОРАН', accent: 'phrase-card__label--mint', icon: faCircle, title: 'Can I have the bill, please?', translation: 'Можно счёт, пожалуйста?' },
  { label: 'ГОРОД', accent: 'phrase-card__label--blue', icon: faLocationDot, title: 'Where is the nearest metro?', translation: 'Где ближайшее метро?' },
  { label: 'ОТЕЛЬ', accent: 'phrase-card__label--pink', icon: faStar, title: "I'd like to check in", translation: 'Я хочу заселиться.' },
]

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

function ProgressRing({ value }: { value: number }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - value)
  return (
    <motion.div className="progress-ring" aria-hidden="true" whileHover={{ scale: 1.06 }}>
      <svg viewBox="0 0 72 72">
        <circle className="progress-ring__track" cx="36" cy="36" r={radius} />
        <motion.circle
          className="progress-ring__value"
          cx="36"
          cy="36"
          r={radius}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span>
        <CountUp to={12} duration={1.2} />
      </span>
    </motion.div>
  )
}

export default function Home() {
  const [flippedId, setFlippedId] = useState<string | null>(null)
  const { speak, isSpeaking, cancel } = useSpeech({ lang: 'en-US', rate: 0.92 })
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  const handleSpeak = (id: string, text: string) => {
    if (isSpeaking && speakingId === id) {
      cancel()
      setSpeakingId(null)
      return
    }
    setSpeakingId(id)
    speak(text)
    setTimeout(() => setSpeakingId(null), 4000)
  }

  return (
    <motion.div animate="animate" initial="initial" transition={{ staggerChildren: 0.08 }} className="relative">
      <motion.header className="topbar relative" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div>
          <p className="brand">Lexio</p>
          <p className="greeting">Добрый день • Готов к прорыву?</p>
          <h1>
            Продолжим <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5AD4B5] to-[#5B74FF]">учить?</span>
          </h1>
          <p className="hero-copy">
            Короткие сессии, живые карточки и магия прогресса. Сегодня — твой день!
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
          <CountUp to={7} /> дней подряд
        </motion.div>
      </motion.header>

      {/* HERO — 2026 minimal, без “2010” градиентов */}
      <motion.section variants={fadeUp} transition={{ duration: 0.55 }} className="mt-5 relative">
        <SpotlightCard spotlightColor={'rgba(90, 212, 181, 0.10)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0 !overflow-visible">
          <div className="relative rounded-[24px] border border-white/[0.06] bg-[#171717] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center gap-5 overflow-hidden">
            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-[#5AD4B5]/[0.06] blur-2xl pointer-events-none" />
            <div className="flex gap-4 items-center flex-1 min-w-0">
              <ProgressRing value={0.6} />
              <div className="min-w-0">
                <p className="eyebrow flex items-center gap-2 !mt-0">
                  <FontAwesomeIcon icon={faBolt} className="text-[#5AD4B5]" /> Дневная цель
                </p>
                <h2 className="text-[18px] sm:text-[20px] font-black tracking-tight leading-tight mt-1">
                  <CountUp to={12} /> из <CountUp to={20} /> слов • <span className="text-white/60 font-semibold">60%</span>
                </h2>
                <p className="text-white/50 text-[13px] leading-snug mt-1">Еда, travel-фразы и глаголы — сегодня в фокусе.</p>
              </div>
            </div>
            <div className="flex gap-2.5 flex-wrap lg:flex-nowrap">
              <div className="flex-1 lg:flex-none min-w-[110px] rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 text-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold">Сегодня</div>
                <div className="text-[18px] font-black"><CountUp to={18} /> мин</div>
              </div>
              <div className="flex-1 lg:flex-none min-w-[110px] rounded-2xl bg-[#5AD4B5]/[0.08] border border-[#5AD4B5]/20 px-4 py-3 text-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-60 font-bold text-[#5AD4B5]">Серия</div>
                <div className="text-[18px] font-black text-[#5AD4B5]"><CountUp to={92} />%</div>
              </div>
              <div className="hidden sm:flex min-w-[90px] rounded-2xl bg-white/[0.04] border border-white/[0.06] px-4 py-3 flex-col items-center justify-center">
                <div className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold flex items-center gap-1"><FontAwesomeIcon icon={faTrophy} className="text-[#DB9F3A]" /> Уровень</div>
                <div className="text-[16px] font-black">A2</div>
              </div>
            </div>
            <motion.button className="primary-action !m-0 lg:ml-auto group shrink-0" type="button" whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              Продолжить <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </div>
        </SpotlightCard>
      </motion.section>

      {/* WORD OF DAY — 2026 minimal, без фото */}
      <motion.section variants={fadeUp} transition={{ duration: 0.5 }} className="content-section !mt-6">
        <div className="section-header">
          <h3 className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBookOpen} className="text-[#5AD4B5]" /> Слово дня
          </h3>
          <span className="text-[11px] tracking-[0.12em] uppercase opacity-50 font-bold">клик — озвучка</span>
        </div>
        <SpotlightCard spotlightColor={'rgba(90, 212, 181, 0.10)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0">
          <div className="group relative rounded-[24px] border border-white/[0.06] bg-[#171717] p-6 sm:p-7 overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-[#5AD4B5]/[0.06] blur-2xl pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`, backgroundSize: '20px 20px' }} />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] font-bold tracking-widest uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5AD4B5] animate-pulse" /> EN • сущ. • B2
                </div>
                <h4 className="text-[34px] sm:text-[42px] font-black tracking-[-0.04em] leading-none mt-3">Serendipity</h4>
                <p className="text-white/40 text-[13px] font-medium mt-1">/ˌser.ənˈdɪp.ɪ.ti/</p>
                <p className="text-white/70 text-[14px] leading-relaxed mt-3 max-w-[42ch]">Счастливая случайность — когда находишь ценное, не искав.</p>
                <p className="text-white/35 text-[13px] mt-2 leading-relaxed max-w-[42ch]">“It was pure <span className="text-white/80 font-medium">serendipity</span> that we met after the rain in Prague.”</p>
              </div>
              <button type="button" onClick={() => handleSpeak('serendipity', 'Serendipity')} className="w-12 h-12 rounded-full bg-[#5AD4B5] text-black grid place-items-center hover:scale-105 hover:brightness-110 transition shadow-[0_8px_20px_rgba(90,212,181,0.22)] flex-shrink-0">
                ▶
              </button>
            </div>
            <div className="relative mt-5 flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-full bg-white text-black text-xs font-bold">Запомнить</span>
              <span className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/70 text-xs font-semibold">Примеры 3</span>
              <span className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-xs">Синонимы: luck, chance</span>
            </div>
          </div>
        </SpotlightCard>
      </motion.section>

      {/* TOPICS — 2026 minimal, без фото, иконки + градиент */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3>По теме</h3>
          <button className="text-link" type="button">Все темы</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {topicCards.map((card) => (
            <SpotlightCard key={card.title} spotlightColor={'rgba(255,255,255,0.06)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0 h-full">
              <div className={`group relative rounded-[20px] border border-white/[0.06] p-[1px] h-full overflow-hidden ${card.tone}`}>
                <div className="rounded-[19px] bg-[#171717] p-4 h-full flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity blur-[18px]" style={{ background: card.tone.includes('mint') ? '#5AD4B5' : card.tone.includes('sky') ? '#5B74FF' : card.tone.includes('rose') ? '#F08AB4' : '#DB9F3A' }} />
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.06] grid place-items-center text-white/90 group-hover:bg-white group-hover:text-black transition-colors">
                    <FontAwesomeIcon icon={topicIconMap[card.icon as keyof typeof topicIconMap]} />
                  </div>
                  <div className="mt-1">
                    <h4 className="text-[17px] font-black tracking-tight leading-none">{card.title}</h4>
                    <p className="text-[13px] font-bold opacity-90 mt-1">{card.count}</p>
                    <p className="text-[12px] opacity-50 leading-tight mt-1">{card.sub}</p>
                  </div>
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold tracking-widest uppercase opacity-40">Открыть →</span>
                    <span className="w-6 h-6 rounded-full bg-white text-black grid place-items-center text-[11px] opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all">↗</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </motion.section>

      {/* GRAMMAR — 2026 clean, без “2010” теней */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header section-header--stacked">
          <div>
            <h3>По грамматике</h3>
            <p>Соберите базу, чтобы быстрее перейти к свободной речи.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {grammarCards.map((card, index) => (
            <SpotlightCard key={card.title} spotlightColor={(card.accent as unknown as `rgba(${number}, ${number}, ${number}, ${number})`)} className="!p-0 !bg-transparent !border-0 h-full">
              <motion.article
                className="group relative rounded-[20px] border border-white/[0.06] bg-[#171717] p-4 flex flex-col gap-3 h-full overflow-hidden hover:border-white/10 transition-colors"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 + index * 0.05, duration: 0.38 }}
                whileHover={{ y: -4 }}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-2.5 h-2.5 rounded-full ${card.dot.replace('grammar-card__dot--', 'bg-').replace('mint', '[#5AD4B5]').replace('blue', '[#5B74FF]').replace('pink', '[#F08AB4]').replace('gold', '[#DB9F3A]')}`} style={{ background: card.dot.includes('mint') ? '#5AD4B5' : card.dot.includes('blue') ? '#5B74FF' : card.dot.includes('pink') ? '#F08AB4' : '#DB9F3A', boxShadow: `0 0 10px ${card.dot.includes('mint') ? '#5AD4B5' : card.dot.includes('blue') ? '#5B74FF' : card.dot.includes('pink') ? '#F08AB4' : '#DB9F3A'}60` }} />
                  <span className="text-[10px] font-bold tracking-[0.10em] uppercase px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] opacity-70">{card.level}</span>
                </div>
                <div>
                  <h4 className="text-[15px] font-black tracking-tight">{card.title}</h4>
                  <p className="text-[12px] opacity-50 leading-tight mt-1">{card.subtitle}</p>
                </div>
                <div className="mt-auto pt-2 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div className="h-full rounded-full" style={{ background: card.dot.includes('mint') ? '#5AD4B5' : card.dot.includes('blue') ? '#5B74FF' : card.dot.includes('pink') ? '#F08AB4' : '#DB9F3A' }} initial={{ width: 0 }} animate={{ width: `${card.progress}%` }} transition={{ delay: 0.4 + index * 0.06, duration: 0.8 }} />
                  </div>
                  <span className="text-[12px] font-black tabular-nums">
                    <CountUp to={card.progress} duration={0.9} />%
                  </span>
                </div>
              </motion.article>
            </SpotlightCard>
          ))}
        </div>
      </motion.section>

      {/* WEEKLY TREND — Bklit AreaChart (как родной) */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3 className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBolt} className="text-[#5B74FF]" /> Тренд недели
          </h3>
          <span className="text-[11px] tracking-[0.12em] uppercase opacity-50 font-bold">интерактив • наведи</span>
        </div>
        <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.02] p-3 sm:p-5 backdrop-blur">
          <div className="h-[220px] w-full">
            <AreaChart data={weeklyData as unknown as Record<string, unknown>[]} xDataKey="date" aspectRatio="3 / 1" className="w-full h-full">
              <Grid horizontal numTicksRows={4} stroke="rgba(255,255,255,0.06)" />
              <Area dataKey="minutes" fill="var(--chart-line-primary)" stroke="var(--chart-line-primary)" fillOpacity={0.24} strokeWidth={2.5} />
              <XAxis numTicks={7} />
              <ChartTooltip />
            </AreaChart>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#5AD4B5]/15 text-[#5AD4B5] text-xs font-bold border border-[#5AD4B5]/20">18 мин сегодня</span>
            <span className="px-3 py-1 rounded-full bg-white/5 text-white/60 text-xs font-semibold border border-white/10">Пик: 30 мин в субботу</span>
            <span className="px-3 py-1 rounded-full bg-[#5B74FF]/15 text-[#8b9bff] text-xs font-semibold border border-[#5B74FF]/20">Цель: 20 мин/день</span>
          </div>
        </div>
      </motion.section>

      {/* STATS — native */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Слов выучено', value: 142, sub: 'всего', color: '#5AD4B5' },
            { label: 'Дней подряд', value: 7, sub: '🔥 рекорд', color: '#F5C16A' },
            { label: 'Точность', value: 92, suffix: '%', color: '#5B74FF' },
            { label: 'Минут сегодня', value: 18, sub: 'из 20', color: '#F08AB4' },
          ].map((s) => (
            <div key={s.label} className="rounded-[20px] border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur flex flex-col items-center gap-1 text-center">
              <span className="text-[11px] tracking-[0.10em] uppercase opacity-50 font-bold">{s.label}</span>
              <span className="text-[28px] font-black tracking-tight leading-none flex items-baseline justify-center gap-0.5" style={{ color: s.color }}>
                <CountUp to={s.value} duration={1} className="tabular-nums" />
                <span className="text-[22px] font-black">{s.suffix || ''}</span>
              </span>
              <span className="text-xs opacity-60">{s.sub}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* PHRASES — Flip + Spotlight */}
      <motion.section className="content-section !mt-6" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3 className="flex items-center gap-2">
            <FontAwesomeIcon icon={faComments} className="text-[#F08AB4]" /> Разговорные фразы • клик — флип, L — звук
          </h3>
          <button className="text-link" type="button">
            Все фразы
          </button>
        </div>

        <div className="phrase-strip">
          {phraseCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 + index * 0.07, duration: 0.42 }}
              className="relative"
              whileHover={{ y: -4 }}
            >
              <SpotlightCard spotlightColor={'rgba(240, 138, 180, 0.16)' as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0 h-full">
                <FlipCard
                  label={card.label}
                  labelAccent={card.accent}
                  icon={card.icon}
                  title={card.title}
                  translation={card.translation}
                  isFlipped={flippedId === card.title}
                  isSpeaking={speakingId === card.title && isSpeaking}
                  onFlip={() => setFlippedId((v) => (v === card.title ? null : card.title))}
                  onSpeak={() => handleSpeak(card.title, card.title)}
                />
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </motion.section>
    </motion.div>
  )
}
