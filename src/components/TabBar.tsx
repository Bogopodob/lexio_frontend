// @ts-nocheck
import { NavLink, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faChartBar, faUser, faGear } from '@fortawesome/free-solid-svg-icons'
import { motion } from 'framer-motion'

const tabs = [
  { to: '/', label: 'Главная', icon: faHome },
  { to: '/stats', label: 'Статистика', icon: faChartBar },
  { to: '/profile', label: 'Профиль', icon: faUser },
  { to: '/settings', label: 'Настройки', icon: faGear },
]

export default function TabBar() {
  const { pathname } = useLocation()
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname === to)

  return (
    <nav className="tab-bar" aria-label="Мобильная навигация">
      {tabs.map((tab) => {
        const active = isActive(tab.to)
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={`tab-bar__link ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            {active && (
              <motion.span
                layoutId="tab-indicator"
                className="tab-bar__indicator"
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 16,
                  background: 'rgba(90,212,181,0.12)',
                  zIndex: 0,
                }}
              />
            )}
            <span className="tab-bar__icon" style={{ position: 'relative', zIndex: 1 }}>
              <FontAwesomeIcon icon={tab.icon} />
            </span>
            <span className="tab-bar__label" style={{ position: 'relative', zIndex: 1 }}>
              {tab.label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
