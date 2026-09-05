import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faCheck, faXmark, faScaleBalanced } from '@fortawesome/free-solid-svg-icons'

interface BoolCardProps {
  word: string
  translation: string
  /** Whether the shown pair is actually correct. */
  isCorrect: boolean
  /** Speaker for the word (target language). */
  wordSpeak: { text: string; lang: string }
  speakingKey: string | null
  forceReveal: boolean
  answerRef: MutableRefObject<((v: boolean) => void) | null>
  onSpeak: (text: string, lang: string, key: string) => void
  onAnswer: (correct: boolean) => void
}

export default function BoolCard({
  word,
  translation,
  isCorrect,
  wordSpeak,
  speakingKey,
  forceReveal,
  answerRef,
  onSpeak,
  onAnswer,
}: BoolCardProps) {
  const [said, setSaid] = useState<boolean | null>(null)
  const answered = useRef(false)
  const cb = useRef(onAnswer)
  cb.current = onAnswer

  const answer = (v: boolean) => {
    if (answered.current) return
    answered.current = true
    setSaid(v)
    cb.current(v === isCorrect)
  }
  const answerR = useRef(answer)
  answerR.current = answer

  useEffect(() => {
    answerRef.current = (v: boolean) => answerR.current(v)
    return () => {
      answerRef.current = null
    }
  }, [answerRef])

  useEffect(() => {
    if (forceReveal && !answered.current) {
      answered.current = true
      setSaid(null)
      cb.current(false)
    }
  }, [forceReveal])

  const done = said !== null || forceReveal
  const verdictOk = said !== null ? said === isCorrect : false

  return (
    <div
      data-testid="bool-card"
      className="rounded-[24px] border border-white/[0.08] bg-[#171717] p-6 sm:p-8 flex flex-col gap-5 overflow-hidden relative select-none"
    >
      <div className="absolute -right-14 -top-14 w-52 h-52 rounded-full bg-[#F5C16A]/[0.08] blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 relative">
        <span className="px-2.5 py-1 rounded-full bg-[#F5C16A]/10 border border-[#F5C16A]/30 text-[#F5C16A] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <FontAwesomeIcon icon={faScaleBalanced} className="text-[10px]" /> Верно или нет?
        </span>
        <button
          onClick={() => onSpeak(wordSpeak.text, wordSpeak.lang, 'bool-q')}
          aria-label="Озвучить слово"
          className={`ml-auto w-10 h-10 rounded-full grid place-items-center border transition-all ${
            speakingKey === 'bool-q'
              ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
              : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
          }`}
        >
          <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
        </button>
      </div>

      <div className="text-center relative">
        <div className="text-[34px] sm:text-[44px] font-black tracking-tight leading-tight break-words">
          {word}
        </div>
        <div className="text-white/30 font-black text-xl my-1">=</div>
        <div className="text-[26px] sm:text-[32px] font-black tracking-tight leading-tight text-white/85 break-words">
          {translation}
        </div>
      </div>

      {done ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-center text-[19px] font-black flex items-center justify-center gap-2 ${
            verdictOk
              ? 'bg-[#5AD4B5]/[0.1] border-[#5AD4B5]/50 text-[#5AD4B5]'
              : 'bg-[#f43f5e]/[0.1] border-[#f43f5e]/50 text-[#fb7185]'
          }`}
        >
          <FontAwesomeIcon icon={verdictOk ? faCheck : faXmark} />
          {verdictOk ? 'Верно!' : isCorrect ? 'Пара была верной' : 'Пара была неверной'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 relative">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => answer(true)}
            className="py-3.5 rounded-2xl bg-[#5AD4B5]/[0.12] border border-[#5AD4B5]/40 text-[#5AD4B5] text-[16px] font-black hover:bg-[#5AD4B5]/[0.2] transition flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faCheck} /> Верно
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => answer(false)}
            className="py-3.5 rounded-2xl bg-[#f43f5e]/[0.12] border border-[#f43f5e]/40 text-[#fb7185] text-[16px] font-black hover:bg-[#f43f5e]/[0.2] transition flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faXmark} /> Неверно
          </motion.button>
        </div>
      )}
      <div className="text-center text-[12px] font-bold text-white/35 relative">
        {done ? 'оценка выставлена автоматически' : 'клик или клавиши 1 / 2'}
      </div>
    </div>
  )
}
