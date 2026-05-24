import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faFire, faDumbbell, faBullseye, faStar } from '@fortawesome/free-solid-svg-icons'

const achievements = [
  { icon: faFire, text: '3 дня подряд' },
  { icon: faDumbbell, text: '50 слов' },
  { icon: faBullseye, text: 'Первый урок' },
  { icon: faStar, text: 'Цель 5 дней' },
]

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
          <FontAwesomeIcon icon={faUser} />
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
          {achievements.map((a) => (
            <div key={a.text} className="achievement-badge">
              <FontAwesomeIcon icon={a.icon} /> {a.text}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
