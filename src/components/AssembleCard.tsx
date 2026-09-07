import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faXmark, faPuzzlePiece, faLightbulb, faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { normalize, fuzzyMatch, shuffle, type Fuzzy } from '@/lib/study'
import { useT } from '@/lib/i18n'

interface AssembleCardProps {
  words: string[]
  native: string
  /** Grey leading punctuation per slot (shown, not graded). */
  leads?: string[]
  /** Grey trailing punctuation per slot (shown, not graded). */
  trails?: string[]
  /** Show the shuffled word bank above the inputs (tap fills, typing still works). */
  wordBank?: boolean
  onAnswer: (kind: Fuzzy, hintsUsed: number) => void
}

const stripPunct = (s: string) => s.replace(/[.?!,;:…«»"“”'’()\-]+$/u, '')

function slotKind(value: string, expected: string): Fuzzy {
  const v = stripPunct(normalize(value))
  const e = stripPunct(normalize(expected))
  if (v === '') return 'wrong'
  if (v === e) return 'exact'
  return fuzzyMatch(value, [expected]).kind === 'close' ? 'close' : 'wrong'
}

export default function AssembleCard({
  words,
  native,
  leads,
  trails,
  wordBank,
  onAnswer,
}: AssembleCardProps) {
  const t = useT()
  const [values, setValues] = useState<string[]>(() => words.map(() => ''))
  const [checked, setChecked] = useState<Fuzzy[] | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  /** Which bank chip sits in each slot (null = typed by hand / empty). */
  const [usedChip, setUsedChip] = useState<(number | null)[]>(() => words.map(() => null))
  const answered = useRef(false)
  const cb = useRef(onAnswer)
  cb.current = onAnswer

  const expected = useMemo(() => words.map((w) => w.trim()).filter((w) => w !== ''), [words])
  const n = expected.length
  const showBank = wordBank === true && n > 1

  // Stable shuffle per phrase (no jumping on re-renders).
  const bankOrder = useMemo(
    () => shuffle(expected.map((_, i) => i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expected.join(' ')],
  )
  const usedSet = useMemo(() => new Set(usedChip.filter((c): c is number => c !== null)), [usedChip])

  const setValue = (i: number, v: string, chip: number | null = null) => {
    if (checked) return
    setValues((prev) => {
      const next = [...prev]
      while (next.length < n) next.push('')
      next[i] = v
      return next
    })
    setUsedChip((prev) => {
      const next = [...prev]
      while (next.length < n) next.push(null)
      next[i] = chip
      return next
    })
  }

  const tapChip = (j: number) => {
    if (checked || usedSet.has(j)) return
    const idx = values.findIndex((v) => normalize(v) === '')
    if (idx === -1) return
    setValue(idx, expected[j] ?? '', j)
  }

  const clearSlot = (i: number) => {
    if (checked) return
    setValue(i, '', null)
  }

  const resetAll = () => {
    if (checked) return
    setValues(expected.map(() => ''))
    setUsedChip(expected.map(() => null))
  }

  const check = () => {
    if (answered.current || checked) return
    if (values.every((v) => normalize(v) === '')) return
    answered.current = true
    const kinds = expected.map((e, i) => slotKind(values[i] ?? '', e))
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
    const idx = expected.findIndex((e, i) => slotKind(values[i] ?? '', e) !== 'exact')
    if (idx === -1) return
    const ans = expected[idx]
    const cur = (values[idx] ?? '').toLowerCase()
    const lowAns = ans.toLowerCase()
    let i = 0
    while (i < cur.length && i < lowAns.length && cur[i] === lowAns[i]) i++
    if (i >= ans.length) return
    setValue(idx, ans.slice(0, i + 1), null)
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
            text: t('cards.assemble.score', { ok: correctCount, n }),
          }

  return (
    <div
      data-testid="assemble-card"
      className="rounded-[24px] border border-white/[0.08] bg-[#171717] p-6 sm:p-8 flex flex-col gap-4 overflow-hidden relative select-none"
    >
      <div className="absolute -right-14 -top-14 w-52 h-52 rounded-full bg-[#5AD4B5]/[0.09] blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 relative">
        <span className="px-2.5 py-1 rounded-full bg-[#5AD4B5]/10 border border-[#5AD4B5]/25 text-[#5AD4B5] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <FontAwesomeIcon icon={faPuzzlePiece} className="text-[10px]" /> {t('cards.assemble.title')}
        </span>
      </div>

      <div className="text-center relative">
        <div className="text-[30px] sm:text-[38px] font-black tracking-tight leading-tight break-words">
          {native}
        </div>
      </div>

      {showBank && !checked && (
        <div className="relative">
          <div className="text-center text-[11px] font-black uppercase tracking-widest text-white/35 mb-2">
            {t('cards.assemble.bank_title')}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5" role="group" aria-label={t('cards.assemble.bank_title')}>
            {bankOrder.map((j) => {
              const used = usedSet.has(j)
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => tapChip(j)}
                  disabled={used}
                  title={t('cards.assemble.bank_tap_hint')}
                  className={`px-3.5 py-2 rounded-2xl text-[15px] font-black border transition-all ${
                    used
                      ? 'bg-white/[0.02] border-white/[0.05] text-white/20 line-through'
                      : 'bg-[#5AD4B5]/[0.08] border-[#5AD4B5]/30 text-white hover:bg-[#5AD4B5]/[0.16] hover:-translate-y-0.5 active:translate-y-0'
                  }`}
                >
                  {expected[j]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <form
        className="flex flex-wrap justify-center items-start gap-2 relative"
        onSubmit={(e) => {
          e.preventDefault()
          checkR.current()
        }}
      >
        {expected.map((e, i) => {
          const kind = checked?.[i] ?? null
          const wrong = kind !== null && kind !== 'exact'
          const lead = leads?.[i] ?? ''
          const trail = trails?.[i] ?? ''
          return (
            <div key={i} className="flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-center gap-0.5 min-w-0">
                {lead !== '' && (
                  <span className="text-[17px] font-black text-white/30 shrink-0">{lead}</span>
                )}
                <div className="relative">
                  <input
                    autoFocus={i === 0}
                    value={values[i] ?? ''}
                    onChange={(ev) => setValue(i, ev.target.value, null)}
                    disabled={checked !== null}
                    placeholder={'•'.repeat(Math.min(e.length, 12))}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    aria-label={t('cards.assemble.word_aria', { n: i + 1 })}
                    style={{
                      // Slot fits its own word: expected length in ch + room for
                      // paddings and the × clear button when filled.
                      width: `calc(${Math.max(2, e.length)}ch + ${values[i] ? '3rem' : '1.75rem'})`,
                      maxWidth: '100%',
                    }}
                    className={`px-3 py-2.5 rounded-2xl text-center text-[17px] font-bold bg-black/30 border transition-colors focus:outline-none disabled:opacity-100 ${
                      values[i] ? 'pr-8' : ''
                    } ${
                      kind === null
                        ? 'border-white/[0.12] focus:border-[#5AD4B5]/60'
                        : kind === 'exact'
                          ? 'border-[#5AD4B5]/60 bg-[#5AD4B5]/[0.08]'
                          : kind === 'close'
                            ? 'border-[#ff9d5c]/60 bg-[#ff9d5c]/[0.08]'
                            : 'border-[#f43f5e]/60 bg-[#f43f5e]/[0.08]'
                    }`}
                  />
                  {values[i] && !checked && (
                    <button
                      type="button"
                      onClick={() => clearSlot(i)}
                      aria-label={t('cards.assemble.clear_slot')}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full grid place-items-center text-white/35 hover:text-white hover:bg-white/10 transition text-[11px] leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
                {trail !== '' && (
                  <span className="text-[17px] font-black text-white/30 shrink-0">{trail}</span>
                )}
              </div>
              {wrong && (
                <span className="text-[12px] font-bold text-[#fb7185] break-words max-w-[140px]">
                  {e}
                </span>
              )}
            </div>
          )
        })}
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
          {hasAnyValue && (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white/40 hover:text-white transition"
            >
              <FontAwesomeIcon icon={faRotateLeft} className="text-[11px]" />
              {t('cards.assemble.reset')}
            </button>
          )}
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
        {checked
          ? t('cards.common.auto_graded')
          : t('cards.assemble.enter_hint')}
      </div>
    </div>
  )
}
