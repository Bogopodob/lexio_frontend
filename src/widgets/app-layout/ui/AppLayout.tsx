import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useIsDesktop } from '@/shared/lib/useIsDesktop'
import { cn } from '@/shared/lib/cn'
import AppHeader from './AppHeader'
import AppLeftSidebar from './AppLeftSidebar'
import AppRightSidebar from './AppRightSidebar'
import styles from './app-layout.module.css'

const SIDEBAR_FULL = '16rem'
const SIDEBAR_COLLAPSED = '5rem'
const RIGHT_WIDTH = 380

const routeById: Record<string, string> = {
  home: '/',
  stats: '/stats',
  profile: '/profile',
  settings: '/settings',
}

function getActiveId(pathname: string) {
  if (pathname.startsWith('/stats')) return 'stats'
  if (pathname.startsWith('/profile')) return 'profile'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'home'
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isDesktop = useIsDesktop()
  const location = useLocation()
  const navigate = useNavigate()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('lexio:sidebar-collapsed') === '1'
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRightOpen, setIsRightOpen] = useState(false)

  const activeId = getActiveId(location.pathname)
  const sidebarWidth = isSidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_FULL

  useEffect(() => {
    localStorage.setItem('lexio:sidebar-collapsed', isSidebarCollapsed ? '1' : '0')
  }, [isSidebarCollapsed])

  // close mobile drawer on route change
  useEffect(() => {
    if (!isDesktop) setIsMenuOpen(false)
  }, [location.pathname, isDesktop])

  // lock scroll when mobile drawer open
  useEffect(() => {
    if (!isDesktop && isMenuOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDesktop, isMenuOpen])

  const onMenuToggle = () => {
    if (isDesktop) setIsSidebarCollapsed((v) => !v)
    else setIsMenuOpen((v) => !v)
  }

  const onSelect = (id: string) => {
    const route = routeById[id] ?? '/'
    navigate(route)
    if (!isDesktop) setIsMenuOpen(false)
  }

  const closeAll = () => {
    setIsMenuOpen(false)
    // keep right open? close both for harmony
    if (!isDesktop) setIsRightOpen(false)
  }

  // scroll top on route change (like previous ScrollToTop but for contentScroll)
  useEffect(() => {
    const el = document.getElementById('app-content-scroll')
    if (el) el.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  return (
    <div className={styles.root}>
      <AppHeader
        isDesktop={isDesktop}
        isSidebarCollapsed={isSidebarCollapsed}
        isMenuOpen={isMenuOpen}
        isRightOpen={isRightOpen}
        onMenuToggle={onMenuToggle}
        onRightToggle={() => setIsRightOpen((v) => !v)}
      />

      <div
        className={styles.body}
        style={
          isDesktop && isRightOpen
            ? { transform: `translateX(calc(-${RIGHT_WIDTH}px - 0.75rem))` }
            : undefined
        }
      >
        {/* background placeholder for sidebar to avoid content jump */}
        <div
          className={cn(styles.sidebarBackground, 'max-lg:hidden')}
          style={{ width: isDesktop ? sidebarWidth : undefined }}
          aria-hidden="true"
        />

        {/* mobile overlay */}
        {!isDesktop && (
          <div
            className={cn(styles.drawerOverlay, isMenuOpen && styles.drawerOverlayVisible)}
            onClick={closeAll}
            aria-hidden={!isMenuOpen}
          />
        )}
        {!isDesktop && isRightOpen && (
          <div
            className={cn(styles.drawerOverlay, styles.drawerOverlayVisible)}
            style={{ zIndex: 58 }}
            onClick={() => setIsRightOpen(false)}
            aria-hidden={!isRightOpen}
          />
        )}

        <AppLeftSidebar
          isDesktop={isDesktop}
          isCollapsed={isDesktop && isSidebarCollapsed}
          isOpen={isDesktop || isMenuOpen}
          activeId={activeId}
          onSelect={onSelect}
        />

        <main
          className={styles.mainContent}
          style={{
            marginLeft: isDesktop ? sidebarWidth : 0,
          }}
        >
          <div id="app-content-scroll" className={cn(styles.contentScroll, isRightOpen && !isDesktop && styles.contentScrollBlocked)}>
            <div className={styles.contentBlock}>{children}</div>
          </div>
        </main>
      </div>

      <AppRightSidebar isDesktop={isDesktop} isOpen={isRightOpen} onClose={() => setIsRightOpen(false)} />
    </div>
  )
}
