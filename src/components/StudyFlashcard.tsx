import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faCheck, faXmark, faRotateLeft, faEye, faEyeSlash, faLanguage, faKeyboard, faHeadphones, faLightbulb, faPen, faCircleCheck } from '@fortawesome/free-solid-svg-icons'
import { normalize, fuzzyMatch, type Fuzzy } from '@/lib/study'
import { useT } from '@/lib/i18n'

export type CardMode = 'f2n' | 'n2f' | 'typing' | 'audio'

export interface WordBadgeData {
  label: string
  color: string
}

interface StudyFlashcardProps {
  mode: CardMode
  targetTexts: string[]
  nativeTexts: string[]
  transcription: string | null
  forms: { form: string; form_type: string; transcription: string | null }[]
  formsPattern: string | null
  hint: string | null
  flipped: boolean
  speakingKey: string | null
  targetLang: string
  nativeLang: string
  /** Hide transcription behind a tap (spoiler setting). */
  hideTranscription: boolean
  /** Word maturity badge (smart mix / progress). */
  badge: WordBadgeData | null
  ownHint: string | null
  onSaveHint: (hint: string) => void
  onFlip: () => void
  onSpeak: (text: string, lang: string, key: string) => void
  onSwipeLeft: () => void
  onSwipeRight: () => void
  /** Typing check result (for auto-grade in the parent). */
  onChecked?: (kind: Fuzzy, hintsUsed: number) => void
  /** Audio mode: play the word once when the card appears. */
  onMountAudio?: () => void
}

function OwnHintBlock({ hint, onSave }: { hint: string | null; onSave: (h: string) => void }) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(hint ?? '')

  useEffect(() => {
    setEditing(false)
    setDraft(hint ?? '')
  }, [hint])

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          setDraft(hint ?? '')
          setEditing(true)
        }}
        className="flex items-center gap-2 rounded-xl bg-[#F5C16A]/[0.06] border border-[#F5C16A]/20 px-3 py-1.5 text-left hover:bg-[#F5C16A]/[0.1] transition w-full"
      >
        <FontAwesomeIcon icon={faLightbulb} className="text-[#F5C16A] text-xs shrink-0" />
        <span className="flex-1 min-w-0 text-[13px] font-bold text-white/70 truncate">
          {hint ?? t('cards.flash.own_hint_add')}
        </span>
        <FontAwesomeIcon icon={faPen} className="text-white/30 text-[11px] shrink-0" />
      </button>
    )
  }

  return (
    <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={draft}
        maxLength={280}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') {
            onSave(draft.trim())
            setEditing(false)
          }
          if (e.key === 'Escape') setEditing(false)
        }}
        placeholder={t('cards.flash.own_hint_ph')}
        aria-label={t('cards.flash.own_hint_label')}
        className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-black/30 border border-[#F5C16A]/40 text-[13px] font-bold focus:outline-none"
      />
      <button
        onClick={() => {
          onSave(draft.trim())
          setEditing(false)
        }}
        aria-label={t('cards.flash.own_hint_save')}
        className="w-9 shrink-0 rounded-xl bg-[#F5C16A] text-black grid place-items-center hover:brightness-110"
      >
        <FontAwesomeIcon icon={faCircleCheck} className="text-sm" />
      </button>
    </div>
  )
}

