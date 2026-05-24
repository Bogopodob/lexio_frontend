import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircle } from '@fortawesome/free-solid-svg-icons'

export default function Settings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="topbar">
        <div>
          <p className="brand">Lexio</p>
          <p className="greeting">Настройки</p>
          <h1>Настройки</h1>
        </div>
      </div>

      <div className="content-section">
        <div className="settings-group">
          <h3>Язык обучения</h3>
          <div className="settings-row">
            <span>Английский</span>
            <span className="settings-row__hint">Русский → English</span>
          </div>
        </div>

        <div className="settings-group">
          <h3>Напоминания</h3>
          <div className="settings-row">
            <span>Ежедневное напоминание</span>
            <span className="settings-row__value">09:00</span>
          </div>
          <div className="settings-row">
            <span>Дневная цель</span>
            <span className="settings-row__value">20 слов</span>
          </div>
        </div>

        <div className="settings-group">
          <h3>Прочее</h3>
          <div className="settings-row">
            <span>Тёмная тема</span>
            <span className="settings-row__toggle"><FontAwesomeIcon icon={faCircle} /></span>
          </div>
          <div className="settings-row">
            <span>Звук</span>
            <span className="settings-row__toggle"><FontAwesomeIcon icon={faCircle} /></span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
