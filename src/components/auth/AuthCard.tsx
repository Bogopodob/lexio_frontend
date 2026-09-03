import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AtSign, Check, Eye, EyeOff, Loader2, Lock, TriangleAlert, User } from 'lucide-react'
import { AuthError } from '@/lib/auth-api'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/shared/lib/cn'

type Mode = 'login' | 'register'

function passwordScore(pw: string): number {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-ZА-ЯЁ]/.test(pw) && /[a-zа-яё]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-zА-Яа-яЁё0-9]/.test(pw)) score++
  return Math.min(score, 4)
}

const STRENGTH_LABELS = ['слабый', 'так себе', 'норм', 'сильный']
const STRENGTH_COLORS = ['#f43f5e', '#ff9d5c', '#F5C16A', '#5AD4B5']

function Field({
  icon: Icon,
  label,
  error,
  children,
}: {
  icon: typeof AtSign
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="auth-field">
      <span className="auth-field__icon">
        <Icon size={16} strokeWidth={2.2} />
      </span>
      <span className="auth-field__body">
        <span className="auth-field__label">{label}</span>
        {children}
      </span>
      {error && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="auth-field__error"
        >
          {error}
        </motion.span>
      )}
    </label>
  )
}

export default function AuthCard({ onSuccess }: { onSuccess: () => void }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [formError, setFormError] = useState<string | null>(null)
  const [glow, setGlow] = useState({ x: 50, y: 50 })
  const cardRef = useRef<HTMLDivElement>(null)

  const emailError =
    touched && email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? 'похоже, в email опечатка'
      : undefined
  const passwordError =
    touched && mode === 'register' && password !== '' && password.length < 8
      ? 'минимум 8 символов'
      : undefined

  const strength = useMemo(() => passwordScore(password), [password])
  const canSubmit =
    status !== 'loading' &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    (mode === 'login' ? password.length > 0 : password.length >= 8)

  const switchMode = (next: Mode) => {
    setMode(next)
    setFormError(null)
    setTouched(false)
    setStatus('idle')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (status === 'loading' || !canSubmit) return
    setStatus('loading')
    setFormError(null)
    try {
      if (mode === 'login') await login(email.trim(), password)
      else await register(email.trim(), password, name.trim() || undefined)
      setStatus('success')
      window.setTimeout(onSuccess, 950)
    } catch (err) {
      setStatus('idle')
      setFormError(
        err instanceof AuthError
          ? err.status === 0
            ? 'Сервер недоступен — backend точно запущен?'
            : err.message
          : 'Что-то пошло не так',
      )
    }
  }

  return (
    <div ref={cardRef} className="auth-card">
      <div className="auth-card__sheen" />

      {/* tabs */}
      <div className="auth-tabs" role="tablist">
        {(['login', 'register'] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cn('auth-tabs__btn', mode === m && 'auth-tabs__btn--active')}
          >
            {mode === m && (
              <motion.span
                layoutId="auth-tab-pill"
                className="auth-tabs__pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="auth-tabs__text">{m === 'login' ? 'Вход' : 'Регистрация'}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="auth-card__subtitle"
        >
          {mode === 'login'
            ? 'С возвращением! Продолжим с того же слова.'
            : 'Пара минут — и вся библиотека слов твоя.'}
        </motion.p>
      </AnimatePresence>

      <form onSubmit={submit} noValidate className="auth-form">
        <AnimatePresence initial={false}>
          {mode === 'register' && (
            <motion.div
              key="name"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <Field icon={User} label="Имя">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=" "
                  autoComplete="name"
                  maxLength={60}
                  className="auth-input"
                />
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <Field icon={AtSign} label="Email" error={emailError}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder=" "
            type="email"
            autoComplete="email"
            inputMode="email"
            className="auth-input"
          />
        </Field>

        <Field icon={Lock} label="Пароль" error={passwordError}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              const caps = e.getModifierState?.('CapsLock')
              if (typeof caps === 'boolean') setCapsLock(caps)
            }}
            placeholder=" "
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="auth-input auth-input--with-action"
          />
          <button
            type="button"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            onClick={() => setShowPassword((v) => !v)}
            className="auth-field__action"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </Field>

        <div className="auth-hints">
          <AnimatePresence>
            {capsLock && password !== '' && (
              <motion.span
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="auth-hints__caps"
              >
                <TriangleAlert size={13} /> Caps Lock включён
              </motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {mode === 'register' && password !== '' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="auth-strength"
              >
                <div className="auth-strength__bars">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.span
                      key={i}
                      animate={{
                        backgroundColor: i < strength ? STRENGTH_COLORS[strength - 1] : 'rgba(255,255,255,0.12)',
                        boxShadow:
                          i < strength
                            ? `0 0 10px ${STRENGTH_COLORS[strength - 1]}66`
                            : '0 0 0 transparent',
                      }}
                      className="auth-strength__bar"
                    />
                  ))}
                </div>
                <span className="auth-strength__label" style={{ color: STRENGTH_COLORS[strength - 1] }}>
                  {STRENGTH_LABELS[strength - 1]}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {formError && (
            <motion.div
              key={formError}
              initial={{ opacity: 0, y: -6, x: 0 }}
              animate={{ opacity: 1, y: 0, x: [0, -9, 9, -6, 6, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
              className="auth-error"
              role="alert"
            >
              <TriangleAlert size={15} />
              <span>{formError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileTap={canSubmit ? { scale: 0.97 } : undefined}
          onMouseMove={(e) => {
            const rect = cardRef.current?.getBoundingClientRect()
            if (!rect) return
            setGlow({
              x: ((e.clientX - rect.left) / rect.width) * 100,
              y: ((e.clientY - rect.top) / rect.height) * 100,
            })
          }}
          className={cn('auth-submit', status === 'success' && 'auth-submit--success')}
          style={
            {
              '--glow-x': `${glow.x}%`,
              '--glow-y': `${glow.y}%`,
            } as React.CSSProperties
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            {status === 'loading' ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="auth-submit__content"
              >
                <Loader2 size={18} className="animate-spin" /> Открываем словарь…
              </motion.span>
            ) : status === 'success' ? (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="auth-submit__content"
              >
                <Check size={18} strokeWidth={3} /> Получилось!
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="auth-submit__content"
              >
                {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                <span className="auth-submit__arrow">→</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </form>

      <p className="auth-card__footnote">
        Нажимая кнопку, ты принимаешь магию интервальных повторений ✨
      </p>
    </div>
  )
}
