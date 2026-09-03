import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGhost, faXmark, faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/context/AuthContext'

const DISMISS_KEY = 'qwicki:guest-banner-dismissed'

export default function GuestBanner() {
  const { user, ready } = useAuth()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  const visible = ready && !user && !dismissed

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
  }

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="guest-banner"
          role="status"
        >
          <span className="guest-banner__icon" aria-hidden="true">
            <FontAwesomeIcon icon={faGhost} />
          </span>
          <p className="guest-banner__text">
            <strong>Гостевой режим</strong>
            <span> — прогресс, серия и слова не сохранятся. Войди, чтобы всё запомнить.</span>
          </p>
          <button
            type="button"
            className="guest-banner__cta"
            onClick={() => navigate('/auth')}
          >
            <FontAwesomeIcon icon={faRightToBracket} />
            <span>Войти / Регистрация</span>
          </button>
          <button
            type="button"
            className="guest-banner__close"
            aria-label="Скрыть"
            onClick={dismiss}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
