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
  faCalendar,
  faUsers,
  faQuoteLeft,
  faPen,
  faCrown,
} from '@fortawesome/free-solid-svg-icons'
import SpotlightCard from '@/components/SpotlightCard'

const achievements = [
  { icon: faFire, title: '3 дня подряд', desc: 'Серия', progress: 100, rarity: 'common', color: '#ff9d5c' },
  { icon: faDumbbell, title: '50 слов', desc: 'Первый словарь', progress: 100, rarity: 'common', color: '#5AD4B5' },
  { icon: faBullseye, title: 'Первый урок', desc: 'Старт дан', progress: 100, rarity: 'common', color: '#5B74FF' },
  { icon: faStar, title: 'Цель 5 дней', desc: 'Неделя фокуса', progress: 60, rarity: 'rare', color: '#F5C16A' },
  { icon: faTrophy, title: '100 слов', desc: 'Словарь растёт', progress: 42, rarity: 'rare', color: '#F08AB4' },
  { icon: faCrown, title: 'Полиглот', desc: '500 слов', progress: 28, rarity: 'epic', color: '#a78bfa' },
]

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
              <p className="text-white/60 text-[13px] mt-1.5 leading-relaxed max-w-[52ch]">Учу английский для путешествий и работы. Люблю кофе, кино и разговоры на кухне. Цель — свободно говорить к лету.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
        {/* about */}
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBook} className="text-[#5AD4B5]" /> О себе</h3>
          <p className="text-[13px] leading-relaxed opacity-70 mt-3">Привет! Я Алексей — учу английский, чтобы уверенно заказывать капучино в Риме и вести стендапы на работе. За 3 месяца выучил 142 слова, но главное — не бросаю. Каждый день по 15 минут.</p>
          <div className="mt-4 rounded-2xl bg-[#0f0f0f] border border-white/[0.06] p-4 flex gap-3">
            <span className="w-8 h-8 rounded-full bg-[#5AD4B5]/15 border border-[#5AD4B5]/20 grid place-items-center text-[#5AD4B5] shrink-0"><FontAwesomeIcon icon={faQuoteLeft} /></span>
            <p className="text-[13px] leading-relaxed italic opacity-80">“Язык — это не про идеальную грамматику, а про смелость говорить. Ошибки — это прогресс.”</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-semibold"><FontAwesomeIcon icon={faCalendar} className="opacity-50" /> с янв 2026</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-semibold"><FontAwesomeIcon icon={faUsers} className="opacity-50" /> 3 друга учат вместе</span>
          </div>
        </div>

        {/* goals */}
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faBullseye} className="text-[#5B74FF]" /> Цели на месяц</h3>
            <span className="text-[11px] opacity-40 font-bold">май • 2026</span>
          </div>
          <div className="mt-4 grid gap-3">
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
      </div>

      {/* achievements — keep but more personal */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faTrophy} className="text-[#F5C16A]" /> Достижения</h3>
          <span className="text-[11px] opacity-40 font-bold">6 • {achievements.filter((a) => a.progress === 100).length} получено</span>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {achievements.map((a) => (
            <SpotlightCard key={a.title} spotlightColor={`${a.color}18` as unknown as `rgba(${number}, ${number}, ${number}, ${number})`} className="!p-0 !bg-transparent !border-0">
              <div className={`relative rounded-2xl border p-3 flex flex-col items-center gap-1.5 text-center h-[112px] justify-center overflow-hidden ${a.progress === 100 ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-[#0f0f0f] border-white/[0.04] opacity-75'}`}>
                {a.rarity === 'epic' && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#a78bfa] shadow-[0_0_8px_#a78bfa]" />}
                <span className="w-8 h-8 rounded-xl grid place-items-center text-[14px] border" style={{ background: `${a.color}14`, borderColor: `${a.color}22`, color: a.color }}>
                  <FontAwesomeIcon icon={a.icon} />
                </span>
                <span className="text-[11px] font-bold leading-tight">{a.title}</span>
                <span className="text-[10px] opacity-40 leading-none">{a.desc}</span>
                {a.progress < 100 ? (
                  <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden mt-1">
                    <div className="h-full rounded-full" style={{ width: `${a.progress}%`, background: a.color }} />
                  </div>
                ) : (
                  <FontAwesomeIcon icon={faStar} className="text-[#F5C16A] text-[10px] mt-1" />
                )}
              </div>
            </SpotlightCard>
          ))}
        </div>
      </div>

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
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5 flex flex-col">
          <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2"><FontAwesomeIcon icon={faPen} className="text-[#F08AB4]" /> Заметка себе</h3>
          <p className="text-[13px] leading-relaxed opacity-60 mt-3 flex-1">“Не гонись за 100% — говори каждый день, даже с ошибками. Через месяц оглянешься и удивишься.”</p>
          <div className="mt-4 flex gap-2">
            <span className="px-3 py-1.5 rounded-full bg-[#F08AB4]/10 border border-[#F08AB4]/20 text-[#F08AB4] text-xs font-bold">#мотивация</span>
            <span className="px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.06] text-xs font-semibold opacity-60">сохранено • сегодня</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
