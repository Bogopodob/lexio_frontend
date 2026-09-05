import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faCheck, faXmark, faArrowRight, faLightbulb, faLink } from '@fortawesome/free-solid-svg-icons'
import { normalize, fuzzyMatch, type Fuzzy } from '@/lib/study'

interface FormsCardProps {
  /** All accepted v1 variants (usually one). */
  v1forms: string[]
  /** Accepted v2 variants. */
  past: string[]
  /** Accepted v3 variants. */
  participle: string[]
  /** Native translation shown as the prompt. */
  native: string
  wordSpeak: { text: string; lang: string }
  speakingKey: string | null
  onSpeak: (text: string, lang: string, key: string) => void
  onAnswer: (kind: Fuzzy, hintsUsed: number) => void
}

export default function FormsCard({
  v1forms,
  past,
  participle,
  native,
  wordSpeak,
  speakingKey,
  onSpeak,
  onAnswer,
}: FormsCardProps) {
  // One random gap per card mount (remounts on every card via parent key).
  const blankIdx = useMemo(() => Math.floor(Math.random() * 3), []);
  const candidates = blankIdx === 0 ? v1forms : blankIdx === 1 ? past : participle;

  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<Fuzzy | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const answered = useRef(false)
  const cb = useRef(onAnswer)
  cb.current = onAnswer;

  const check = () => {
    const v = normalize(value)
    if (!v || answered.current) return
    answered.current = true
    const { kind } = fuzzyMatch(value, candidates)
    setChecked(kind)
    cb.current(kind, hintsUsed)
  }
  const checkR = useRef(check)
  checkR.current = check

  const revealLetter = () => {
    const ans = candidates[0] ?? ''
    if (!ans || answered.current) return
    const lowAns = ans.toLowerCase()
    const lowCur = value.toLowerCase()
    let i = 0
    while (i < lowCur.length && i < lowAns.length && lowCur[i] === lowAns[i]) i++
    if (i >= ans.length) return
    setValue(ans.slice(0, i + 1))
    setHintsUsed((h) => h + 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.stopPropagation()
        checkR.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  const answerWord = candidates[0] ?? ''
  const fullyRevealed = value.toLowerCase() === answerWord.toLowerCase() && answerWord !== ''
  const done = checked !== null

  const banner =
    checked === 'exact'
      ? { box: 'bg-[#5AD4B5]/[0.1] border-[#5AD4B5]/50', text: 'text-[#5AD4B5]', icon: faCheck, label: 'Правильно!' }
      : checked === 'close'
        ? { box: 'bg-[#ff9d5c]/[0.1] border-[#ff9d5c]/50', text: 'text-[#ff9d5c]', icon: faCheck, label: 'Почти верно!' }
        : checked === 'wrong'
          ? { box: 'bg-[#f43f5e]/[0.1] border-[#f43f5e]/50', text: 'text-[#fb7185]', icon: faXmark, label: 'Неправильно' }
          : null

  const slot = (idx: number, text: string) => {
    if (idx !== blankIdx) {
      return (
        <span
          key={idx}
          className="px-3 py-2 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-[20px] sm:text-[24px] font-black break-words text-center"
        >
          {text}
        </span>
      )
    }
    if (!done) {
      return (
        <input
          key={idx}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Пропущенная форма"
          className="flex-1 min-w-[110px] px-3 py-2 rounded-2xl bg-black/30 border border-dashed border-[#5AD4B5]/50 text-[20px] sm:text-[24px] font-black text-center placeholder:text-white/25 focus:outline-none focus:border-[#5AD4B5]"
        />
      )
    }
    return (
      <span
        key={idx}
        className={`px-3 py-2 rounded-2xl border text-[20px] sm:text-[24px] font-black break-words text-center ${
          checked === 'exact'
            ? 'bg-[#5AD4B5]/[0.12] border-[#5AD4B5]/50'
            : checked === 'close'
              ? 'bg-[#ff9d5c]/[0.12] border-[#ff9d5c]/50'
              : 'bg-[#f43f5e]/[0.12] border-[#f43f5e]/50'
        }`}
      >
        {checked === 'wrong' ? answerWord : value.trim()}
      </span>
    )
  }

  return (
    <div
      data-testid="forms-card"
      className="rounded-[24px] border border-white/[0.08] bg-[#171717] p-6 sm:p-8 flex flex-col gap-4 overflow-hidden relative select-none"
    >
      <div className="absolute -right-14 -top-14 w-52 h-52 rounded-full bg-[#5AD4B5]/[0.09] blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 relative">
        <span className="px-2.5 py-1 rounded-full bg-[#5AD4B5]/10 border border-[#5AD4B5]/25 text-[#5AD4B5] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <FontAwesomeIcon icon={faLink} className="text-[10px]" /> Впиши пропуск
        </span>
        <button
          onClick={() => onSpeak(wordSpeak.text, wordSpeak.lang, 'forms-q')}
          aria-label="Озвучить слово"
          className={`ml-auto w-10 h-10 rounded-full grid place-items-center border transition-all ${
            speakingKey === 'forms-q'
              ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
              : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
          }`}
        >
          <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
        </button>
      </div>

      <div className="text-center text-[22px] sm:text-[26px] font-black text-white/80 break-words relative">
        {native}
      </div>

      <div className="flex items-stretch justify-center gap-1.5 relative">
        {slot(0, v1forms[0] ?? '')}
        <span className="self-center text-[#5AD4B5] font-black text-lg shrink-0">
          <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
        </span>
        {slot(1, past[0] ?? '')}
        <span className="self-center text-[#5AD4B5] font-black text-lg shrink-0">
          <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
        </span>
        {slot(2, participle[0] ?? '')}
      </div>
      {banner && (
        <div className={`rounded-2xl border px-4 py-2.5 text-center ${banner.box} relative`}>
          <div className={`text-[19px] font-black flex items-center justify-center gap-2 ${banner.text}`}>
            <FontAwesomeIcon icon={banner.icon} />
            {banner.label}
          </div>
          {checked !== 'exact' && (
            <div className="mt-1 text-[13px] font-bold text-white/60">
              Ты: «{value.trim()}» → надо: <span className="text-white">«{answerWord}»</span>
            </div>
          )}
        </div>
      )}

      {!done && (
        <div className="flex items-center justify-center gap-2 relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={revealLetter}
            disabled={fullyRevealed}
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#F5C16A]/80 hover:text-[#F5C16A] transition disabled:opacity-30"
          >
            <FontAwesomeIcon icon={faLightbulb} className="text-[11px]" />
            Буква (−1 к оценке{hintsUsed > 0 ? `: ${hintsUsed}` : ''})
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={check}
            disabled={normalize(value) === ''}
            className="px-6 py-2.5 rounded-2xl bg-[#5AD4B5] text-black text-sm font-black hover:brightness-110 transition disabled:opacity-40"
          >
            Проверить
          </motion.button>
        </div>
      )}
      <div className="text-center text-[12px] font-bold text-white/35 relative">
        {done ? 'оценка выставлена автоматически' : 'Enter — проверить'}
      </div>
    </div>
  )
}
