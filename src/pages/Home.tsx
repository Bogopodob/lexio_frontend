import { motion } from 'framer-motion'

const topicCards = [
  { emoji: '🍽️', title: 'Еда', count: '48 слов', tone: 'topic-card--mint' },
  { emoji: '✈️', title: 'Путешествия', count: '52 слова', tone: 'topic-card--sky' },
  { emoji: '💭', title: 'Эмоции', count: '36 слов', tone: 'topic-card--rose' },
  { emoji: '💼', title: 'Работа', count: '44 слова', tone: 'topic-card--sand' },
]

const grammarCards = [
  { dot: 'grammar-card__dot--mint', title: 'Глаголы', subtitle: '200 слов • 34 выучено', progress: 17, level: 'Основа речи' },
  { dot: 'grammar-card__dot--blue', title: 'Существительные', subtitle: '300 слов • 12 выучено', progress: 4, level: 'База словаря' },
  { dot: 'grammar-card__dot--pink', title: 'Прилагательные', subtitle: '150 слов • 8 выучено', progress: 5, level: 'Описание' },
  { dot: 'grammar-card__dot--gold', title: 'Фразы', subtitle: '80 фраз • 0 выучено', progress: 0, level: 'Практика' },
]

const phraseCards = [
  { label: 'РЕСТОРАН', accent: 'phrase-card__label--mint', icon: '◌', title: 'Can I have the bill, please?', translation: 'Можно счёт, пожалуйста?' },
  { label: 'ГОРОД', accent: 'phrase-card__label--blue', icon: '⌁', title: 'Where is the nearest metro?', translation: 'Где ближайшее метро?' },
  { label: 'ОТЕЛЬ', accent: 'phrase-card__label--pink', icon: '✦', title: "I'd like to check in", translation: 'Я хочу заселиться.' },
]

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
}

function ProgressRing({ value }: { value: number }) {
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - value)

  return (
    <motion.div className="progress-ring" aria-hidden="true" whileHover={{ scale: 1.04 }}>
      <svg viewBox="0 0 72 72">
        <circle className="progress-ring__track" cx="36" cy="36" r={radius} />
        <motion.circle
          className="progress-ring__value"
          cx="36"
          cy="36"
          r={radius}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <span>12</span>
    </motion.div>
  )
}

export default function Home() {
  return (
    <motion.div
      animate="animate"
      initial="initial"
      transition={{ staggerChildren: 0.08 }}
    >
      <motion.header className="topbar" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div>
          <p className="brand">Lexio</p>
          <p className="greeting">Добрый день</p>
          <h1>Продолжим учить?</h1>
          <p className="hero-copy">
            Короткие сессии, визуальные темы и живые карточки для ежедневной практики.
          </p>
        </div>
        <motion.div
          className="streak-badge"
          whileHover={{ scale: 1.03, rotate: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="streak-badge__fire">✦</span>
          7 дней подряд
        </motion.div>
      </motion.header>

      <motion.section className="hero-panel" variants={fadeUp} transition={{ duration: 0.55 }}>
        <div className="hero-panel__ambient" />
        <div className="hero-panel__main">
          <div className="hero-panel__summary">
            <ProgressRing value={0.6} />
            <div>
              <p className="eyebrow">Дневная цель</p>
              <h2>12 из 20 слов уже закреплены</h2>
              <p className="hero-panel__text">Сильнее всего сегодня идут еда, travel-фразы и базовые глаголы.</p>
            </div>
          </div>

          <div className="hero-panel__stats">
            <div className="stat-pill">
              <span>Сегодня</span>
              <strong>18 мин</strong>
            </div>
            <div className="stat-pill stat-pill--accent">
              <span>Серия</span>
              <strong>92%</strong>
            </div>
          </div>
        </div>

        <motion.button className="primary-action" type="button" whileHover={{ y: -2, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
          Продолжить урок
        </motion.button>
      </motion.section>

      <motion.section className="content-section" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3>По теме</h3>
          <button className="text-link" type="button">Все темы</button>
        </div>

        <div className="topic-grid">
          {topicCards.map((card, index) => (
            <motion.article
              key={card.title}
              className={`topic-card ${card.tone}`}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.16 + index * 0.06, duration: 0.45 }}
              whileHover={{ y: -5, rotate: index % 2 === 0 ? -1 : 1 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="topic-card__emoji">{card.emoji}</span>
              <h4>{card.title}</h4>
              <p>{card.count}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <motion.section className="content-section" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header section-header--stacked">
          <div>
            <h3>По грамматике</h3>
            <p>Соберите базу, чтобы быстрее перейти к свободной речи.</p>
          </div>
        </div>

        <div className="grammar-grid">
          {grammarCards.map((card, index) => (
            <motion.article
              key={card.title}
              className="grammar-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 + index * 0.06, duration: 0.45 }}
              whileHover={{ y: -4 }}
            >
              <div className="grammar-card__topline">
                <span className={`grammar-card__dot ${card.dot}`} />
                <span className="grammar-card__level">{card.level}</span>
              </div>
              <h4>{card.title}</h4>
              <p>{card.subtitle}</p>
              <div className="grammar-card__footer">
                <div className="grammar-card__progress">
                  <motion.span
                    initial={{ width: 0 }}
                    animate={{ width: `${card.progress}%` }}
                    transition={{ delay: 0.45 + index * 0.08, duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <strong className="grammar-card__percent">{card.progress}%</strong>
              </div>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <motion.section className="content-section" variants={fadeUp} transition={{ duration: 0.5 }}>
        <div className="section-header">
          <h3>Разговорные фразы</h3>
          <button className="text-link" type="button">Все фразы</button>
        </div>

        <div className="phrase-strip">
          {phraseCards.map((card, index) => (
            <motion.article
              key={card.title}
              className="phrase-card"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.34 + index * 0.08, duration: 0.5 }}
              whileHover={{ y: -5 }}
            >
              <div className="phrase-card__icon">{card.icon}</div>
              <p className={`phrase-card__label ${card.accent}`}>{card.label}</p>
              <h4>{card.title}</h4>
              <p className="phrase-card__translation">{card.translation}</p>
              <motion.button className="phrase-card__listen" type="button" whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
                Слушать
              </motion.button>
            </motion.article>
          ))}
        </div>
      </motion.section>
    </motion.div>
  )
}
