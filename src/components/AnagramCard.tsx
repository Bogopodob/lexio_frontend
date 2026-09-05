import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faVolumeHigh, faPuzzlePiece, faDeleteLeft, faEye } from '@fortawesome/free-solid-svg-icons'

interface AnagramCardProps {
  word: string
  transcription: string | null
  wordSpeak: { text: string; lang: string }
  speakingKey: string | null
  keyRef: MutableRefObject<((key: string) => void) | null>
  onSpeak: (text: string, lang: string, key: string) => void
  onSolved: (mistakes: number) => void
  onGiveUp: () => void
}

interface Tile {
  id: number
  ch: string
}

export default function AnagramCard({
  word,
  transcription,
  wordSpeak,
  speakingKey,
  keyRef,
  onSpeak,
  onSolved,
  onGiveUp,
}: AnagramCardProps) {
  const tiles: Tile[] = useMemo(() => {
    const letters = [...word].filter((c) => c !== ' ').map((ch, i) => ({ id: i, ch }))
    for (let attempt = 0; attempt < 8; attempt++) {
      for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[letters[i], letters[j]] = [letters[j], letters[i]]
      }
      if (letters.map((t) => t.ch).join('').toLowerCase() !== word.replace(/ /g, '').toLowerCase()) break
    }
    return letters
  }, [word])

  const slotCount = tiles.length
  const [placed, setPlaced] = useState<(number | null)[]>(() => Array(slotCount).fill(null))
  const [mistakes, setMistakes] = useState(0)
  const [flash, setFlash] = useState(false)
  const [givenUp, setGivenUp] = useState(false)
  const done = useRef(false)
  // NB: mistakes lives in a ref for the check effect — keeping it in state
  // deps restarts the effect on every increment and kills the clear timer,
  // which used to pile up mistakes forever on a wrong assembly.
  const mistakesRef = useRef(0)
  const cbSolved = useRef(onSolved)
  cbSolved.current = onSolved
  const cbGiveUp = useRef(onGiveUp)
  cbGiveUp.current = onGiveUp

  const putTile = (tileId: number) => {
    if (done.current || givenUp) return
    setPlaced((prev) => {
      if (prev.includes(tileId)) return prev
      const idx = prev.indexOf(null)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = tileId
      return next
    })
  }
  const putR = useRef(putTile)
  putR.current = putTile

  const removeLast = () => {
    if (done.current || givenUp) return
    setPlaced((prev) => {
      const next = [...prev]
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] !== null) {
          next[i] = null
          break
        }
      }
      return next
    })
  }
  const removeR = useRef(removeLast)
  removeR.current = removeLast

  useEffect(() => {
    keyRef.current = (key: string) => {
      if (key === 'Backspace') {
        removeR.current()
        return
      }
      if (/^[a-zA-Zа-яА-ЯёЁ]$/.test(key)) {
        const low = key.toLowerCase()
        const avail = tiles.filter((t) => !placedRef.current.includes(t.id))
        const found = avail.find((t) => t.ch.toLowerCase() === low)
        if (found) putR.current(found.id)
      }
    }
    return () => {
      keyRef.current = null
    }
  }, [keyRef, tiles])
  const placedRef = useRef(placed)
  placedRef.current = placed

  useEffect(() => {
    if (done.current || givenUp) return
    if (placed.some((p) => p === null)) {
      // Same-value set bails out, so no render loop here.
      setFlash(false)
      return
    }
    const byId = new Map(tiles.map((t) => [t.id, t.ch]))
    const assembled = placed.map((id) => byId.get(id!) ?? '').join('')
    if (assembled.toLowerCase() === word.replace(/ /g, '').toLowerCase()) {
      done.current = true
      cbSolved.current(mistakesRef.current)
      return
    }
    mistakesRef.current += 1
    setMistakes(mistakesRef.current)
    setFlash(true)
    const t = window.setTimeout(() => {
      setPlaced(Array(slotCount).fill(null))
      setFlash(false)
    }, 550)
    return () => window.clearTimeout(t)
  }, [placed, tiles, word, slotCount, givenUp])

  const giveUp = () => {
    if (done.current || givenUp) return
    setGivenUp(true)
    cbGiveUp.current()
  }

  const available = tiles.filter((t) => !placed.includes(t.id))

  return (
    <div
      data-testid="anagram-card"
      className="rounded-[24px] border border-white/[0.08] bg-[#171717] p-6 sm:p-8 flex flex-col gap-4 overflow-hidden relative select-none"
    >
      <div className="absolute -right-14 -top-14 w-52 h-52 rounded-full bg-[#5AD4B5]/[0.09] blur-3xl pointer-events-none" />
      <div className="flex items-center gap-2 relative">
        <span className="px-2.5 py-1 rounded-full bg-[#5AD4B5]/10 border border-[#5AD4B5]/25 text-[#5AD4B5] text-[11px] font-black uppercase tracking-widest flex items-center gap-1.5">
          <FontAwesomeIcon icon={faPuzzlePiece} className="text-[10px]" /> Собери слово
        </span>
        <button
          onClick={() => onSpeak(wordSpeak.text, wordSpeak.lang, 'anagram-q')}
          aria-label="Озвучить слово"
          className={`ml-auto w-10 h-10 rounded-full grid place-items-center border transition-all ${
            speakingKey === 'anagram-q'
              ? 'bg-[#5AD4B5] text-black border-[#5AD4B5]'
              : 'bg-white/[0.06] border-white/[0.08] hover:bg-white/[0.12]'
          }`}
        >
          <FontAwesomeIcon icon={faVolumeHigh} className="text-sm" />
        </button>
      </div>

      {transcription ? (
        <div className="text-center text-[15px] font-bold text-[#5AD4B5]/80 tabular-nums relative">
          [{transcription}]
        </div>
      ) : null}

      {/* slots */}
      <div className="flex flex-wrap justify-center gap-1.5 relative min-h-[52px]">
        {(() => {
          let li = -1
          return [...word].map((c, i) => {
            if (c === ' ') return <span key={i} className="w-3" />
            li++
            const slotIdx = li
            const tileId = placed[slotIdx]
            const tile = tileId !== null ? tiles.find((t) => t.id === tileId) : undefined
            return (
              <button
                key={i}
                onClick={() => {
                  if (tileId === null || done.current || givenUp) return
                  setPlaced((prev) => {
                    const next = [...prev]
                    next[slotIdx] = null
                    return next
                  })
                }}
                className={`w-10 h-[52px] rounded-xl border-2 grid place-items-center text-[22px] font-black uppercase transition-colors ${
                  tile
                    ? flash
                      ? 'bg-[#f43f5e]/15 border-[#f43f5e]/60 text-white'
                      : 'bg-[#5AD4B5]/[0.12] border-[#5AD4B5]/50 text-white'
                    : 'bg-black/30 border-white/[0.1] border-dashed'
                }`}
              >
                {tile?.ch ?? ''}
              </button>
            )
          })
        })()}
      </div>
      {/* tiles */}
      <div className="flex flex-wrap justify-center gap-1.5 relative min-h-[52px]">
        {available.map((t) => (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => putTile(t.id)}
            className="w-10 h-[52px] rounded-xl bg-white/[0.07] border border-white/[0.12] grid place-items-center text-[22px] font-black uppercase hover:bg-white/[0.13] transition"
          >
            {t.ch}
          </motion.button>
        ))}
        {available.length === 0 && !givenUp && (
          <span className="text-[13px] font-bold text-white/35 self-center">все буквы на местах…</span>
        )}
      </div>

      {givenUp && (
        <div className="text-center text-[24px] font-black text-white break-words relative">
          {word}
        </div>
      )}

      <div className="flex items-center justify-between relative">
        <span className="text-[12px] font-bold text-white/40 tabular-nums">ошибок: {mistakes}</span>
        <div className="flex gap-2">
          <button
            onClick={removeLast}
            aria-label="Убрать последнюю букву"
            className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm font-black hover:bg-white/[0.1]"
          >
            <FontAwesomeIcon icon={faDeleteLeft} />
          </button>
          {!givenUp && (
            <button
              onClick={giveUp}
              className="h-9 px-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[12px] font-black hover:bg-white/[0.1] flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faEye} className="text-[11px]" /> Сдаться
            </button>
          )}
        </div>
      </div>
      <div className="text-center text-[12px] font-bold text-white/35 relative">
        {givenUp ? 'оценка выставлена автоматически' : 'кликай по буквам или печатай с клавиатуры'}
      </div>
    </div>
  )
}
