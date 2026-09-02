import { NavLink, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faFire, faBars, faXmark, faTableColumns, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { motion } from 'framer-motion'

interface AppHeaderProps {
  isDesktop: boolean
  isSidebarCollapsed: boolean
  isMenuOpen: boolean
  isRightOpen: boolean
  onMenuToggle: () => void
  onRightToggle: () => void
}

export default function AppHeader({
  isDesktop,
  isSidebarCollapsed,
  isMenuOpen,
  isRightOpen,
  onMenuToggle,
  onRightToggle,
}: AppHeaderProps) {
  const menuIcon = isDesktop ? (isSidebarCollapsed ? faBars : faXmark) : isMenuOpen ? faXmark : faBars
  const { pathname } = useLocation()
  const titleMap: Record<string, string> = {
    '/': 'Главная',
    '/stats': 'Статистика',
    '/profile': 'Профиль',
    '/settings': 'Настройки',
  }
  const currentTitle = titleMap[pathname] ?? (pathname.startsWith('/stats') ? 'Статистика' : pathname.startsWith('/profile') ? 'Профиль' : 'Страница')

  return (
    <header className="app-header">
      <div className="app-header__inner">
        {/* Left */}
        <div className="app-header__left">
          <motion.button
            type="button"
            className="app-header__burger"
            aria-label={isDesktop ? (isSidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню') : isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={onMenuToggle}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <FontAwesomeIcon icon={menuIcon} />
          </motion.button>

          <NavLink to="/" className="app-header__brand">
            <motion.span
              className="app-header__logo"
              whileHover={{ rotate: 12, scale: 1.06 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            >
              ◈
            </motion.span>
            <span className="app-header__brand-text">
              <span className="app-header__brand-name">Lexio</span>
              <span className="app-header__brand-sub">учим язык • строго</span>
            </span>
          </NavLink>

          {isDesktop && (
            <span className="app-header__divider" aria-hidden="true" />
          )}
          {isDesktop && (
            <div className="app-header__breadcrumb" aria-label="Навигация">
              <span className="app-header__breadcrumb-label">Раздел</span>
              <span className="app-header__breadcrumb-sep">
                <FontAwesomeIcon icon={faChevronRight} />
              </span>
              <motion.span
                key={currentTitle}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="app-header__breadcrumb-current"
              >
                {currentTitle}
              </motion.span>
            </div>
          )}
        </div>

        {/* Right */}
        <div className="app-header__right">
          <motion.button
            type="button"
            className="app-header__search"
            aria-label="Поиск ⌘K"
            onClick={() => window.dispatchEvent(new CustomEvent('lexio:open-palette'))}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="app-header__search-icon">
              <FontAwesomeIcon icon={faMagnifyingGlass} />
            </span>
            <span className="app-header__search-label">Поиск</span>
            <span className="app-header__search-kbd">⌘K</span>
          </motion.button>

          <motion.div
            className="app-header__streak"
            whileHover={{ scale: 1.03 }}
            animate={{ y: [0, -1, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.span
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              <FontAwesomeIcon icon={faFire} />
            </motion.span>
            <span>7 дней</span>
            <span className="app-header__streak-dot" aria-hidden="true" />
          </motion.div>

          <div className="app-header__avatar-wrap">
            <div className="app-header__avatar" aria-label="Профиль">А</div>
            <span className="app-header__avatar-status" aria-hidden="true" />
          </div>

          <motion.button
            type="button"
            className={`app-header__panel-toggle ${isRightOpen ? 'app-header__panel-toggle--active' : ''}`}
            aria-label={isRightOpen ? 'Закрыть панель' : 'Открыть панель'}
            aria-pressed={isRightOpen}
            onClick={onRightToggle}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <FontAwesomeIcon icon={faTableColumns} />
          </motion.button>
        </div>
      </div>
      <div className="app-header__hairline" aria-hidden="true" />
    </header>
  )
}
