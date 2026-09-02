import { NavLink } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faFire, faBars, faXmark, faTableColumns } from '@fortawesome/free-solid-svg-icons'

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

  return (
    <header className="app-header">
      <div className="app-header__inner">
        {/* Left */}
        <div className="app-header__left">
          <button
            type="button"
            className="app-header__burger"
            aria-label={isDesktop ? (isSidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню') : isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            onClick={onMenuToggle}
          >
            <FontAwesomeIcon icon={menuIcon} />
          </button>

          <NavLink to="/" className="app-header__brand">
            <span className="app-header__logo">◈</span>
            <span className="app-header__brand-text">
              <span className="app-header__brand-name">Lexio</span>
              <span className="app-header__brand-sub">учим язык • строго</span>
            </span>
          </NavLink>
        </div>

        {/* Center — placeholder for future breadcrumbs, keep minimal */}
        <div className="app-header__center" aria-hidden="true" />

        {/* Right */}
        <div className="app-header__right">
          <button
            type="button"
            className="app-header__search"
            aria-label="Поиск ⌘K"
            onClick={() => window.dispatchEvent(new CustomEvent('lexio:open-palette'))}
          >
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span className="app-header__search-label">Поиск</span>
            <span className="app-header__search-kbd">⌘K</span>
          </button>

          <div className="app-header__streak">
            <FontAwesomeIcon icon={faFire} />
            <span>7 дней</span>
          </div>

          <div className="app-header__avatar" aria-label="Профиль">А</div>

          <button
            type="button"
            className={`app-header__panel-toggle ${isRightOpen ? 'app-header__panel-toggle--active' : ''}`}
            aria-label={isRightOpen ? 'Закрыть панель' : 'Открыть панель'}
            aria-pressed={isRightOpen}
            onClick={onRightToggle}
          >
            <FontAwesomeIcon icon={faTableColumns} />
          </button>
        </div>
      </div>
      <div className="app-header__hairline" aria-hidden="true" />
    </header>
  )
}
