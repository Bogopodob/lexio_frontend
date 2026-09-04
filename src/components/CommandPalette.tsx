// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHome,
  faChartBar,
  faUser,
  faGear,
  faMagnifyingGlass,
  faPlay,
  faPalette,
  faVolumeHigh,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '@/context/ThemeContext'
import { matchesShortcut, useShortcuts } from '@/lib/shortcuts'

interface Command {
  id: string
  label: string
  hint?: string
  icon: typeof faHome
  action: () => void
  keywords?: string
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { toggleTheme, theme } = useTheme()

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'home',
        label: 'Главная',
        hint: 'Перейти на главную',
        icon: faHome,
        keywords: 'главная home dashboard',
        action: () => navigate('/'),
      },
      {
        id: 'stats',
        label: 'Статистика',
        hint: 'Ваш прогресс',
        icon: faChartBar,
        keywords: 'статистика stats progress',
        action: () => navigate('/stats'),
      },
      {
        id: 'profile',
        label: 'Профиль',
        hint: 'Достижения и уровень',
        icon: faUser,
        keywords: 'профиль profile',
        action: () => navigate('/profile'),
      },
      {
        id: 'settings',
        label: 'Настройки',
        hint: 'Язык, уведомления',
        icon: faGear,
        keywords: 'настройки settings',
        action: () => navigate('/settings'),
      },
      {
        id: 'lesson',
        label: 'Продолжить урок',
        hint: '12 из 20 слов',
        icon: faPlay,
        keywords: 'урок lesson continue',
        action: () => navigate('/'),
      },
      {
        id: 'theme',
        label: theme === 'dark' ? 'Светлая тема' : 'Тёмная тема',
        hint: 'Переключить оформление',
        icon: faPalette,
        keywords: 'тема theme dark light',
        action: () => toggleTheme(),
      },
      {
        id: 'listen',
        label: 'Озвучить фразу',
        hint: 'Where is the nearest metro?',
        icon: faVolumeHigh,
        keywords: 'озвучить listen speech',
        action: () => {
          if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance('Where is the nearest metro?')
            u.lang = 'en-US'
            u.rate = 0.92
            window.speechSynthesis.speak(u)
          }
        },
      },
    ],
    [navigate, theme, toggleTheme],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.hint && c.hint.toLowerCase().includes(q)) ||
        (c.keywords && c.keywords.toLowerCase().includes(q)),
    )
  }, [query, commands])

  useEffect(() => {
    setSelected(0)
  }, [query])

  const { bindings } = useShortcuts()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isSearch = matchesShortcut(e, bindings.search)
      const isSlash = e.key === '/' && !open && !(e.target instanceof HTMLInputElement)
      if (isSearch || isSlash) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    const custom = () => setOpen(true)
    window.addEventListener('keydown', handler)
    window.addEventListener('lexio:open-palette' as unknown as keyof WindowEventMap, custom as EventListener)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('lexio:open-palette' as unknown as keyof WindowEventMap, custom as EventListener)
    }
  }, [open, bindings.search])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 30)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleSelect = (cmd: Command) => {
    setOpen(false)
    setTimeout(() => cmd.action(), 80)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => (s + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) => (s - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filtered[selected]
      if (cmd) handleSelect(cmd)
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="command-palette__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="command-palette"
              role="dialog"
              aria-modal="true"
              aria-label="Быстрый поиск"
              initial={{ opacity: 0, y: 12, scale: 0.97, x: '-50%' } as never}
              animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' } as never}
              exit={{ opacity: 0, y: 8, scale: 0.98, x: '-50%' } as never}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              style={{ left: '50%', x: '-50%' } as never}
            >
              <div className="command-palette__input-wrap !py-3 !px-3 !gap-3 !bg-white/[0.02] !border-white/[0.06]">
                <span className="w-8 h-8 rounded-xl bg-white text-black grid place-items-center shrink-0">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[11px]" />
                </span>
                <input
                  ref={inputRef}
                  className="command-palette__input !text-[15px] !font-semibold"
                  placeholder="Что ищем? Главная, фразы, настройки…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  aria-label="Поиск команд"
                />
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.06] border border-white/[0.06] text-[11px] font-bold opacity-60">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5AD4B5] animate-pulse" /> ESC
                </span>
              </div>

              <div className="command-palette__list !p-2 !gap-1 !max-h-[340px]" role="listbox">
                {filtered.length === 0 ? (
                  <div className="command-palette__empty !py-10">
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center mx-auto mb-3">?</div>
                    Ничего не найдено — попробуйте «урок» или «профиль»
                  </div>
                ) : (
                  filtered.map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      role="option"
                      aria-selected={idx === selected}
                      className={`command-palette__item !py-2.5 !px-3 !rounded-xl !gap-3 ${idx === selected ? 'command-palette__item--active !bg-white/[0.08] !text-white !border-white/[0.10] !py-3' : ''}`}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => handleSelect(cmd)}
                    >
                      <span className={`command-palette__item-icon !w-9 !h-9 !rounded-xl !text-[13px] border ${idx === selected ? '!bg-[#5AD4B5] !text-black !border-[#5AD4B5]' : ''}`}>
                        <FontAwesomeIcon icon={cmd.icon} />
                      </span>
                      <span className="command-palette__item-text !gap-0.5">
                        <strong className="!text-[13px] !font-black !leading-none">{cmd.label}</strong>
                        {cmd.hint && <span className={`!text-xs ${idx === selected ? '!opacity-60 !text-white' : ''}`}>{cmd.hint}</span>}
                      </span>
                      <span className={`ml-auto w-6 h-6 rounded-full grid place-items-center text-[10px] transition-all border ${idx === selected ? 'bg-[#5AD4B5] text-black border-[#5AD4B5] opacity-100' : 'bg-white/[0.06] border-white/[0.06] text-white/40 opacity-60'}`}>
                        <FontAwesomeIcon icon={faArrowRight} />
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="command-palette__footer !bg-white/[0.02] !border-white/[0.06] !py-2.5 !px-3 !gap-3 !text-[11px]">
                <span className="hidden sm:inline-flex items-center gap-1.5"><kbd className="!px-1.5 !py-0.5 !bg-white/[0.06] !border-white/[0.06] !text-[10px]">↑↓</kbd> выбор</span>
                <span className="inline-flex items-center gap-1.5"><kbd className="!px-1.5 !py-0.5 !bg-[#5AD4B5] !text-black !border-[#5AD4B5] !text-[10px]">↵</kbd> открыть</span>
                <span className="hidden sm:inline-flex items-center gap-1.5"><kbd className="!px-1.5 !py-0.5 !bg-white/[0.06] !border-white/[0.06] !text-[10px]">ESC</kbd> закрыть</span>
                <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 opacity-40"><span className="w-1.5 h-1.5 rounded-full bg-[#5AD4B5]" /> {filtered.length} команд</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
