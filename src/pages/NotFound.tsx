import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faArrowLeft, faCompass, faGhost } from '@fortawesome/free-solid-svg-icons'

const ORBIT_WORDS = [
  { text: 'undefined', x: '-38%', y: '-34%', d: 0, color: '#8b9bff' },
  { text: 'мир?', x: '36%', y: '-30%', d: 1.4, color: '#F5C16A' },
  { text: 'lost', x: '-34%', y: '30%', d: 2.2, color: '#F08AB4' },
  { text: '404', x: '38%', y: '32%', d: 0.8, color: '#5AD4B5' },
  { text: 'oops', x: '2%', y: '-42%', d: 2.8, color: '#a78bfa' },
  { text: 'никуда', x: '-4%', y: '42%', d: 1.9, color: '#7dd3fc' },
]

const STARS = Array.from({ length: 42 }, (_, i) => ({
  left: `${(i * 37.7 + 11) % 100}%`,
  top: `${(i * 53.3 + 7) % 100}%`,
  size: (i % 3) + 1,
  delay: (i % 10) * 0.35,
  duration: 2 + (i % 5) * 0.6,
}))

export default function NotFound() {
  const navigate = useNavigate()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })
  const digitsX = useTransform(sx, [-0.5, 0.5], [-16, 16])
  const digitsY = useTransform(sy, [-0.5, 0.5], [-10, 10])
  const chipsX = useTransform(sx, [-0.5, 0.5], [22, -22])
  const chipsY = useTransform(sy, [-0.5, 0.5], [14, -14])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
      className="nf-page"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - rect.left) / rect.width - 0.5)
        my.set((e.clientY - rect.top) / rect.height - 0.5)
      }}
    >
      <div className="nf-stars" aria-hidden>
        {STARS.map((s, i) => (
          <span
            key={i}
            className="nf-star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
            }}
          />
        ))}
        <span className="nf-shooting" aria-hidden />
      </div>

      <motion.div style={{ x: chipsX, y: chipsY }} className="nf-orbit" aria-hidden>
        {ORBIT_WORDS.map((w) => (
          <motion.span
            key={w.text}
            className="nf-chip"
            style={{ left: `calc(50% + ${w.x})`, top: `calc(50% + ${w.y})`, ['--chip-color' as string]: w.color } as React.CSSProperties}
            animate={{ y: [0, -12, 0], rotate: [0, 3, -3, 0] }}
            transition={{ duration: 5 + w.d, repeat: Infinity, ease: 'easeInOut', delay: w.d }}
          >
            {w.text}
          </motion.span>
        ))}
      </motion.div>

      <motion.div style={{ x: digitsX, y: digitsY }} className="nf-center">
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="nf-ghost"
        >
          <FontAwesomeIcon icon={faGhost} />
        </motion.div>
        <h1 className="nf-digits" aria-label="Ошибка 404">
          {'404'.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 60, rotateX: -70 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 200, damping: 17 }}
              whileHover={{ scale: 1.12, rotate: i % 2 === 0 ? -6 : 6 }}
              className="nf-digit"
            >
              {ch}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="nf-text"
        >
          Такое слово даже мы не выучили — <span className="nf-text__accent">страницы не существует</span>
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75 }}
          className="nf-actions"
        >
          <button onClick={() => navigate('/')} className="nf-btn nf-btn--primary">
            <FontAwesomeIcon icon={faHouse} /> На главную
          </button>
          <button onClick={() => navigate(-1)} className="nf-btn">
            <FontAwesomeIcon icon={faArrowLeft} /> Назад
          </button>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.95 }}
          className="nf-hint"
        >
          <FontAwesomeIcon icon={faCompass} /> а повторения слов — по расписанию, без опозданий
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