export default function StudyFlashcard({
  mode,
  targetTexts,
  nativeTexts,
  transcription,
  forms,
  formsPattern,
  hint,
  flipped,
  speakingKey,
  targetLang,
  nativeLang,
  hideTranscription,
  badge,
  ownHint,
  onSaveHint,
  onFlip,
  onSpeak,
  onSwipeLeft,
  onSwipeRight,
  onChecked,
  onMountAudio,
}: StudyFlashcardProps) {
  const t = useT()
  const dragX = useMotionValue(0)
  const leftOpacity = useTransform(dragX, [-130, -35], [1, 0])
  const rightOpacity = useTransform(dragX, [35, 130], [0, 1])
  const suppressed = useRef(false)
  const dragState = useRef<{ id: number; startX: number } | null>(null)

  const isTyping = mode === 'typing'
  const isAudio = mode === 'audio'
  const displayText = mode === 'f2n' ? (targetTexts[0] ?? '') : (nativeTexts[0] ?? '')
  const displayLang = mode === 'f2n' ? targetLang : nativeLang
  const answers = mode === 'f2n' ? nativeTexts : targetTexts
  const answerLang = mode === 'f2n' ? nativeLang : targetLang
  const backLabel = mode === 'f2n' ? t('cards.flash.back_translation') : mode === 'n2f' ? t('cards.flash.back_word') : mode === 'audio' ? t('cards.flash.back_word') : t('cards.flash.back_answer')

  const [value, setValue] = useState('')
  const [result, setResult] = useState<Fuzzy | null>(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [trShown, setTrShown] = useState(false)
  const checkedCb = useRef(onChecked)
  checkedCb.current = onChecked
  const mountAudioCb = useRef(onMountAudio)
  mountAudioCb.current = onMountAudio

  useEffect(() => {
    setValue('')
    setResult(null)
    setHintsUsed(0)
    setTrShown(false)
  }, [displayText, mode])

  useEffect(() => {
    if (isAudio) mountAudioCb.current?.()
  }, [isAudio, displayText])

  const firstLetter = isAudio ? '♪' : (displayText.trim()[0] ?? '?').toUpperCase()

  // No inner scrolls ever: show at most 6 variants, rest as a counter line.
  const visibleAnswers = answers.slice(0, 6)
  const hiddenCount = answers.length - visibleAnswers.length

  const check = () => {
    const v = normalize(value)
    if (!v || flipped) return
    const { kind } = fuzzyMatch(value, targetTexts)
    setResult(kind)
    onFlip()
    checkedCb.current?.(kind, hintsUsed)
  }

  const revealLetter = () => {
    const ans = targetTexts[0] ?? ''
    if (!ans || flipped) return
    const lowAns = ans.toLowerCase()
    const lowCur = value.toLowerCase()
    let i = 0
    while (i < lowCur.length && i < lowAns.length && lowCur[i] === lowAns[i]) i++
    if (i >= ans.length) return
    setValue(ans.slice(0, i + 1))
    setHintsUsed((h) => h + 1)
  }

  const answerWord = targetTexts[0] ?? ''
  const fullyRevealed = value.toLowerCase() === answerWord.toLowerCase() && answerWord !== ''

  const resultStyle =
    result === 'exact'
      ? { box: 'bg-[#5AD4B5]/[0.1] border-[#5AD4B5]/50 shadow-[0_0_28px_rgba(90,212,181,0.25)]', text: 'text-[#5AD4B5]', icon: faCheck, label: t('cards.common.correct') }
      : result === 'close'
        ? { box: 'bg-[#ff9d5c]/[0.1] border-[#ff9d5c]/50 shadow-[0_0_28px_rgba(255,157,92,0.25)]', text: 'text-[#ff9d5c]', icon: faCheck, label: t('cards.common.almost') }
        : { box: 'bg-[#f43f5e]/[0.1] border-[#f43f5e]/50 shadow-[0_0_28px_rgba(244,63,94,0.25)]', text: 'text-[#fb7185]', icon: faXmark, label: t('cards.common.wrong') }

  const showTrFront = mode === 'f2n' && transcription && (!hideTranscription || trShown)
  const showTrBack = mode !== 'f2n' && transcription && (!hideTranscription || trShown)

  return (
    <div className="relative" style={{ perspective: 1400 }}>
      <motion.div style={{ transformStyle: 'preserve-3d' }}>
        <motion.div
          data-testid="study-card"
          className="relative grid cursor-pointer select-none"
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
            if (isTyping && !flipped) return
            onFlip()
          }}
        >
          {/* FRONT */}
          <div
            className="col-start-1 row-start-1 w-full min-h-[320px] sm:min-h-[360px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#171717] p-6 sm:p-8 flex flex-col"
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

            <div className="flex items-center gap-2 relative flex-wrap">
              {hint && (
                <span className="px-2.5 py-1 rounded-full bg-[#5AD4B5]/10 border border-[#5AD4B5]/25 text-[#5AD4B5] text-[11px] font-black uppercase tracking-widest">
                  {hint}
                </span>
              )}
              {isTyping && (
                <span className="px-2.5 py-1 rounded-full bg-[#5B74FF]/15 border border-[#5B74FF]/30 text-[#8b9bff] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faKeyboard} className="text-[10px]" /> {t('cards.flash.typing_badge')}
                </span>
              )}
              {isAudio && (
                <span className="px-2.5 py-1 rounded-full bg-[#F5C16A]/10 border border-[#F5C16A]/30 text-[#F5C16A] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faHeadphones} className="text-[10px]" /> {t('cards.flash.audio_badge')}
                </span>
              )}
              {badge && (
                <span
                  className="px-2.5 py-1 rounded-full border text-[11px] font-black uppercase tracking-widest"
                  style={{ color: badge.color, borderColor: `${badge.color}55`, background: `${badge.color}14` }}
                >
                  {badge.label}
                </span>
              )}
              {mode === 'f2n' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSpeak(displayText, displayLang, 'front')
                  }}
                    aria-label={t('cards.common.speak_word')}
                  className={`ml-auto w-10 h-10 rounded-full grid place-items-center border transition-all ${
                    speakingKey === 'front'
                      ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
                      : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
                  }`}
                >
                  <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
                </button>
              )}
            </div>

            <div className="flex-1 grid place-items-center py-6 relative">
              <div className="text-center w-full max-w-[420px] min-w-0">
                {isAudio ? (
                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSpeak(answerWord, targetLang, 'audio-front')
                      }}
                      aria-label={t('cards.flash.listen_word')}
                      className={`w-24 h-24 rounded-full grid place-items-center border transition-all ${
                        speakingKey === 'audio-front' || speakingKey === 'audio-q'
                          ? 'bg-[#F5C16A] text-black border-[#F5C16A] shadow-[0_0_44px_rgba(245,193,106,0.45)]'
                          : 'bg-white/[0.06] border-white/[0.12] hover:bg-white/[0.12] shadow-[0_0_30px_rgba(245,193,106,0.15)]'
                      }`}
                    >
                      <FontAwesomeIcon icon={faVolumeHigh} className="text-3xl" />
                    </button>
                    <div className="text-[15px] font-bold text-white/50">{t('cards.flash.audio_what')}</div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-[40px] sm:text-[52px] font-black tracking-tight leading-none break-words">
                      {displayText}
                    </h2>
                    {mode === 'f2n' && transcription ? (
                      showTrFront ? (
                        <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-[#5AD4B5]/[0.08] border border-[#5AD4B5]/25 text-[#5AD4B5] text-[17px] font-bold tabular-nums tracking-wide">
                          [{transcription}]
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setTrShown(true)
                          }}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/[0.04] border border-dashed border-white/[0.15] text-white/40 text-[13px] font-bold hover:text-white/70 transition"
                        >
                          <FontAwesomeIcon icon={faEyeSlash} className="text-[11px]" /> {t('cards.common.show_tr')}
                        </button>
                      )
                    ) : null}
                  </>
                )}
                {isTyping && (
                  <div className="mt-5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation()
                          if (e.key === 'Enter') check()
                        }}
                        placeholder="Type in English…"
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        aria-label={t('cards.flash.answer_label')}
                        className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-black/30 border border-white/[0.12] text-[17px] font-bold text-center placeholder:text-white/25 placeholder:font-medium focus:outline-none focus:border-[#5AD4B5]/60"
                      />
                      <button
                        onClick={check}
                        disabled={normalize(value) === ''}
                        className="px-5 rounded-2xl bg-[#5AD4B5] text-black text-sm font-black hover:brightness-110 transition disabled:opacity-40"
                      >
                        ✓
                      </button>
                    </div>
                    <button
                      onClick={revealLetter}
                      disabled={fullyRevealed}
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#F5C16A]/80 hover:text-[#F5C16A] transition disabled:opacity-30"
                    >
                      <FontAwesomeIcon icon={faLightbulb} className="text-[11px]" />
                      {t('cards.flash.hint_letter', { tail: hintsUsed > 0 ? t('cards.flash.hint_used', { n: hintsUsed }) : '' })}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-white/35 relative">
              <FontAwesomeIcon icon={faEye} className="text-[11px]" />
              {isTyping ? t('cards.flash.footer_check') : isAudio ? t('cards.flash.footer_recall') : t('cards.flash.footer_flip')}
            </div>
          </div>

          {/* BACK */}
          <div
            className="col-start-1 row-start-1 w-full min-h-[320px] sm:min-h-[360px] overflow-hidden rounded-[24px] border border-[#5AD4B5]/25 bg-[#141a18] p-6 sm:p-8 flex flex-col"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="absolute -left-14 -top-14 w-52 h-52 rounded-full bg-[#5AD4B5]/[0.1] blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 relative flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-widest">
                {backLabel}
              </span>
              <span className="text-[11px] text-white/40 font-bold flex items-center gap-1.5">
                <FontAwesomeIcon icon={faLanguage} /> {answers.length > 1 ? t('cards.flash.variants_many', { n: answers.length }) : t('cards.flash.variants_one')}
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center gap-2 py-4 relative">
              {isAudio && (
                <div className="flex items-center gap-3 rounded-2xl bg-[#F5C16A]/[0.08] border border-[#F5C16A]/30 px-4 py-2.5">
                  <span className="flex-1 min-w-0 font-black leading-snug break-words text-[22px] sm:text-[26px]">{answerWord}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSpeak(answerWord, targetLang, 'audio-back')
                    }}
                  aria-label={t('cards.common.speak_word')}
                    className={`w-9 h-9 shrink-0 rounded-full grid place-items-center border transition-all ${
                      speakingKey === 'audio-back'
                        ? 'bg-[#F5C16A] text-black border-[#F5C16A]'
                        : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
                    }`}
                  >
                    <FontAwesomeIcon icon={faVolumeHigh} className="text-xs" />
                  </button>
                </div>
              )}
              {isTyping && result !== null && (
                <div className={`rounded-2xl border px-4 py-3 text-center ${resultStyle.box}`}>
                  <div className={`text-[22px] font-black flex items-center justify-center gap-2 ${resultStyle.text}`}>
                    <FontAwesomeIcon icon={resultStyle.icon} />
                    {resultStyle.label}
                  </div>
                  <div className="mt-2 text-[10.5px] font-black uppercase tracking-[0.18em] text-white/40">
                    {t('cards.flash.your_answer')}
                  </div>
                  <div className="mt-0.5 text-[19px] font-black text-white break-words leading-snug">
                    «{value.trim()}»
                  </div>
                </div>
              )}
              {isTyping && (
                <div className="text-[10.5px] font-black uppercase tracking-[0.18em] text-white/40 mt-1">
                  {t('cards.flash.correct_is')}
                </div>
              )}
              {visibleAnswers.length > 0 ? (
                visibleAnswers.map((txt, i) => (
                  <div
                    key={`${txt}-${i}`}
                    className={`flex items-center gap-3 rounded-2xl bg-white/[0.05] border border-white/[0.07] px-4 ${answers.length > 3 ? 'py-1.5' : 'py-2.5'}`}
                  >
                    <span className={`flex-1 min-w-0 font-black leading-snug break-words ${answers.length > 3 ? 'text-[15px]' : 'text-[19px] sm:text-[22px]'}`}>{txt}</span>
                    {mode !== 'f2n' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSpeak(txt, answerLang, `back-${i}`)
                        }}
                        aria-label={t('cards.common.speak_as', { t: txt })}
                        className={`w-9 h-9 shrink-0 rounded-full grid place-items-center border transition-all ${
                          speakingKey === `back-${i}`
                            ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
                            : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
                        }`}
                      >
                        <FontAwesomeIcon icon={faVolumeHigh} className="text-xs" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-white/40 text-sm">{t('cards.flash.no_translation')}</div>
              )}
              {hiddenCount > 0 && (
                <div className="text-center text-[12px] font-bold text-white/35">{t('cards.flash.more', { n: hiddenCount })}</div>
              )}
              {showTrBack ? (
                <div className="text-[13px] font-bold text-[#5AD4B5]/80 tabular-nums">[{transcription}]</div>
              ) : mode !== 'f2n' && transcription ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setTrShown(true)
                  }}
                  className="self-start inline-flex items-center gap-1.5 text-[12px] font-bold text-white/35 hover:text-white/60 transition"
                >
                  <FontAwesomeIcon icon={faEyeSlash} className="text-[11px]" /> {t('cards.common.show_tr')}
                </button>
              ) : null}
              {(forms.length > 0 || formsPattern) && (
                <div className="rounded-2xl bg-[#5AD4B5]/[0.06] border border-[#5AD4B5]/25 px-4 py-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[17px] font-black text-white break-words">{targetTexts[0] ?? ''}</span>
                    {forms.map((f, i) => (
                      <span key={`${f.form}-${f.form_type}-${i}`} className="flex items-center gap-1.5">
                        <span className="text-[#5AD4B5] font-black">→</span>
                        <span className="text-[17px] font-black text-white break-words">{f.form}</span>
                      </span>
                    ))}
                    {formsPattern && (
                      <span className="ml-auto px-2 py-0.5 rounded-md bg-[#5AD4B5]/15 text-[#5AD4B5] text-[11px] font-black tabular-nums whitespace-nowrap">
                        {formsPattern}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {forms.map((f, i) => (
                      <div key={`tr-${f.form}-${f.form_type}-${i}`} className="flex items-center gap-2 text-[12px]">
                        <span className="font-black uppercase tracking-widest text-white/35 text-[10px] w-[86px] shrink-0">
                          {f.form_type === 'past' ? t('cards.flash.form_past') : t('cards.flash.form_participle')}
                        </span>
                        <span className="font-bold text-[#5AD4B5]/80 tabular-nums truncate">{f.form}</span>
                        {f.transcription ? (
                          <span className="text-white/40 tabular-nums truncate">[{f.transcription}]</span>
                        ) : null}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onSpeak(f.form, targetLang, `form-${i}`)
                          }}
                          aria-label={t('cards.common.speak_as', { t: f.form })}
                          className={`ml-auto w-7 h-7 shrink-0 rounded-full grid place-items-center border transition-all ${
                            speakingKey === `form-${i}`
                              ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
                              : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
                          }`}
                        >
                          <FontAwesomeIcon icon={faVolumeHigh} className="text-[10px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isTyping && nativeTexts.length > 0 && (
                <>
                  <div className="text-[10.5px] font-black uppercase tracking-[0.18em] text-white/40 mt-1">
                    {t('cards.flash.translation')}
                  </div>
                  {nativeTexts.slice(0, 6).map((t, i) => (
                    <div
                      key={`tr-${t}-${i}`}
                      className={`flex items-center gap-3 rounded-2xl bg-[#5B74FF]/[0.07] border border-[#5B74FF]/20 px-4 ${nativeTexts.length > 3 ? 'py-1.5' : 'py-2.5'}`}
                    >
                      <span className={`flex-1 min-w-0 font-black leading-snug break-words text-[#aebbff] ${nativeTexts.length > 3 ? 'text-[15px]' : 'text-[19px] sm:text-[22px]'}`}>{t}</span>
                    </div>
                  ))}
                  {nativeTexts.length > 6 && (
                    <div className="text-center text-[12px] font-bold text-white/35">{t('cards.flash.more', { n: nativeTexts.length - 6 })}</div>
                  )}
                </>
              )}
              <OwnHintBlock hint={ownHint} onSave={onSaveHint} />
            </div>

            <div className="text-center text-[12px] font-bold text-white/35 relative">
              {isTyping ? t('cards.flash.auto_grade') : (
                <>{t('cards.flash.swipe')} <span className="text-[#f43f5e]">←</span> / <span className="text-[#5AD4B5]">→</span> {t('cards.flash.swipe_grade')}</>
              )}
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
