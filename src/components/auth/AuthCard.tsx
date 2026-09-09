import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AtSign, Check, ChevronLeft, Loader2, MailCheck, RefreshCw, TriangleAlert } from 'lucide-react'
import { AuthError } from '@/lib/auth-api'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/lib/i18n'
import { cn } from '@/shared/lib/cn'

type Mode = 'login' | 'register'
type Step = 'email' | 'code'

const CODE_LENGTH = 6
const FALLBACK_COOLDOWN_SECONDS = 60

function cooldownFromResult(result: { resend_after?: number | null }): number {
  const v = typeof result.resend_after === 'number' ? result.resend_after : FALLBACK_COOLDOWN_SECONDS
  return Math.min(300, Math.max(5, Math.round(v)))
}

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

function OtpInput({
  value,
  onChange,
  onComplete,
  label,
}: {
  value: string
  onChange: (v: string) => void
  onComplete: (digits: string) => void
  label: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    onChange(digits)
    if (digits.length === CODE_LENGTH) onComplete(digits)
  }
  return (
    <div className="auth-otp" onClick={() => inputRef.current?.focus()}>
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <span
          key={i}
          className={cn(
            'auth-otp__box',
            value[i] && 'auth-otp__box--filled',
            i === value.length && 'auth-otp__box--active',
          )}
        >
          {value[i] ?? ''}
        </span>
      ))}
      <input
        ref={inputRef}
        className="auth-otp__input"
        value={value}
        onChange={handleChange}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        autoFocus
        aria-label={label}
      />
    </div>
  )
}

