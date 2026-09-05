// @ts-nocheck
import { NavLink, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faChartBar, faUser, faGear } from '@fortawesome/free-solid-svg-icons'
import { motion } from 'framer-motion'
import { useT } from '@/lib/i18n'

export default function TabBar() {
  const t = useT()
  const tabs = [
    { to: '/', label: t('components.tabbar.home'), icon: faHome },
    { to: '/stats', label: t('components.tabbar.stats'), icon: faChartBar },
    { to: '/profile', label: t('components.tabbar.profile'), icon: faUser },
    { to: '/settings', label: t('components.tabbar.settings'), icon: faGear },
  ]
  const { pathname } = useLocation()
  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname === to)

  return (
    <nav className="tab-bar" aria-label={t('components.tabbar.nav')}>
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
