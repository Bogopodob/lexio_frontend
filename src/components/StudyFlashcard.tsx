import { useRef } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faCheck, faRotateLeft, faEye, faLanguage } from '@fortawesome/free-solid-svg-icons'

interface StudyFlashcardProps {
  frontText: string
  transcription: string | null
  hint: string | null
  backTexts: string[]
  flipped: boolean
  speakingKey: string | null
  frontLang: string
  backLang: string
  onFlip: () => void
  onSpeak: (text: string, lang: string, key: string) => void
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

export default function StudyFlashcard({
  frontText,
  transcription,
  hint,
  backTexts,
  flipped,
  speakingKey,
  frontLang,
  backLang,
  onFlip,
  onSpeak,
  onSwipeLeft,
  onSwipeRight,
}: StudyFlashcardProps) {
  const dragX = useMotionValue(0)
  const leftOpacity = useTransform(dragX, [-130, -35], [1, 0])
  const rightOpacity = useTransform(dragX, [35, 130], [0, 1])
  const suppressed = useRef(false)
  const dragState = useRef<{ id: number; startX: number } | null>(null)

  const firstLetter = (frontText.trim()[0] ?? '?').toUpperCase()

  return (
    <div className="relative" style={{ perspective: 1400 }}>
      <motion.div style={{ transformStyle: 'preserve-3d' }}>
        <motion.div
          data-testid="study-card"
          className="relative min-h-[320px] sm:min-h-[360px] cursor-pointer select-none"
          style={{ transformStyle: 'preserve-3d', x: dragX, touchAction: flipped ? 'pan-y' : 'auto' }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24 }}
          onPointerDown={(e) => {
            if (!flipped) return
            ;(e.target as Element).setPointerCapture?.(e.pointerId)
            dragState.current = { id: e.pointerId, startX: e.clientX }
          }}
          onPointerMove={(e) => {
            const st = dragState.current
            if (!st || st.id !== e.pointerId) return
            dragX.set((e.clientX - st.startX) * 0.55)
          }}
          onPointerUp={(e) => {
            const st = dragState.current
            if (!st || st.id !== e.pointerId) return
            dragState.current = null
            const dx = e.clientX - st.startX
            dragX.set(0)
            if (Math.abs(dx) < 12) return
            suppressed.current = true
            if (dx > 90) onSwipeRight()
            else if (dx < -90) onSwipeLeft()
            else suppressed.current = false
          }}
          onPointerCancel={() => {
            dragState.current = null
            dragX.set(0)
          }}
          onClick={() => {
            if (suppressed.current) {
              suppressed.current = false
              return
            }
            onFlip()
          }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#171717] p-6 sm:p-8 flex flex-col"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute -right-14 -top-14 w-52 h-52 rounded-full bg-[#5AD4B5]/[0.09] blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-16 w-44 h-44 rounded-full bg-[#5B74FF]/[0.08] blur-3xl pointer-events-none" />
            <div
              className="absolute -right-2 -bottom-8 font-black leading-none pointer-events-none select-none"
              style={{ fontSize: 190, color: 'rgba(255,255,255,0.045)' }}
              aria-hidden
            >
              {firstLetter}
            </div>

            <div className="flex items-center gap-2 relative">
              {hint && (
                <span className="px-2.5 py-1 rounded-full bg-[#5AD4B5]/10 border border-[#5AD4B5]/25 text-[#5AD4B5] text-[11px] font-black uppercase tracking-widest">
                  {hint}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSpeak(frontText, frontLang, 'front')
                }}
                aria-label="Озвучить слово"
                className={`ml-auto w-10 h-10 rounded-full grid place-items-center border transition-all ${
                  speakingKey === 'front'
                    ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
                    : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
                }`}
              >
                <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
              </button>
            </div>

            <div className="flex-1 grid place-items-center py-6 relative">
              <div className="text-center">
                <h2 className="text-[40px] sm:text-[52px] font-black tracking-tight leading-none">
                  {frontText}
                </h2>
                {transcription ? (
                  <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#5AD4B5]/[0.08] border border-[#5AD4B5]/25 text-[#5AD4B5] text-[17px] font-bold tabular-nums tracking-wide">
                    [{transcription}]
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-white/35 relative">
              <FontAwesomeIcon icon={faEye} className="text-[11px]" />
              клик / пробел — перевод
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 overflow-hidden rounded-[24px] border border-[#5AD4B5]/25 bg-[#141a18] p-6 sm:p-8 flex flex-col"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute -left-14 -top-14 w-52 h-52 rounded-full bg-[#5AD4B5]/[0.1] blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 relative">
              <span className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-widest">
                Перевод
              </span>
              <span className="text-[11px] text-white/40 font-bold flex items-center gap-1.5">
                <FontAwesomeIcon icon={faLanguage} /> {backTexts.length > 1 ? `${backTexts.length} варианта` : '1 вариант'}
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2 py-4 relative">
              {backTexts.length > 0 ? (
                backTexts.map((t, i) => (
                  <div
                    key={`${t}-${i}`}
                    className={`flex items-center gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] px-4 ${backTexts.length > 3 ? 'py-1.5' : 'py-2.5'}`}
                  >
                    <span className={`flex-1 font-black leading-snug ${backTexts.length > 3 ? 'text-[15px]' : 'text-[19px] sm:text-[22px]'}`}>{t}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSpeak(t, backLang, `back-${i}`)
                      }}
                      aria-label={`Озвучить: ${t}`}
                      className={`w-9 h-9 shrink-0 rounded-full grid place-items-center border transition-all ${
                        speakingKey === `back-${i}`
                          ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
                          : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
                      }`}
                    >
                      <FontAwesomeIcon icon={faVolumeHigh} className="text-xs" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-white/40 text-sm">Перевода пока нет</div>
              )}
            </div>

            <div className="text-center text-[12px] font-bold text-white/35 relative">
              свайп <span className="text-[#f43f5e]">←</span> / <span className="text-[#5AD4B5]">→</span> — тоже оценка
            </div>
          </div>

          {/* swipe hints */}
          <motion.div
            className="absolute inset-y-0 left-0 w-24 grid place-items-center pointer-events-none"
            style={{ opacity: leftOpacity }}
          >
            <span className="w-14 h-14 rounded-full grid place-items-center bg-[#f43f5e]/90 text-white text-xl shadow-[0_0_30px_rgba(244,63,94,0.6)]">
              <FontAwesomeIcon icon={faRotateLeft} />
            </span>
          </motion.div>
          <motion.div
            className="absolute inset-y-0 right-0 w-24 grid place-items-center pointer-events-none"
            style={{ opacity: rightOpacity }}
          >
            <span className="w-14 h-14 rounded-full grid place-items-center bg-[#5AD4B5]/90 text-black text-xl shadow-[0_0_30px_rgba(90,212,181,0.6)]">
              <FontAwesomeIcon icon={faCheck} />
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
