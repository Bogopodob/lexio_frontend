import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [soundOn, setSoundOn] = useState(true)

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
          <h3>Оформление и звук</h3>
          <div className="settings-row">
            <div>
              <span>Тёмная тема</span>
              <p className="settings-row__hint" style={{ marginTop: 4 }}>{theme === 'dark' ? 'Тёмная включена' : 'Светлая включена'} — Command-K тоже переключает</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Переключить тему"
              className={`settings-switch ${theme === 'dark' ? 'settings-switch--on' : ''}`}
              onClick={toggleTheme}
            >
              <span className="settings-switch__thumb" />
            </button>
          </div>
          <div className="settings-row">
            <div>
              <span>Звук</span>
              <p className="settings-row__hint" style={{ marginTop: 4 }}>{soundOn ? 'Озвучка включена' : 'Без звука'}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundOn}
              aria-label="Переключить звук"
              className={`settings-switch ${soundOn ? 'settings-switch--on' : ''}`}
              onClick={() => setSoundOn((v) => !v)}
            >
              <span className="settings-switch__thumb" />
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h3>Быстрый доступ</h3>
          <div className="settings-row">
            <span>Поиск</span>
            <span className="settings-row__hint">⌘K / Ctrl+K — везде</span>
          </div>
          <div className="settings-row">
            <span>Флип-карточки</span>
            <span className="settings-row__hint">Клик или Enter — переворот, L — озвучить</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
