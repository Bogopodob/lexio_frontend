import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faArrowLeft, faCompass, faGhost, faBug, faTerminal, faTrophy } from '@fortawesome/free-solid-svg-icons'

const ORBIT_WORDS = [
  { text: 'undefined', x: '-38%', y: '-34%', d: 0, color: '#8b9bff' },
  { text: 'null', x: '36%', y: '-32%', d: 1.1, color: '#7dd3fc' },
  { text: 'NaN', x: '-40%', y: '8%', d: 2.2, color: '#F08AB4' },
  { text: 'oops', x: '40%', y: '6%', d: 0.8, color: '#5AD4B5' },
  { text: 'failed', x: '-34%', y: '32%', d: 2.8, color: '#f43f5e' },
  { text: 'panic!', x: '36%', y: '34%', d: 1.4, color: '#F5C16A' },
  { text: 'FIXME', x: '2%', y: '-42%', d: 1.9, color: '#a78bfa' },
  { text: 'segfault', x: '-2%', y: '42%', d: 2.5, color: '#ff9d5c' },
]

const STARS = Array.from({ length: 42 }, (_, i) => ({
  left: `${(i * 37.7 + 11) % 100}%`,
  top: `${(i * 53.3 + 7) % 100}%`,
  size: (i % 3) + 1,
  delay: (i % 10) * 0.35,
  duration: 2 + (i % 5) * 0.6,
}))

interface LogLine {
  text: string
  color: string
  pause?: number
  fast?: boolean
}

const LOG_LINES: LogLine[] = [
  { text: '$ qwicki open /nowhere --please', color: 'rgba(255,255,255,0.45)', pause: 350 },
  { text: '✓ compiled successfully in 0.4s', color: '#5AD4B5', pause: 300 },
  { text: "Error: Cannot find module './common-sense'", color: '#f43f5e', pause: 420 },
  { text: '    at Brain.think (developer.js:404:13)', color: 'rgba(255,255,255,0.4)', fast: true },
  { text: '    at Coffee.drink (morning.js:800:77)', color: 'rgba(255,255,255,0.4)', fast: true },
  { text: 'ReferenceError: sleep is not defined', color: '#f43f5e', pause: 420 },
  { text: '    at Developer.wakeup (monday.js:9:00)', color: 'rgba(255,255,255,0.4)', fast: true },
  { text: 'Warning: 3 cups of coffee deprecated, use 4', color: '#F5C16A', pause: 380 },
  { text: '> 418 I\'m a teapot — я чайник, а не страница', color: '#8b9bff', pause: 500 },
  { text: 'hint: have you tried turning it off and on again?', color: '#5AD4B5', pause: 900 },
]

function Terminal() {
  const [rendered, setRendered] = useState<{ text: string; color: string }[]>([])

  useEffect(() => {
    let li = 0
    let ci = 0
    let cancelled = false
    let timer = 0
    const tick = () => {
      if (cancelled) return
      const line = LOG_LINES[li]
      ci += 1
      const partial = line.text.slice(0, ci)
      setRendered((prev) => [...prev.slice(0, li), { text: partial, color: line.color }])
      if (ci < line.text.length) {
        timer = window.setTimeout(tick, line.fast ? 7 : 14 + Math.random() * 30)
      } else {
        li += 1
        ci = 0
        if (li >= LOG_LINES.length) {
          timer = window.setTimeout(() => {
            li = 0
            ci = 0
            setRendered([])
            timer = window.setTimeout(tick, 500)
          }, 4200)
        } else {
          timer = window.setTimeout(tick, line.pause ?? 240)
        }
      }
    }
    timer = window.setTimeout(tick, 700)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="nf-terminal">
      <div className="nf-terminal__bar">
        <span className="nf-terminal__dot nf-terminal__dot--r" />
        <span className="nf-terminal__dot nf-terminal__dot--y" />
        <span className="nf-terminal__dot nf-terminal__dot--g" />
        <span className="nf-terminal__title">
          <FontAwesomeIcon icon={faTerminal} /> build.log — live
        </span>
      </div>
      <div className="nf-terminal__body">
        {rendered.slice(-9).map((l, i) => (
          <div key={`${i}-${l.text.length}`} className="nf-terminal__line" style={{ color: l.color }}>
            {l.text}
            {i === Math.min(rendered.length, 9) - 1 && <span className="nf-terminal__caret" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function BugHunt() {
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem('qwicki:bug-best') || 0)
    } catch {
      return 0
    }
  })
  const [pos, setPos] = useState({ x: 50, y: 50 })
  const [pop, setPop] = useState<{ id: number; x: number; y: number } | null>(null)
  const popId = useRef(0)

  const move = useCallback(() => {
    setPos({ x: 10 + Math.random() * 80, y: 16 + Math.random() * 68 })
  }, [])

  useEffect(() => {
    if (score > best) {
      setBest(score)
      try {
        localStorage.setItem('qwicki:bug-best', String(score))
      } catch {
        /* ignore */
      }
    }
  }, [score, best])

  useEffect(() => {
    const delay = score === 0 ? 700 : Math.max(450, 1300 - score * 45)
    const t = window.setTimeout(move, delay)
    return () => window.clearTimeout(t)
  }, [score, pos, move])

  const catchBug = () => {
    const id = ++popId.current
    setPop({ id, x: pos.x, y: pos.y })
    window.setTimeout(() => {
      setPop((p) => (p && p.id === id ? null : p))
    }, 650)
    setScore((s) => s + 1)
    move()
  }

  return (
    <div className="nf-arena">
      <div className="nf-arena__head">
        <span className="nf-arena__title">
          <FontAwesomeIcon icon={faBug} /> Поймай баг
        </span>
        <span className="nf-arena__score">
          счёт <b>{score}</b>
          <span className="nf-arena__best">
            <FontAwesomeIcon icon={faTrophy} /> {best}
          </span>
        </span>
      </div>
      <div className="nf-arena__field">
        <AnimatePresence>
          {pop && (
            <motion.span
              key={pop.id}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -34, scale: 1.15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="nf-arena__pop"
              style={{ left: `${pop.x}%`, top: `${pop.y}%` }}
            >
              +1
            </motion.span>
          )}
        </AnimatePresence>
        <motion.button
          key={`${pos.x.toFixed(1)}-${pos.y.toFixed(1)}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          whileTap={{ scale: 1.5, rotate: 20 }}
          onClick={catchBug}
          className="nf-arena__bug"
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          aria-label="Поймать баг"
        >
          <span className="nf-arena__bug-emoji">🐛</span>
        </motion.button>
        <span className="nf-arena__hint">он убегает — кликай быстрее</span>
      </div>
    </div>
  )
}

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

      <div className="nf-hero">
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
          <h1 className="nf-digits nf-digits--glitch" data-text="404" aria-label="Ошибка 404">
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
        </motion.div>
      </div>

      <div className="nf-grid">
        <Terminal />
        <BugHunt />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.95 }}
        className="nf-hint"
      >
        <FontAwesomeIcon icon={faCompass} /> а повторения слов — по расписанию, без опозданий
      </motion.div>
    </motion.div>
  )
}
