import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

interface Props {
  id: string
  label: string
  icon: IconDefinition
  isActive: boolean
  isCollapsed: boolean
  onSelect: (id: string) => void
}

export default function AppLeftSidebarItem({ id, label, icon, isActive, isCollapsed, onSelect }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [showPopover, setShowPopover] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const handleClick = () => {
    if (isCollapsed) {
      // show popover briefly then navigate
      if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
      setShowPopover(true)
      // delay navigation to show popover? For strict, navigate immediately and close popover
      setTimeout(() => setShowPopover(false), 800)
    }
    onSelect(id)
  }

  const handleMouseEnter = () => {
    if (isCollapsed && btnRef.current) {
      setRect(btnRef.current.getBoundingClientRect())
      setShowPopover(true)
    }
  }
  const handleMouseLeave = () => setShowPopover(false)

  // close on scroll/resize
  useEffect(() => {
    if (!showPopover) return
    const close = () => setShowPopover(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [showPopover])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={isCollapsed ? label : undefined}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`app-sidebar__item ${isActive ? 'app-sidebar__item--active' : ''} ${isCollapsed ? 'app-sidebar__item--collapsed' : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {isActive && <span className="app-sidebar__active-bar" aria-hidden="true" />}
        <span className="app-sidebar__item-icon">
          <FontAwesomeIcon icon={icon} />
        </span>
        <span className="app-sidebar__item-label">{label}</span>
      </button>

      {isCollapsed &&
        showPopover &&
        rect &&
        createPortal(
          <div
            className="app-sidebar__popover"
            style={{ left: rect.right + 10, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' }}
            role="tooltip"
          >
            {label}
          </div>,
          document.body,
        )}
    </>
  )
}
