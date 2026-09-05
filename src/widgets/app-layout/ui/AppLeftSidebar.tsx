import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { motion, AnimatePresence } from 'framer-motion'
import AppLeftSidebarItem from './AppLeftSidebarItem'
import { cn } from '@/shared/lib/cn'
import { useT } from '@/lib/i18n'
import { faHome, faChartBar, faGear } from '@fortawesome/free-solid-svg-icons'

interface Props {
  isDesktop: boolean
  isCollapsed: boolean
  isOpen: boolean
  activeId: string
  onSelect: (id: string) => void
}

interface SidebarItem {
  id: string
  label: string
  icon: typeof faHome
  badge?: string
}

const TIP_DURATION = 8500

export default function AppLeftSidebar({ isDesktop, isCollapsed, isOpen, activeId, onSelect }: Props) {
  const t = useT()

  const sections: { label: string; items: SidebarItem[] }[] = [
    {
      label: t('widgets.sidebar.nav'),
      items: [
        { id: 'home', label: t('widgets.sidebar.home'), icon: faHome, badge: '12/20' },
        { id: 'stats', label: t('widgets.sidebar.stats'), icon: faChartBar, badge: '92%' },
      ],
    },
    {
      label: t('widgets.sidebar.account'),
      items: [
        { id: 'settings', label: t('widgets.sidebar.settings'), icon: faGear },
      ],
    },
  ]

  const tips = [
    t('widgets.sidebar.tips.0'),
    t('widgets.sidebar.tips.1'),
    t('widgets.sidebar.tips.2'),
    t('widgets.sidebar.tips.3'),
    t('widgets.sidebar.tips.4'),
  ]

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
      aria-label={t('widgets.sidebar.mainNav')}
    >
      <nav className="app-sidebar__nav" aria-label={t('widgets.sidebar.sections')}>
        {sections.map((section) => (
          <div key={section.label} className="app-sidebar__section">
            {!isCollapsed && <div className="app-sidebar__section-label">{section.label}</div>}
            {section.items.map((item) => (
              <AppLeftSidebarItem
                key={item.id}
                id={item.id}
                label={item.label}
                icon={item.icon}
                badge={item.badge}
                isActive={activeId === item.id}
                isCollapsed={isDesktop && isCollapsed}
                onSelect={onSelect}
              />
            ))}
          </div>
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
              <span className="app-sidebar__tip-eyebrow">{t('widgets.sidebar.tipOfDay')}</span>
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
                    aria-label={t('widgets.sidebar.tipAria', { n: i + 1 })}
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
