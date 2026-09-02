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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      const isSlash = e.key === '/' && !open && !(e.target instanceof HTMLInputElement)
      if (isModK || isSlash) {
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
  }, [open])

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
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <div className="command-palette__input-wrap">
                <FontAwesomeIcon icon={faMagnifyingGlass} className="command-palette__search-icon" />
                <input
                  ref={inputRef}
                  className="command-palette__input"
                  placeholder="Поиск — команды, страницы, фразы…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  aria-label="Поиск команд"
                />
                <span className="command-palette__kbd">ESC</span>
              </div>

              <div className="command-palette__list" role="listbox">
                {filtered.length === 0 ? (
                  <div className="command-palette__empty">Ничего не найдено — попробуйте «урок» или «профиль»</div>
                ) : (
                  filtered.map((cmd, idx) => (
                    <button
                      key={cmd.id}
                      role="option"
                      aria-selected={idx === selected}
                      className={`command-palette__item ${idx === selected ? 'command-palette__item--active' : ''}`}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => handleSelect(cmd)}
                    >
                      <span className="command-palette__item-icon">
                        <FontAwesomeIcon icon={cmd.icon} />
                      </span>
                      <span className="command-palette__item-text">
                        <strong>{cmd.label}</strong>
                        {cmd.hint && <span>{cmd.hint}</span>}
                      </span>
                      <FontAwesomeIcon icon={faArrowRight} className="command-palette__item-arrow" />
                    </button>
                  ))
                )}
              </div>

              <div className="command-palette__footer">
                <span>
                  <kbd>↑↓</kbd> навигация
                </span>
                <span>
                  <kbd>↵</kbd> выбрать
                </span>
                <span>
                  <kbd>⌘K</kbd> открыть
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
