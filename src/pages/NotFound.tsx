import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHouse, faArrowLeft, faCompass, faGhost, faCheck, faTrophy, faRotateRight, faSpellCheck, faLanguage } from '@fortawesome/free-solid-svg-icons'
import { getQuizRound, type QuizRound } from '@/lib/catalog-api'

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

interface CheckSegment {
  t: string
  wrong?: boolean
}

interface CheckExample {
  student: CheckSegment[]
  teacher: string
  note: string
}

const CHECK_EXAMPLES: CheckExample[] = [
  {
    student: [{ t: 'I ' }, { t: 'have 5 years', wrong: true }],
    teacher: 'I am 5 years old',
    note: 'возраст — только через to be',
  },
  {
    student: [{ t: 'He ' }, { t: 'go', wrong: true }, { t: ' to school every day' }],
    teacher: 'He goes to school every day',
    note: 'he / she / it → глагол + s',
  },
  {
    student: [{ t: 'There ', wrong: true }, { t: 'house is big' }],
    teacher: 'Their house is big',
    note: 'their — их, there — там',
  },
  {
    student: [{ t: 'I ' }, { t: 'am agree', wrong: true }, { t: ' with you' }],
    teacher: 'I agree with you',
    note: 'agree — без to be',
  },
  {
    student: [{ t: 'Он ' }, { t: 'звОнит', wrong: true }, { t: ' мне каждый день' }],
    teacher: 'Он звонИт мне каждый день',
    note: 'ударение на И',
  },
]

function GrammarCheck() {
  const [round, setRound] = useState(0)
  const [stage, setStage] = useState(0) // 0 — пишут, 1 — ошибка подсвечена, 2 — верный вариант
  const [typed, setTyped] = useState(0)
  const ex = CHECK_EXAMPLES[round % CHECK_EXAMPLES.length]

  useEffect(() => {
    setStage(0)
    setTyped(0)
    const t1 = window.setTimeout(() => setStage(1), 1600)
    const t2 = window.setTimeout(() => setStage(2), 2500)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [round])

  useEffect(() => {
    if (stage !== 2) return
    if (typed >= ex.teacher.length) {
      const t = window.setTimeout(
        () => setRound((r) => (r + 1) % CHECK_EXAMPLES.length),
        3000,
      )
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setTyped((v) => v + 1), 24)
    return () => window.clearTimeout(t)
  }, [stage, typed, ex.teacher])

  const words = ex.student.flatMap((s, si) =>
    s.t
      .split(' ')
      .filter((w) => w !== '')
      .map((w, wi) => ({ key: `${si}-${wi}`, w, wrong: s.wrong })),
  )

  return (
    <div className="nf-terminal">
      <div className="nf-terminal__bar">
        <span className="nf-terminal__dot nf-terminal__dot--r" />
        <span className="nf-terminal__dot nf-terminal__dot--y" />
        <span className="nf-terminal__dot nf-terminal__dot--g" />
        <span className="nf-terminal__title">
          <FontAwesomeIcon icon={faSpellCheck} /> grammar-check — live
        </span>
      </div>
      <div className="nf-terminal__body">
        <div className="nf-check__who">ученик пишет</div>
        <div className="nf-check__student" key={`s-${round}`}>
          {words.map((w, i) => (
            <motion.span
              key={w.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.09 }}
              className={w.wrong && stage >= 1 ? 'nf-check__wrong' : undefined}
            >
              {w.w}
              {i < words.length - 1 ? ' ' : ''}
            </motion.span>
          ))}
        </div>
        {stage >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="nf-check__who">правильно</div>
            <div className="nf-check__teacher">
              <FontAwesomeIcon icon={faCheck} /> {ex.teacher.slice(0, typed)}
              {typed < ex.teacher.length && <span className="nf-terminal__caret" />}
            </div>
            {typed >= ex.teacher.length && <div className="nf-check__note">{ex.note}</div>}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function WordQuiz() {
  const [round, setRound] = useState<QuizRound | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => {
    try {
      return Number(localStorage.getItem('qwicki:quiz-best') || 0)
    } catch {
      return 0
    }
  })
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const timer = useRef(0)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const r = await getQuizRound(4)
      setRound(r)
      setPicked(null)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return () => window.clearTimeout(timer.current)
  }, [load])

  useEffect(() => {
    if (score > best) {
      setBest(score)
      try {
        localStorage.setItem('qwicki:quiz-best', String(score))
      } catch {
        /* ignore */
      }
    }
  }, [score, best])

  const answer = useCallback(
    (i: number) => {
      if (picked !== null || !round || i >= round.options.length) return
      setPicked(i)
      if (i === round.correct_index) setScore((s) => s + 1)
      timer.current = window.setTimeout(load, 1150)
    },
    [picked, round, load],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = ['1', '2', '3', '4', '5', '6'].indexOf(e.key)
      if (n >= 0) answer(n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answer])

  const done = picked !== null

  return (
    <div className="nf-arena">
      <div className="nf-arena__head">
        <span className="nf-arena__title">
          <FontAwesomeIcon icon={faLanguage} /> Переведи слово
        </span>
        <span className="nf-arena__score">
          счёт <b>{score}</b>
          <span className="nf-arena__best">
            <FontAwesomeIcon icon={faTrophy} /> {best}
          </span>
        </span>
      </div>
      {loading ? (
        <div className="nf-quiz" aria-hidden>
          <div className="h-9 w-44 rounded-xl bg-white/[0.07] animate-pulse" />
          <div className="h-4 w-28 rounded-lg bg-white/[0.06] animate-pulse" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-11 rounded-xl bg-white/[0.05] animate-pulse" />
          ))}
        </div>
      ) : failed || !round ? (
        <div className="nf-quiz">
          <p className="nf-quiz__err">Слова не загрузились — страница и так потерялась</p>
          <button onClick={load} className="nf-quiz__opt" style={{ justifyContent: 'center' }}>
            <FontAwesomeIcon icon={faRotateRight} /> Попробовать снова
          </button>
        </div>
      ) : (
        <div className="nf-quiz" key={round.question.word}>
          <div className="nf-quiz__q">{round.question.word}</div>
          {round.question.transcription && (
            <div className="nf-quiz__tr">[{round.question.transcription}]</div>
          )}
          <div className="nf-quiz__opts">
            {round.options.map((o, i) => (
              <button
                key={`${o}-${i}`}
                onClick={() => answer(i)}
                disabled={done}
                className={`nf-quiz__opt${done && i === round.correct_index ? ' nf-quiz__opt--ok' : ''}${done && i === picked && i !== round.correct_index ? ' nf-quiz__opt--bad' : ''}`}
              >
                <span className="nf-quiz__num">{i + 1}</span>
                {o}
              </button>
            ))}
          </div>
          <div className="nf-quiz__foot">клик или клавиши 1–4 • слова из словаря</div>
        </div>
      )}
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
        <GrammarCheck />
        <WordQuiz />
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
