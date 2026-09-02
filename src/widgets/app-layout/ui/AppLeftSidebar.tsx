import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { motion, AnimatePresence } from 'framer-motion'
import AppLeftSidebarItem from './AppLeftSidebarItem'
import { cn } from '@/shared/lib/cn'
import { faHome, faChartBar, faUser, faGear } from '@fortawesome/free-solid-svg-icons'

interface Props {
  isDesktop: boolean
  isCollapsed: boolean
  isOpen: boolean
  activeId: string
  onSelect: (id: string) => void
}

const menuItems = [
  { id: 'home', label: 'Главная', icon: faHome },
  { id: 'stats', label: 'Статистика', icon: faChartBar },
  { id: 'profile', label: 'Профиль', icon: faUser },
  { id: 'settings', label: 'Настройки', icon: faGear },
]

const tips = [
  'Учите 5 слов в контексте, а не списком — запоминается в 3 раза дольше.',
  'Повтор через 20 минут → через 24 часа — минимум для закрепления.',
  'Говорите вслух даже без собеседника — мозг фиксирует произношение.',
  '10 минут ежедневно эффективнее 70 минут раз в неделю.',
  'Всегда учите фразу целиком, а не отдельное слово.',
]

const TIP_DURATION = 8500

export default function AppLeftSidebar({ isDesktop, isCollapsed, isOpen, activeId, onSelect }: Props) {
  const [tipIndex, setTipIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [paused, setPaused] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(performance.now())

  // tip rotator — strict, not playful, slow
  useEffect(() => {
    if (isCollapsed) return
    const tick = (now: number) => {
      if (paused) {
        startRef.current = now - progress * TIP_DURATION
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const elapsed = now - startRef.current
      const p = Math.min(elapsed / TIP_DURATION, 1)
      setProgress(p)
      if (p >= 1) {
        setTipIndex((i) => (i + 1) % tips.length)
        setProgress(0)
        startRef.current = now
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    startRef.current = performance.now() - progress * TIP_DURATION
    const id = requestAnimationFrame(tick)
    rafRef.current = id
    return () => cancelAnimationFrame(id)
  }, [paused, progress, isCollapsed])

  // reset progress when tip changes manually
  useEffect(() => {
    startRef.current = performance.now()
    setProgress(0)
  }, [tipIndex])

  return (
    <aside
      className={cn('app-sidebar', isCollapsed && 'app-sidebar--collapsed')}
      style={
        isDesktop
          ? { width: isCollapsed ? '5rem' : '16rem' }
          : {
              width: '16rem',
              maxWidth: '85vw',
              transform: isOpen ? 'translateX(0)' : 'translateX(-110%)',
            }
      }
      aria-hidden={!isDesktop && !isOpen ? true : undefined}
      aria-label="Основная навигация"
    >
      <nav className="app-sidebar__nav" aria-label="Разделы">
        {menuItems.map((item) => (
          <AppLeftSidebarItem
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeId === item.id}
            isCollapsed={isDesktop && isCollapsed}
            onSelect={onSelect}
          />
        ))}
      </nav>

      {/* Bottom widget — harmonious, strict, useful */}
      <div className="app-sidebar__bottom">
        {isDesktop && isCollapsed ? (
          // Collapsed — minimal dot + icon
          <div className="app-sidebar__collapsed-tip">
            <motion.span
              className="app-sidebar__collapsed-icon"
              animate={{ rotate: [0, 8, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FontAwesomeIcon icon={faLightbulb} />
            </motion.span>
            <span className="app-sidebar__collapsed-dot" aria-hidden="true" />
          </div>
        ) : (
          <div
            className="app-sidebar__tip-card"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="app-sidebar__tip-header">
              <span className="app-sidebar__tip-eyebrow">Совет дня</span>
              <span className="app-sidebar__tip-counter">
                {tipIndex + 1} / {tips.length}
              </span>
            </div>

            <div className="app-sidebar__tip-body">
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="app-sidebar__tip-text"
                >
                  {tips[tipIndex]}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="app-sidebar__tip-progress">
              <div className="app-sidebar__tip-progress-track">
                <div className="app-sidebar__tip-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="app-sidebar__tip-dots">
                {tips.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Совет ${i + 1}`}
                    className={`app-sidebar__tip-dot ${i === tipIndex ? 'app-sidebar__tip-dot--active' : ''}`}
                    onClick={() => setTipIndex(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
