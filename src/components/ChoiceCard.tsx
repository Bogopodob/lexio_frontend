import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faCheck, faXmark, faListUl } from '@fortawesome/free-solid-svg-icons'
import { useT } from '@/lib/i18n'

interface ChoiceCardProps {
  question: string
  transcription: string | null
  /** Speaker for the question; null when the question is in the native language. */
  questionSpeak: { text: string; lang: string } | null
  options: string[]
  correctIdx: number
  speakingKey: string | null
  forceReveal: boolean
  pickRef: MutableRefObject<((i: number) => void) | null>
  onSpeak: (text: string, lang: string, key: string) => void
  onAnswer: (correct: boolean) => void
}

export default function ChoiceCard({
  question,
  transcription,
  questionSpeak,
  options,
  correctIdx,
  speakingKey,
  forceReveal,
  pickRef,
  onSpeak,
  onAnswer,
}: ChoiceCardProps) {
  const t = useT()
  const [picked, setPicked] = useState<number | null>(null)
  const answered = useRef(false)
  const cb = useRef(onAnswer)
  cb.current = onAnswer

  const pick = (i: number) => {
    if (answered.current || i < 0 || i >= options.length) return
    answered.current = true
    setPicked(i)
    cb.current(i === correctIdx)
  }
  const pickR = useRef(pick)
  pickR.current = pick

  useEffect(() => {
    pickRef.current = (i: number) => pickR.current(i)
    return () => {
      pickRef.current = null
    }
  }, [pickRef])

  useEffect(() => {
    if (forceReveal && !answered.current) {
      answered.current = true
      setPicked(-1)
      cb.current(false)
    }
  }, [forceReveal])

  const done = picked !== null

  return (
    <div
      data-testid="choice-card"
      className="rounded-[24px] border border-white/[0.08] bg-[#171717] p-6 sm:p-8 flex flex-col gap-4 overflow-hidden relative select-none"
    >
      <div className="absolute -right-14 -top-14 w-52 h-52 rounded-full bg-[#5B74FF]/[0.09] blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 relative">
        <span className="px-2.5 py-1 rounded-full bg-[#5B74FF]/15 border border-[#5B74FF]/30 text-[#8b9bff] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <FontAwesomeIcon icon={faListUl} className="text-[10px]" /> {t('cards.choice.title')}
        </span>
        {questionSpeak && (
          <button
            onClick={() => onSpeak(questionSpeak.text, questionSpeak.lang, 'choice-q')}
            aria-label={t('cards.common.speak_word')}
            className={`ml-auto w-10 h-10 rounded-full grid place-items-center border transition-all ${
              speakingKey === 'choice-q'
                ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
                : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
            }`}
          >
            <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
          </button>
        )}
      </div>

      <div className="text-center relative">
        <h2 className="text-[36px] sm:text-[46px] font-black tracking-tight leading-tight break-words">
          {question}
        </h2>
        {transcription ? (
          <div className="mt-2 inline-block px-4 py-1 rounded-full bg-[#5AD4B5]/[0.08] border border-[#5AD4B5]/25 text-[#5AD4B5] text-[15px] font-bold tabular-nums">
            [{transcription}]
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 relative">
        {options.map((opt, i) => {
          const isCorrect = i === correctIdx
          const isPicked = i === picked
          let cls = 'bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.09]'
          let badge = (
            <span className="w-7 h-7 shrink-0 rounded-full grid place-items-center bg-white/[0.07] text-[12px] font-black tabular-nums">
              {i + 1}
            </span>
          )
          if (done && isCorrect) {
            cls = 'bg-[#5AD4B5]/[0.12] border-[#5AD4B5]/50'
            badge = (
              <span className="w-7 h-7 shrink-0 rounded-full grid place-items-center bg-[#5AD4B5] text-black text-[12px]">
                <FontAwesomeIcon icon={faCheck} />
              </span>
            )
          } else if (done && isPicked) {
            cls = 'bg-[#f43f5e]/[0.12] border-[#f43f5e]/50'
            badge = (
              <span className="w-7 h-7 shrink-0 rounded-full grid place-items-center bg-[#f43f5e] text-white text-[12px]">
                <FontAwesomeIcon icon={faXmark} />
              </span>
            )
          }
          return (
            <motion.button
              key={`${opt}-${i}`}
              onClick={() => pick(i)}
              disabled={done}
              whileTap={done ? undefined : { scale: 0.98 }}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${cls}`}
            >
              {badge}
              <span className="flex-1 min-w-0 font-black text-[16px] sm:text-[18px] leading-snug break-words">
                {opt}
              </span>
            </motion.button>
          )
        })}
      </div>
      <div className="text-center text-[12px] font-bold text-white/35 relative">
        {done ? t('cards.common.auto_graded') : t('cards.choice.keys_hint')}
      </div>
    </div>
  )
}
