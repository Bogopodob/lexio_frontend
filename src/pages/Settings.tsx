import { useState } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPalette,
  faVolumeHigh,
  faBell,
  faLanguage,
  faBullseye,
  faShieldHalved,
  faCircleInfo,
  faKeyboard,
  faUser,
  faMoon,
  faSun,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@/context/ThemeContext'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [soundOn, setSoundOn] = useState(true)
  const [notifOn, setNotifOn] = useState(true)
  const [lang, setLang] = useState<'en' | 'es' | 'de'>('en')
  const [goal, setGoal] = useState(20)
  const [voice, setVoice] = useState<'female' | 'male'>('female')

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }} className="w-full flex flex-col gap-4">
      <div>
        <p className="text-[11px] tracking-[0.12em] uppercase font-bold opacity-40">Система • Lexio</p>
        <h1 className="text-[26px] font-black tracking-tight leading-none mt-1">Настройки</h1>
        <p className="text-sm opacity-50">Персонализируй обучение под себя — как в desktop-приложении</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* left nav — как в desktop */}
        <div className="settings-group !mb-0 lg:sticky lg:top-4 h-fit hidden lg:block">
          <h3>Разделы</h3>
          {[
            { icon: faUser, label: 'Профиль', active: false },
            { icon: faLanguage, label: 'Язык', active: true },
            { icon: faBullseye, label: 'Обучение', active: false },
            { icon: faPalette, label: 'Внешний вид', active: false },
            { icon: faVolumeHigh, label: 'Звук', active: false },
            { icon: faBell, label: 'Уведомления', active: false },
            { icon: faShieldHalved, label: 'Приватность', active: false },
          ].map((s) => (
            <div key={s.label} className={`settings-row !py-2.5 ${s.active ? 'opacity-100' : 'opacity-60'}`}>
              <span className="flex items-center gap-2.5"><span className={`w-7 h-7 rounded-lg grid place-items-center text-xs ${s.active ? 'bg-white text-black' : 'bg-white/[0.06] border border-white/[0.06]'}`}><FontAwesomeIcon icon={s.icon} /></span> {s.label}</span>
              {s.active && <span className="w-1.5 h-1.5 rounded-full bg-[#5AD4B5]" />}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div className="settings-group !mb-0">
            <h3><FontAwesomeIcon icon={faLanguage} className="mr-2 opacity-60" /> Язык обучения</h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'en', name: 'English', sub: 'Английский' },
                { id: 'es', name: 'Español', sub: 'Испанский' },
                { id: 'de', name: 'Deutsch', sub: 'Немецкий' },
              ].map((l) => (
                <button key={l.id} onClick={() => setLang(l.id as never)} className={`p-3 rounded-xl border text-left transition-all ${lang === l.id ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'}`}>
                  <div className="text-sm font-black">{l.name}</div>
                  <div className={`text-xs ${lang === l.id ? 'opacity-60' : 'opacity-40'}`}>{l.sub}</div>
                  <div className="text-[11px] opacity-50 mt-1">Русский → {l.name}</div>
                </button>
              ))}
            </div>
            <div className="settings-row">
              <span>Интерфейс</span><span className="settings-row__value">Русский</span>
            </div>
          </div>

          <div className="settings-group !mb-0">
            <h3><FontAwesomeIcon icon={faBullseye} className="mr-2 opacity-60" /> Обучение</h3>
            <div className="settings-row">
              <span className="flex flex-col gap-1"><span>Дневная цель</span><span className="text-xs opacity-40">{goal} слов • ~{Math.round(goal * 1.5)} мин</span></span>
              <span className="flex items-center gap-2">
                <button onClick={() => setGoal((v) => Math.max(5, v - 5))} className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center hover:bg-white/10">−</button>
                <span className="min-w-[36px] text-center font-black tabular-nums">{goal}</span>
                <button onClick={() => setGoal((v) => Math.min(50, v + 5))} className="w-7 h-7 rounded-full bg-white text-black grid place-items-center hover:bg-white/90">+</button>
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full bg-[#5AD4B5] rounded-full transition-all" style={{ width: `${(goal / 50) * 100}%` }} />
            </div>
            <div className="settings-row">
              <span>Напоминание</span><span className="settings-row__value">09:00 • каждый день</span>
            </div>
            <div className="settings-row">
              <span>Сложность</span><span className="settings-row__value">Адаптивная</span>
            </div>
          </div>

          <div className="settings-group !mb-0">
            <h3><FontAwesomeIcon icon={faPalette} className="mr-2 opacity-60" /> Внешний вид</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => theme !== 'dark' && toggleTheme()} className={`p-3 rounded-xl border text-left flex items-center gap-3 ${theme === 'dark' ? 'bg-white text-black border-white' : 'bg-white/[0.03] border-white/[0.06] opacity-60'}`}>
                <span className="w-8 h-8 rounded-lg bg-black text-white grid place-items-center"><FontAwesomeIcon icon={faMoon} /></span>
                <span><span className="block text-sm font-bold leading-none">Тёмная</span><span className="block text-xs opacity-60">по умолчанию</span></span>
                {theme === 'dark' && <span className="ml-auto w-2 h-2 rounded-full bg-[#5AD4B5]" />}
              </button>
              <button onClick={() => theme !== 'light' && toggleTheme()} className={`p-3 rounded-xl border text-left flex items-center gap-3 ${theme === 'light' ? 'bg-white text-black border-white shadow' : 'bg-white/[0.03] border-white/[0.06] opacity-60'}`}>
                <span className="w-8 h-8 rounded-lg bg-white border border-black/10 text-black grid place-items-center"><FontAwesomeIcon icon={faSun} /></span>
                <span><span className="block text-sm font-bold leading-none">Светлая</span><span className="block text-xs opacity-60">скоро</span></span>
                {theme === 'light' && <span className="ml-auto w-2 h-2 rounded-full bg-[#5AD4B5]" />}
              </button>
            </div>
            <div className="settings-row">
              <span>Акцент</span>
              <span className="flex gap-1.5">
                <span className="w-6 h-6 rounded-full bg-[#5AD4B5] border-2 border-white shadow" />
                <span className="w-6 h-6 rounded-full bg-[#5B74FF] border border-white/10" />
                <span className="w-6 h-6 rounded-full bg-[#F08AB4] border border-white/10" />
              </span>
            </div>
            <div className="settings-row">
              <span>Плотность</span><span className="settings-row__value">Комфортно • 1.0×</span>
            </div>
          </div>

          <div className="settings-group !mb-0">
            <h3><FontAwesomeIcon icon={faVolumeHigh} className="mr-2 opacity-60" /> Звук и озвучка</h3>
            <div className="settings-row">
              <span>Озвучка</span>
              <span className="flex gap-1 p-1 rounded-full bg-black/20 border border-white/[0.04]">
                <button onClick={() => setVoice('female')} className={`px-3 py-1 rounded-full text-xs font-bold ${voice === 'female' ? 'bg-white text-black' : 'text-white/60'}`}>Женский</button>
                <button onClick={() => setVoice('male')} className={`px-3 py-1 rounded-full text-xs font-bold ${voice === 'male' ? 'bg-white text-black' : 'text-white/60'}`}>Мужской</button>
              </span>
            </div>
            <div className="settings-row">
              <span>Скорость</span><span className="settings-row__value">0.92× • норма</span>
            </div>
            <div className="settings-row">
              <span>Звук интерфейса</span>
              <button type="button" role="switch" aria-checked={soundOn} onClick={() => setSoundOn((v) => !v)} className={`settings-switch ${soundOn ? 'settings-switch--on' : ''}`}><span className="settings-switch__thumb" /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const u = new SpeechSynthesisUtterance('Hello from Lexio'); u.lang = 'en-US'; u.rate = 0.92; speechSynthesis.speak(u) }} className="flex-1 py-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-xs font-bold hover:bg-white/[0.08]">▶ Тест голоса</button>
              <span className="flex-1 py-2 rounded-xl bg-[#5AD4B5]/10 border border-[#5AD4B5]/20 text-[#5AD4B5] text-xs font-bold grid place-items-center">L — озвучить</span>
            </div>
          </div>

          <div className="settings-group !mb-0">
            <h3><FontAwesomeIcon icon={faBell} className="mr-2 opacity-60" /> Уведомления</h3>
            <div className="settings-row">
              <span>Ежедневно 09:00</span>
              <button type="button" role="switch" aria-checked={notifOn} onClick={() => setNotifOn((v) => !v)} className={`settings-switch ${notifOn ? 'settings-switch--on' : ''}`}><span className="settings-switch__thumb" /></button>
            </div>
            <div className="settings-row">
              <span>Напоминание о серии</span><span className="settings-row__value">за 2 ч до сна</span>
            </div>
          </div>

          <div className="settings-group !mb-0">
            <h3><FontAwesomeIcon icon={faKeyboard} className="mr-2 opacity-60" /> Быстрый доступ</h3>
            <div className="settings-row"><span>Поиск</span><span className="settings-row__hint">⌘K / Ctrl+K</span></div>
            <div className="settings-row"><span>Переворот карточки</span><span className="settings-row__hint">Клик / Enter</span></div>
            <div className="settings-row"><span>Озвучить</span><span className="settings-row__hint">L</span></div>
          </div>

          <div className="settings-group !mb-0">
            <h3><FontAwesomeIcon icon={faShieldHalved} className="mr-2 opacity-60" /> Приватность</h3>
            <div className="settings-row"><span>Аналитика</span><span className="settings-row__value">только локально</span></div>
            <div className="settings-row"><span>Сбросить прогресс</span><button className="px-3 py-1 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-xs font-bold hover:bg-[#f43f5e]/15">Сбросить</button></div>
          </div>

          <div className="settings-group !mb-0">
            <h3><FontAwesomeIcon icon={faCircleInfo} className="mr-2 opacity-60" /> О приложении</h3>
            <div className="settings-row"><span>Версия</span><span className="settings-row__value">0.0.1 • qwicki</span></div>
            <div className="settings-row"><span>Сборка</span><span className="settings-row__value">5173 • /app/</span></div>
            <div className="text-xs opacity-40 mt-2">Lexio — учим язык строго, без игр. ⌘K для поиска.</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
