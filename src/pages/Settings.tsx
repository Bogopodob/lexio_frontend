import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPalette,
  faVolumeHigh,
  faLanguage,
  faShieldHalved,
  faCircleInfo,
  faKeyboard,
  faMoon,
  faSun,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@/context/ThemeContext'
import { useLocale } from '@/context/LocaleContext'
import { useT } from '@/lib/i18n'
import {
  DEFAULT_SHORTCUTS,
  SHORTCUT_META,
  bindingFromEvent,
  formatBinding,
  useShortcuts,
  type ShortcutId,
} from '@/lib/shortcuts'

const SECTIONS = [
  { id: 'lang', labelKey: 'settings.nav.lang', icon: faLanguage },
  { id: 'appearance', labelKey: 'settings.nav.appearance', icon: faPalette },
  { id: 'sound', labelKey: 'settings.nav.sound', icon: faVolumeHigh },
  { id: 'shortcuts', labelKey: 'settings.nav.shortcuts', icon: faKeyboard },
  { id: 'privacy', labelKey: 'settings.nav.privacy', icon: faShieldHalved },
  { id: 'about', labelKey: 'settings.nav.about', icon: faCircleInfo },
] as const

const SHORTCUT_IDS = Object.keys(SHORTCUT_META) as ShortcutId[]

