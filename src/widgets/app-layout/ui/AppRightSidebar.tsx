import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faPlay,
  faRotateLeft,
  faBook,
  faComments,
  faGear,
  faArrowRightFromBracket,
  faCheck,
  faClock,
  faFire,
  faBullseye,
} from '@fortawesome/free-solid-svg-icons'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/shared/lib/cn'

interface Props {
  isDesktop: boolean
  isOpen: boolean
  onClose: () => void
}

const quickActions = [
  { id: 'continue', label: 'Продолжить урок', hint: '12/20 слов', icon: faPlay, primary: true },
  { id: 'repeat', label: 'Повторить', hint: '20 слов вчера', icon: faRotateLeft },
  { id: 'vocab', label: 'Словарь', hint: '142 слова', icon: faBook },
  { id: 'phrases', label: 'Фразы', hint: '80 фраз', icon: faComments },
]

const tasksByDay = {
  yesterday: [
    { id: 'y1', text: 'Повторить 10 слов по теме Еда', done: true },
    { id: 'y2', text: 'Прослушать 3 фразы', done: true },
    { id: 'y3', text: 'Разбор глаголов', done: false },
  ],
  today: [
    { id: 't1', text: 'Выучить 5 новых слов', done: false },
    { id: 't2', text: 'Пройти тест по существительным', done: false },
    { id: 't3', text: 'Прослушать фразы — ресторан', done: true },
    { id: 't4', text: 'Повторить вчерашние ошибки', done: false },
  ],
  tomorrow: [
    { id: 'tm1', text: 'Подготовка к теме Путешествия', done: false },
    { id: 'tm2', text: 'Прослушать диалоги', done: false },
  ],
}

export default function AppRightSidebar({ isDesktop, isOpen, onClose }: Props) {
  const [day, setDay] = useState<'yesterday' | 'today' | 'tomorrow'>('today')
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set(['y1', 'y2', 't3']))
  const [dir, setDir] = useState(1)

  const toggleDone = (id: string) => {
    setDoneIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const changeDay = (next: typeof day) => {
    const order = ['yesterday', 'today', 'tomorrow'] as const
    setDir(order.indexOf(next) > order.indexOf(day) ? 1 : -1)
    setDay(next)
  }

  const tasks = tasksByDay[day]
  const doneCount = tasks.filter((t) => doneIds.has(t.id)).length

  return (
    <aside
      className={cn('app-rightbar', isOpen && 'app-rightbar--open')}
      style={
        isDesktop
          ? {
              width: 380,
              transform: isOpen ? 'translateX(0)' : 'translateX(calc(100% + 12px))',
            }
          : {
              width: '100%',
              maxWidth: 380,
              transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
            }
      }
      aria-hidden={!isOpen}
      aria-label="Панель прогресса"
    >
      <div className="app-rightbar__inner">
        {/* Header user */}
        <div className="app-rightbar__user">
          <div className="app-rightbar__user-main">
            <div className="app-rightbar__avatar">А</div>
            <div className="app-rightbar__user-text">
              <strong>Алексей</strong>
              <span>aleksey@example.com</span>
            </div>
            <button type="button" className="app-rightbar__close" onClick={onClose} aria-label="Закрыть">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          <div className="app-rightbar__user-meta">
            <span className="app-rightbar__level">A2 • База</span>
            <span className="app-rightbar__streak">
              <FontAwesomeIcon icon={faFire} /> 7 дней
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="app-rightbar__section">
          <h3 className="app-rightbar__title">Быстрые действия</h3>
          <div className="app-rightbar__quick">
            {quickActions.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`app-rightbar__quick-item ${a.primary ? 'app-rightbar__quick-item--primary' : ''}`}
              >
                <span className="app-rightbar__quick-icon">
                  <FontAwesomeIcon icon={a.icon} />
                </span>
                <span className="app-rightbar__quick-text">
                  <strong>{a.label}</strong>
                  <span>{a.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Today progress */}
        <div className="app-rightbar__section">
          <h3 className="app-rightbar__title">Сегодня</h3>
          <div className="app-rightbar__today">
            <div className="app-rightbar__today-stats">
              <div className="app-rightbar__today-stat">
                <FontAwesomeIcon icon={faBook} />
                <strong>12/20</strong>
                <span>слов</span>
              </div>
              <div className="app-rightbar__today-stat">
                <FontAwesomeIcon icon={faClock} />
                <strong>18 мин</strong>
                <span>занятия</span>
              </div>
              <div className="app-rightbar__today-stat">
                <FontAwesomeIcon icon={faBullseye} />
                <strong>92%</strong>
                <span>точность</span>
              </div>
            </div>
            <div className="app-rightbar__progress">
              <div className="app-rightbar__progress-track">
                <motion.div
                  className="app-rightbar__progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: '60%' }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span>60% дневной цели</span>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="app-rightbar__section app-rightbar__section--grow">
          <div className="app-rightbar__tasks-header">
            <h3 className="app-rightbar__title" style={{ margin: 0 }}>
              Задачи
            </h3>
            <span className="app-rightbar__tasks-count">
              {doneCount}/{tasks.length}
            </span>
          </div>

          <div className="app-rightbar__tabs">
            {(['yesterday', 'today', 'tomorrow'] as const).map((d) => (
              <button
                key={d}
                type="button"
                className={`app-rightbar__tab ${day === d ? 'app-rightbar__tab--active' : ''}`}
                onClick={() => changeDay(d)}
              >
                {d === 'yesterday' ? 'Вчера' : d === 'today' ? 'Сегодня' : 'Завтра'}
              </button>
            ))}
          </div>

          <div className="app-rightbar__tasks">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={day}
                custom={dir}
                initial={{ opacity: 0, x: dir * 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -16 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="app-rightbar__tasks-list"
              >
                {tasks.map((t) => {
                  const done = doneIds.has(t.id)
                  return (
                    <label key={t.id} className={`app-rightbar__task ${done ? 'app-rightbar__task--done' : ''}`}>
                      <input type="checkbox" checked={done} onChange={() => toggleDone(t.id)} hidden />
                      <span className="app-rightbar__checkbox">
                        {done && <FontAwesomeIcon icon={faCheck} />}
                      </span>
                      <span className="app-rightbar__task-text">{t.text}</span>
                    </label>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="app-rightbar__footer">
          <button type="button" className="app-rightbar__footer-btn">
            <FontAwesomeIcon icon={faGear} /> Настройки
          </button>
          <button type="button" className="app-rightbar__footer-btn app-rightbar__footer-btn--ghost">
            <FontAwesomeIcon icon={faArrowRightFromBracket} /> Выйти
          </button>
        </div>
      </div>
    </aside>
  )
}