export default function AuthCard({ onSuccess }: { onSuccess: () => void }) {
  const { requestCode, verifyCode } = useAuth()
  const t = useT()
  const [mode, setMode] = useState<Mode>('login')
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [formError, setFormError] = useState<string | null>(null)
  const [debugCode, setDebugCode] = useState<string | null>(null)
  const [codeMinutes, setCodeMinutes] = useState(5)
  const [resendIn, setResendIn] = useState(0)
  const [glow, setGlow] = useState({ x: 50, y: 50 })
  const cardRef = useRef<HTMLDivElement>(null)

  const emailError =
    touched && email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? t('auth.card.emailError')
      : undefined

  const canSubmit =
    status !== 'loading' &&
    (step === 'email'
      ? /^\S+@\S+\.\S+$/.test(email.trim())
      : code.length === CODE_LENGTH)

  useEffect(() => {
    if (resendIn <= 0) return
    const id = window.setInterval(() => setResendIn((s) => (s > 1 ? s - 1 : 0)), 1000)
    return () => window.clearInterval(id)
  }, [resendIn])

  const authErrorText = (err: unknown): string => {
    if (err instanceof AuthError) {
      if (err.status === 0) return t('auth.card.serverDown')
      return err.message
    }
    return t('auth.card.genericError')
  }

  const switchMode = (next: Mode) => {
    if (next === mode) return
    setMode(next)
    setStep('email')
    setCode('')
    setTouched(false)
    setStatus('idle')
    setFormError(null)
    setDebugCode(null)
    setResendIn(0)
  }

  const applyRateLimit = (err: unknown) => {
    if (err instanceof AuthError && err.status === 429 && err.retryAfter) {
      setResendIn(Math.min(3600, Math.max(1, Math.round(err.retryAfter))))
    }
  }

  const sendCode = async () => {
    setTouched(true)
    if (status === 'loading' || !/^\S+@\S+\.\S+$/.test(email.trim())) return
    setStatus('loading')
    setFormError(null)
    try {
      const result = await requestCode(email.trim())
      setDebugCode(result.debug_code)
      setCodeMinutes(Math.max(1, Math.round(result.expires_in / 60)))
      setResendIn(cooldownFromResult(result))
      setCode('')
      setStep('code')
      setStatus('idle')
    } catch (err) {
      setStatus('idle')
      applyRateLimit(err)
      setFormError(authErrorText(err))
    }
  }

  const submitCode = async (digits?: string) => {
    const candidate = (digits ?? code).trim()
    if (status === 'loading' || status === 'success') return
    if (candidate.length !== CODE_LENGTH) return
    setStatus('loading')
    setFormError(null)
    try {
      await verifyCode(email.trim(), candidate)
      setStatus('success')
      window.setTimeout(onSuccess, 950)
    } catch (err) {
      setStatus('idle')
      setCode('')
      setFormError(authErrorText(err))
    }
  }

  const resend = async () => {
    if (status === 'loading' || resendIn > 0) return
    setStatus('loading')
    setFormError(null)
    try {
      const result = await requestCode(email.trim())
      setDebugCode(result.debug_code)
      setCodeMinutes(Math.max(1, Math.round(result.expires_in / 60)))
      setResendIn(cooldownFromResult(result))
      setCode('')
      setStatus('idle')
    } catch (err) {
      setStatus('idle')
      applyRateLimit(err)
      setFormError(authErrorText(err))
    }
  }

  const backToEmail = () => {
    setStep('email')
    setCode('')
    setStatus('idle')
    setFormError(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 'email') void sendCode()
    else void submitCode()
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
            <span className="auth-tabs__text">{m === 'login' ? t('auth.card.tabLogin') : t('auth.card.tabRegister')}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={`${step}-${mode}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22 }}
          className="auth-card__subtitle"
        >
          {step === 'email'
            ? mode === 'login'
              ? t('auth.card.subLogin')
              : t('auth.card.subRegister')
            : mode === 'login'
              ? t('auth.card.codeTitleLogin')
              : t('auth.card.codeTitleRegister')}
        </motion.p>
      </AnimatePresence>

      <form onSubmit={submit} noValidate className="auth-form">
        <AnimatePresence mode="wait" initial={false}>
          {step === 'email' ? (
            <motion.div
              key="email"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <Field icon={AtSign} label={t('auth.card.fieldEmail')} error={emailError}>
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
            </motion.div>
          ) : (
            <motion.div
              key="code"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="auth-code">
                <div className="auth-code__mail">
                  <MailCheck size={15} />
                  <span>{t('auth.card.codeSentTo', { email })}</span>
                  <button type="button" className="auth-code__back" onClick={backToEmail}>
                    <ChevronLeft size={13} /> {t('auth.card.changeEmail')}
                  </button>
                </div>

                <OtpInput
                  value={code}
                  onChange={setCode}
                  onComplete={(digits) => void submitCode(digits)}
                  label={t('auth.card.codeInputLabel')}
                />

                <div className="auth-code__row">
                  <button
                    type="button"
                    className="auth-code__action"
                    disabled={resendIn > 0}
                    onClick={() => void resend()}
                  >
                    <RefreshCw size={13} />
                    {resendIn > 0
                      ? t('auth.card.resendIn', { seconds: resendIn })
                      : t('auth.card.resendCode')}
                  </button>
                  <span className="auth-code__ttl">{t('auth.card.codeExpires', { minutes: codeMinutes })}</span>
                </div>

                {debugCode && <div className="auth-debug">{t('auth.card.debugHint', { code: debugCode })}</div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <Loader2 size={18} className="animate-spin" /> {t('auth.card.submitting')}
              </motion.span>
            ) : status === 'success' ? (
              <motion.span
                key="success"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="auth-submit__content"
              >
                <Check size={18} strokeWidth={3} /> {t('auth.card.success')}
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="auth-submit__content"
              >
                {step === 'email' ? (
                  <>
                    {t('auth.card.getCode')}
                    <span className="auth-submit__arrow">→</span>
                  </>
                ) : (
                  mode === 'login' ? t('auth.card.submitLogin') : t('auth.card.submitRegister')
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </form>

      <p className="auth-card__footnote">
        {t('auth.card.footnote')}
      </p>
    </div>
  )
}