function ShortcutRows() {
  const t = useT()
  const { bindings, setBinding, resetBindings } = useShortcuts()
  const [capturing, setCapturing] = useState<ShortcutId | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  useEffect(() => {
    if (!capturing) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setCapturing(null)
        setConflict(null)
        return
      }
      const binding = bindingFromEvent(e)
      if (!binding) return
      const takenBy = SHORTCUT_IDS.find((id) => id !== capturing && bindings[id] === binding)
      if (takenBy) {
        setConflict(t('settings.shortcuts.conflict', { label: t(SHORTCUT_META[takenBy].labelKey) }))
        return
      }
      setBinding(capturing, binding)
      setCapturing(null)
      setConflict(null)
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [capturing, bindings, setBinding, t])

  const isDefault = SHORTCUT_IDS.every((id) => bindings[id] === DEFAULT_SHORTCUTS[id])

  return (
    <>
      {SHORTCUT_IDS.map((id) => (
        <div className="settings-row" key={id}>
          <span className="flex flex-col gap-0.5">
            <span>{t(SHORTCUT_META[id].labelKey)}</span>
            <span className="text-xs opacity-40">{t(SHORTCUT_META[id].hintKey)}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setConflict(null)
              setCapturing(capturing === id ? null : id)
            }}
            className={`settings-kbd ${capturing === id ? 'settings-kbd--capturing' : ''}`}
            aria-label={t('settings.shortcuts.changeAria', { label: t(SHORTCUT_META[id].labelKey) })}
          >
            {capturing === id ? t('settings.shortcuts.pressNew') : formatBinding(bindings[id])}
          </button>
        </div>
      ))}
      {conflict && <div className="text-xs font-bold text-[#F5C16A] -mt-1">{conflict}</div>}
      {!isDefault && (
        <button type="button" onClick={() => resetBindings()} className="mt-1 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity">
          {t('settings.shortcuts.reset')}
        </button>
      )}
    </>
  )
}

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const { locale, setLocale } = useLocale()
  const t = useT()
  const [soundOn, setSoundOn] = useState(true)
  const [voice, setVoice] = useState<'female' | 'male'>('female')
  const [active, setActive] = useState<string>('lang')
  const refs = useRef<Record<string, HTMLElement | null>>({})

  const scrollTo = (id: string) => {
    const el = refs.current[id]
    const scroller = document.getElementById('app-content-scroll') as HTMLElement | null
    if (el && scroller) {
      const top = el.offsetTop - 12
      scroller.scrollTo({ top, behavior: 'smooth' })
    } else {
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setActive(id)
  }

  useEffect(() => {
    const scroller = document.getElementById('app-content-scroll')
    if (!scroller) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target?.id) setActive(visible[0].target.id)
      },
      { root: scroller, rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    )
    Object.values(refs.current).forEach((el) => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }} className="w-full flex flex-col gap-4">
      <div>
        <p className="text-[11px] tracking-[0.12em] uppercase font-bold opacity-40">{t('settings.header.eyebrow')}</p>
        <h1 className="text-[26px] font-black tracking-tight leading-none mt-1">{t('settings.header.title')}</h1>
        <p className="text-sm opacity-50">{t('settings.header.sub')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* left nav — клик скроллит */}
        <div className="settings-group !mb-0 lg:sticky lg:top-4 h-fit hidden lg:block">
          <h3>{t('settings.nav.title')}</h3>
          {SECTIONS.map((s) => {
            const isActive = active === s.id
            return (
              <button key={s.id} onClick={() => scrollTo(s.id)} className={`settings-row !py-2.5 w-full text-left ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                <span className="flex items-center gap-2.5"><span className={`w-7 h-7 rounded-lg grid place-items-center text-xs border ${isActive ? 'bg-[#5AD4B5]/15 border-[#5AD4B5]/30 text-[#5AD4B5]' : 'bg-white/[0.06] border border-white/[0.06] text-white/60'}`}><FontAwesomeIcon icon={s.icon} /></span> {t(s.labelKey)}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#5AD4B5] animate-pulse" />}
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <div ref={(el) => { refs.current['lang'] = el }} id="lang" className="settings-group !mb-0 scroll-mt-4">
            <h3><FontAwesomeIcon icon={faLanguage} className="mr-2 opacity-60" /> {t('settings.lang.title')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'ru', name: 'Русский', sub: t('settings.lang.ruSub') },
                { id: 'en', name: 'English', sub: t('settings.lang.enSub') },
              ].map((l) => (
                <button key={l.id} onClick={() => setLocale(l.id as 'ru' | 'en')} className={`p-3 rounded-xl border text-left transition-all ${locale === l.id ? 'bg-[#5AD4B5]/10 border-[#5AD4B5]/30 text-[#5AD4B5]' : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] text-white'}`}>
                  <div className="text-sm font-black flex items-center gap-2">
                    {l.name}
                  </div>
                  <div className={`text-xs ${locale === l.id ? 'opacity-80' : 'opacity-40'}`}>{l.sub}</div>
                </button>
              ))}
            </div>
            <div className="settings-row">
              <span>{t('settings.lang.studyLang')}</span><span className="settings-row__value">{t('settings.lang.studyLangValue')}</span>
            </div>
          </div>

          <div ref={(el) => { refs.current['appearance'] = el }} id="appearance" className="settings-group !mb-0 scroll-mt-4">
            <h3><FontAwesomeIcon icon={faPalette} className="mr-2 opacity-60" /> {t('settings.appearance.title')}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => theme !== 'dark' && toggleTheme()} className={`p-3 rounded-xl border text-left flex items-center gap-3 ${theme === 'dark' ? 'bg-[#5AD4B5]/10 border-[#5AD4B5]/30 text-[#5AD4B5]' : 'bg-white/[0.03] border-white/[0.06] opacity-60 hover:opacity-100'}`}>
                <span className={`w-8 h-8 rounded-lg grid place-items-center ${theme === 'dark' ? 'bg-[#5AD4B5] text-black' : 'bg-black text-white'}`}><FontAwesomeIcon icon={faMoon} /></span>
                <span><span className="block text-sm font-bold leading-none">{t('settings.appearance.dark')}</span><span className="block text-xs opacity-60">{t('settings.appearance.darkSub')}</span></span>
                {theme === 'dark' && <span className="ml-auto w-2 h-2 rounded-full bg-[#5AD4B5] animate-pulse" />}
              </button>
              <button onClick={() => theme !== 'light' && toggleTheme()} className={`p-3 rounded-xl border text-left flex items-center gap-3 ${theme === 'light' ? 'bg-[#5AD4B5]/10 border-[#5AD4B5]/30 text-[#5AD4B5]' : 'bg-white/[0.03] border-white/[0.06] opacity-60 hover:opacity-100'}`}>
                <span className={`w-8 h-8 rounded-lg grid place-items-center ${theme === 'light' ? 'bg-[#5AD4B5] text-black' : 'bg-white border border-black/10 text-black'}`}><FontAwesomeIcon icon={faSun} /></span>
                <span><span className="block text-sm font-bold leading-none">{t('settings.appearance.light')}</span><span className="block text-xs opacity-60">{t('settings.appearance.lightSub')}</span></span>
                {theme === 'light' && <span className="ml-auto w-2 h-2 rounded-full bg-[#5AD4B5] animate-pulse" />}
              </button>
            </div>
            <div className="settings-row">
              <span>{t('settings.appearance.accent')}</span>
              <span className="flex gap-1.5">
                <span className="w-6 h-6 rounded-full bg-[#5AD4B5] border-2 border-white shadow" />
                <span className="w-6 h-6 rounded-full bg-[#5B74FF] border border-white/10" />
                <span className="w-6 h-6 rounded-full bg-[#F08AB4] border border-white/10" />
              </span>
            </div>
            <div className="settings-row">
              <span>{t('settings.appearance.density')}</span><span className="settings-row__value">{t('settings.appearance.densityValue')}</span>
            </div>
          </div>

          <div ref={(el) => { refs.current['sound'] = el }} id="sound" className="settings-group !mb-0 scroll-mt-4">
            <h3><FontAwesomeIcon icon={faVolumeHigh} className="mr-2 opacity-60" /> {t('settings.sound.title')}</h3>
            <div className="settings-row">
              <span>{t('settings.sound.voice')}</span>
              <span className="flex gap-1 p-1 rounded-full bg-black/20 border border-white/[0.04]">
                <button onClick={() => setVoice('female')} className={`px-3 py-1 rounded-full text-xs font-bold border ${voice === 'female' ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-transparent border-transparent text-white/60 hover:text-white'}`}>{t('settings.sound.female')}</button>
                <button onClick={() => setVoice('male')} className={`px-3 py-1 rounded-full text-xs font-bold border ${voice === 'male' ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]' : 'bg-transparent border-transparent text-white/60 hover:text-white'}`}>{t('settings.sound.male')}</button>
              </span>
            </div>
            <div className="settings-row">
              <span>{t('settings.sound.speed')}</span><span className="settings-row__value">{t('settings.sound.speedValue')}</span>
            </div>
            <div className="settings-row">
              <span>{t('settings.sound.uiSound')}</span>
              <button type="button" role="switch" aria-checked={soundOn} onClick={() => setSoundOn((v) => !v)} className={`settings-switch ${soundOn ? 'settings-switch--on' : ''}`}><span className="settings-switch__thumb" /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const u = new SpeechSynthesisUtterance('Hello from Lexio'); u.lang = 'en-US'; u.rate = 0.92; speechSynthesis.speak(u) }} className="flex-1 py-2 rounded-xl bg-white/[0.06] border border-white/[0.06] text-xs font-bold hover:bg-white/[0.08]">{t('settings.sound.testVoice')}</button>
              <span className="flex-1 py-2 rounded-xl bg-[#5AD4B5]/10 border border-[#5AD4B5]/20 text-[#5AD4B5] text-xs font-bold grid place-items-center">{t('settings.sound.speakHint')}</span>
            </div>
          </div>

          <div ref={(el) => { refs.current['shortcuts'] = el }} id="shortcuts" className="settings-group !mb-0 scroll-mt-4">
            <h3><FontAwesomeIcon icon={faKeyboard} className="mr-2 opacity-60" /> {t('settings.shortcuts.title')}</h3>
            <ShortcutRows />
            <div className="text-xs opacity-40 mt-2">{t('settings.shortcuts.hint')}</div>
          </div>

          <div ref={(el) => { refs.current['privacy'] = el }} id="privacy" className="settings-group !mb-0 scroll-mt-4">
            <h3><FontAwesomeIcon icon={faShieldHalved} className="mr-2 opacity-60" /> {t('settings.privacy.title')}</h3>
            <div className="settings-row"><span>{t('settings.privacy.analytics')}</span><span className="settings-row__value">{t('settings.privacy.analyticsValue')}</span></div>
            <div className="settings-row"><span>{t('settings.privacy.resetProgress')}</span><button className="px-3 py-1 rounded-full bg-[#f43f5e]/10 border border-[#f43f5e]/20 text-[#f43f5e] text-xs font-bold hover:bg-[#f43f5e]/15">{t('settings.privacy.resetBtn')}</button></div>
          </div>

          <div ref={(el) => { refs.current['about'] = el }} id="about" className="settings-group !mb-0 scroll-mt-4">
            <h3><FontAwesomeIcon icon={faCircleInfo} className="mr-2 opacity-60" /> {t('settings.about.title')}</h3>
            <div className="settings-row"><span>{t('settings.about.version')}</span><span className="settings-row__value">{t('settings.about.versionValue')}</span></div>
            <div className="settings-row"><span>{t('settings.about.build')}</span><span className="settings-row__value">{t('settings.about.buildValue')}</span></div>
            <div className="text-xs opacity-40 mt-2">{t('settings.about.text')}</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
