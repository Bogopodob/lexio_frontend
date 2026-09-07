import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faXmark, faPuzzlePiece, faLightbulb } from '@fortawesome/free-solid-svg-icons'
import { normalize, fuzzyMatch, type Fuzzy, type PhraseToken } from '@/lib/study'
import { useT } from '@/lib/i18n'

interface ClozeCardProps {
  tokens: PhraseToken[]
  /** Indices of tokens hidden as gaps. Must be non-empty, sorted. */
  gaps: number[]
  native: string
  onAnswer: (kind: Fuzzy, hintsUsed: number) => void
}

const stripPunct = (s: string) => s.replace(/[.?!,;:…«»"“”'’()\-—–]+$/u, '')

function slotKind(value: string, expected: string): Fuzzy {
  const v = stripPunct(normalize(value))
  const e = stripPunct(normalize(expected))
  if (v === '') return 'wrong'
  if (v === e) return 'exact'
  return fuzzyMatch(value, [expected]).kind === 'close' ? 'close' : 'wrong'
}

export default function ClozeCard({ tokens, gaps, native, onAnswer }: ClozeCardProps) {
  const t = useT()
  const [values, setValues] = useState<string[]>(() => gaps.map(() => ''))
  const [checked, setChecked] = useState<Fuzzy[] | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const answered = useRef(false)
  const cb = useRef(onAnswer)
  cb.current = onAnswer

  const gapSet = useMemo(() => new Set(gaps), [gaps])
  // gap position -> index inside values[]
  const valueIdx = useMemo(() => {
    const m = new Map<number, number>()
    gaps.forEach((g, k) => m.set(g, k))
    return m
  }, [gaps])

  // Adaptive widths: a hidden mirror with the same font measures the real
  // rendered width of max(expected, typed) — `ch` units lie for black fonts.
  // Clamped to the form width so long typing never pushes the card sideways.
  const mirrorRef = useRef<HTMLSpanElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)
  const [widths, setWidths] = useState<number[]>([])
  const measure = useCallback(() => {
    const mirror = mirrorRef.current
    if (!mirror) return
    const cap = formRef.current ? Math.max(120, formRef.current.clientWidth - 8) : Infinity
    const next = gaps.map((g, k) => {
      const expected = tokens[g]?.word ?? ''
      const typed = values[k] ?? ''
      const probe = typed.length > expected.length ? typed : expected
      mirror.textContent = probe === '' ? '•' : probe
      return Math.min(Math.ceil(mirror.getBoundingClientRect().width) + 30, cap)
    })
    setWidths((prev) =>
      prev.length === next.length && prev.every((w, i) => w === next[i]) ? prev : next,
    )
  }, [gaps, tokens, values])

  useLayoutEffect(() => {
    measure()
  }, [measure])

  // Re-measure on container resize (rotation, window, sidebar) too.
  useEffect(() => {
    const form = formRef.current
    if (!form || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => measure())
    ro.observe(form)
    return () => ro.disconnect()
  }, [measure])

  // Re-measure once the custom font arrives (metrics change after swap).
  useEffect(() => {
    if (!document.fonts) return
    let on = true
    document.fonts.ready
      .then(() => {
        if (on) measure()
      })
      .catch(() => undefined)
    return () => {
      on = false
    }
  }, [measure])

  const setValue = (k: number, v: string) => {
    if (checked) return
    setValues((prev) => {
      const next = [...prev]
      next[k] = v
      return next
    })
  }

  const check = () => {
    if (answered.current || checked) return
    if (values.every((v) => normalize(v) === '')) return
    answered.current = true
    const kinds = gaps.map((g, k) => slotKind(values[k] ?? '', tokens[g]?.word ?? ''))
    setChecked(kinds)
    const overall: Fuzzy = kinds.every((k) => k === 'exact')
      ? 'exact'
      : kinds.every((k) => k === 'exact' || k === 'close')
        ? 'close'
        : 'wrong'
    cb.current(overall, hintsUsed)
  }
  const checkR = useRef(check)
  checkR.current = check

  const revealLetter = () => {
    if (answered.current || checked) return
    const k = gaps.findIndex(
      (g, i) => slotKind(values[i] ?? '', tokens[g]?.word ?? '') !== 'exact',
    )
    if (k === -1) return
    const ans = tokens[gaps[k]]?.word ?? ''
    const cur = (values[k] ?? '').toLowerCase()
    const lowAns = ans.toLowerCase()
    let i = 0
    while (i < cur.length && i < lowAns.length && cur[i] === lowAns[i]) i++
    if (i >= ans.length) return
    setValue(k, ans.slice(0, i + 1))
    setHintsUsed((h) => h + 1)
  }

  const correctCount = checked ? checked.filter((k) => k === 'exact').length : 0
  const allExact = checked !== null && checked.every((k) => k === 'exact')
  const hasAnyValue = values.some((v) => normalize(v) !== '')

  const banner =
    checked === null
      ? null
      : allExact
        ? { cls: 'text-[#5AD4B5]', icon: faCheck, text: t('cards.common.correct') }
        : {
            cls: 'text-[#fb7185]',
            icon: faXmark,
            text: t('cards.assemble.score', { ok: correctCount, n: gaps.length }),
          }

  return (
    <div
      data-testid="cloze-card"
      className="rounded-[24px] border border-white/[0.08] bg-[#171717] p-6 sm:p-8 flex flex-col gap-4 overflow-hidden relative select-none"
    >
      <div className="absolute -right-14 -top-14 w-52 h-52 rounded-full bg-[#5AD4B5]/[0.09] blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 relative">
        <span className="px-2.5 py-1 rounded-full bg-[#5AD4B5]/10 border border-[#5AD4B5]/25 text-[#5AD4B5] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <FontAwesomeIcon icon={faPuzzlePiece} className="text-[10px]" /> {t('cards.cloze.title')}
        </span>
      </div>

      <div className="text-center relative">
        <div className="text-[30px] sm:text-[38px] font-black tracking-tight leading-tight break-words">
          {native}
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          checkR.current()
        }}
        className="relative overflow-hidden"
      >
        <p className="text-center text-[22px] sm:text-[28px] font-black leading-[2.1] tracking-tight">
          {tokens.map((tok, i) => {
            if (!gapSet.has(i)) {
              return (
                <span key={i}>
                  <span className="text-white/85 whitespace-nowrap">
                    {tok.lead}
                    {tok.word}
                    {tok.trail}
                  </span>
                  {i < tokens.length - 1 ? ' ' : ''}
                </span>
              )
            }
            const k = valueIdx.get(i) ?? 0
            const kind = checked?.[k] ?? null
            const wrong = kind !== null && kind !== 'exact'
            return (
              <span key={i}>
                <span className="inline-flex flex-col items-center align-baseline whitespace-nowrap max-w-full min-w-0">
                <span className="inline-flex items-baseline max-w-full min-w-0">
                  {tok.lead !== '' && <span className="text-white/30">{tok.lead}</span>}
                  <input
                    autoFocus={k === 0}
                    value={values[k] ?? ''}
                    onChange={(ev) => setValue(k, ev.target.value)}
                    disabled={checked !== null}
                    placeholder={'•'.repeat(Math.min(tok.word.length, 12))}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-label={t('cards.assemble.word_aria', { n: k + 1 })}
                    style={{
                      width: widths[k]
                        ? `${widths[k]}px`
                        : `calc(${Math.max(2, tok.word.length)}ch + 1.5rem)`,
                      maxWidth: '100%',
                    }}
                    className={`mx-1 min-w-0 max-w-full px-2.5 py-1 rounded-xl text-center text-[20px] sm:text-[24px] font-black bg-black/30 border transition-colors focus:outline-none disabled:opacity-100 ${
                      kind === null
                        ? 'border-dashed border-white/25 focus:border-[#5AD4B5]/60'
                        : kind === 'exact'
                          ? 'border-[#5AD4B5]/60 bg-[#5AD4B5]/[0.08] text-[#5AD4B5]'
                          : kind === 'close'
                            ? 'border-[#ff9d5c]/60 bg-[#ff9d5c]/[0.08] text-[#ff9d5c]'
                            : 'border-[#f43f5e]/60 bg-[#f43f5e]/[0.08] text-[#fb7185]'
                    }`}
                  />
                  {tok.trail !== '' && <span className="text-white/30">{tok.trail}</span>}
                </span>
                {wrong && (
                  <span className="text-[12px] font-bold text-[#fb7185] leading-tight max-w-full break-words">
                    {tok.word}
                  </span>
                )}
                </span>
                {i < tokens.length - 1 ? ' ' : ''}
              </span>
            )
          })}
        </p>
        {/* Width mirror: same font as the inputs, never visible. */}
        <span
          ref={mirrorRef}
          aria-hidden
          className="absolute invisible whitespace-pre text-[20px] sm:text-[24px] font-black tracking-tight"
        />
      </form>

      {banner && (
        <div
          className={`text-[18px] font-black flex items-center justify-center gap-2 ${banner.cls} relative`}
        >
          <FontAwesomeIcon icon={banner.icon} />
          {banner.text}
        </div>
      )}

      {!checked && (
        <div className="flex items-center justify-center gap-2 relative flex-wrap">
          <button
            type="button"
            onClick={revealLetter}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#F5C16A]/80 hover:text-[#F5C16A] transition"
          >
            <FontAwesomeIcon icon={faLightbulb} className="text-[11px]" />
            {t('cards.assemble.hint_letter', {
              tail: hintsUsed > 0 ? t('cards.flash.hint_used', { n: hintsUsed }) : '',
            })}
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => checkR.current()}
            disabled={!hasAnyValue}
            className="px-6 py-2.5 rounded-2xl bg-[#5AD4B5] text-black text-sm font-black hover:brightness-110 transition disabled:opacity-40"
          >
            {t('cards.assemble.check')}
          </motion.button>
        </div>
      )}
      <div className="text-center text-[12px] font-bold text-white/35 relative">
        {checked ? t('cards.common.auto_graded') : t('cards.cloze.enter_hint')}
      </div>
    </div>
  )
}
