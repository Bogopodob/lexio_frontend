import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBook, faClock, faFire, faBullseye } from '@fortawesome/free-solid-svg-icons'

export default function Stats() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="topbar">
        <div>
          <p className="brand">Lexio</p>
          <p className="greeting">Статистика</p>
          <h1>Ваш прогресс</h1>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-card__icon"><FontAwesomeIcon icon={faBook} /></span>
          <strong>142</strong>
          <span>слов изучено</span>
        </div>
        <div className="stats-card">
          <span className="stats-card__icon"><FontAwesomeIcon icon={faClock} /></span>
          <strong>18 мин</strong>
          <span>сегодня</span>
        </div>
        <div className="stats-card">
          <span className="stats-card__icon"><FontAwesomeIcon icon={faFire} /></span>
          <strong>7 дней</strong>
          <span>серия</span>
        </div>
        <div className="stats-card">
          <span className="stats-card__icon"><FontAwesomeIcon icon={faBullseye} /></span>
          <strong>92%</strong>
          <span>точность</span>
        </div>
      </div>

      <div className="content-section">
        <div className="section-header section-header--stacked">
          <div>
            <h3>Активность по дням</h3>
            <p>Последние 7 дней</p>
          </div>
        </div>
        <div className="week-chart">
          {[{ day: 'Пн', min: 18 }, { day: 'Вт', min: 12 }, { day: 'Ср', min: 25 }, { day: 'Чт', min: 8 }, { day: 'Пт', min: 20 }, { day: 'Сб', min: 30 }, { day: 'Вс', min: 15 }].map((d) => (
            <div key={d.day} className="week-chart__bar">
              <motion.div
                className="week-chart__fill"
                initial={{ height: 0 }}
                animate={{ height: `${(d.min / 30) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <span>{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
