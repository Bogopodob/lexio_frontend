import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faFire, faBars, faXmark, faTableColumns, faChevronRight, faGhost, faRightToBracket, faUser, faArrowRightFromBracket } from '@fortawesome/free-solid-svg-icons'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '@/context/AuthContext'

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
  const navigate = useNavigate()
  const { user, ready, logout } = useAuth()
  const displayName = user?.name?.trim() || user?.email || 'Гость'
  const avatarLetter = (displayName[0] || 'Г').toUpperCase()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/')
  }
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

          {!ready ? null : !user ? (
            <div className="app-header__guest">
              <motion.button
                type="button"
                className="app-header__guest-avatar"
                aria-label="Гостевой режим — войти"
                title="Ты в гостевом режиме. Нажми, чтобы войти."
                onClick={() => navigate('/auth')}
                whileHover={{ scale: 1.06, rotate: -4 }}
                whileTap={{ scale: 0.94 }}
              >
                <FontAwesomeIcon icon={faGhost} />
                <span className="app-header__guest-ping" aria-hidden="true" />
              </motion.button>
              <div className="app-header__guest-text">
                <span className="app-header__guest-name">Гость</span>
                <button
                  type="button"
                  className="app-header__guest-login"
                  onClick={() => navigate('/auth')}
                >
                  <FontAwesomeIcon icon={faRightToBracket} />
                  <span>Войти</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="app-header__avatar-wrap" ref={menuRef}>
              <button
                type="button"
                className="app-header__avatar-btn"
                aria-label={`Меню: ${displayName}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title={displayName}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <div className="app-header__avatar">{avatarLetter}</div>
                <span className="app-header__avatar-status" aria-hidden="true" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="app-header__menu"
                    role="menu"
                  >
                    <div className="app-header__menu-head">
                      <div className="app-header__menu-avatar">{avatarLetter}</div>
                      <div className="app-header__menu-id">
                        <span className="app-header__menu-name">{displayName}</span>
                        {user?.email && user?.name?.trim() && (
                          <span className="app-header__menu-email">{user.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="app-header__menu-sep" aria-hidden="true" />
                    <button
                      type="button"
                      role="menuitem"
                      className="app-header__menu-item"
                      onClick={() => {
                        setMenuOpen(false)
                        navigate('/profile')
                      }}
                    >
                      <FontAwesomeIcon icon={faUser} />
                      <span>Профиль</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="app-header__menu-item app-header__menu-item--danger"
                      onClick={handleLogout}
                    >
                      <FontAwesomeIcon icon={faArrowRightFromBracket} />
                      <span>Выйти</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

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
