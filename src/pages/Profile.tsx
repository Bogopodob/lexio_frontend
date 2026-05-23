import { motion } from 'framer-motion'

export default function Profile() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="topbar">
        <div>
          <p className="brand">Lexio</p>
          <p className="greeting">Профиль</p>
          <h1>Ваш профиль</h1>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-card__avatar">
          <span>👤</span>
        </div>
        <h2 className="profile-card__name">Алексей</h2>
        <p className="profile-card__email">aleksey@example.com</p>

        <div className="profile-card__stats">
          <div className="stat-pill">
            <span>Всего слов</span>
            <strong>142</strong>
          </div>
          <div className="stat-pill stat-pill--accent">
            <span>Дней подряд</span>
            <strong>7</strong>
          </div>
          <div className="stat-pill">
            <span>Уровень</span>
            <strong>A2</strong>
          </div>
        </div>
      </div>

      <div className="content-section">
        <div className="section-header">
          <h3>Достижения</h3>
        </div>
        <div className="achievement-grid">
          {['🔥 3 дня подряд', '💪 50 слов', '🎯 Первый урок', '⭐️ Цель 5 дней'].map((a) => (
            <div key={a} className="achievement-badge">{a}</div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
