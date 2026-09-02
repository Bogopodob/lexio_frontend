import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSpeechOptions {
  lang?: string
  rate?: number
  pitch?: number
  volume?: number
}

export function useSpeech(opts: UseSpeechOptions = {}) {
  const { lang = 'en-US', rate = 0.92, pitch = 1, volume = 1 } = opts
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
    // Preload voices (some browsers load async)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => window.speechSynthesis.getVoices()
      loadVoices()
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }, [])

  const speak = useCallback(
    (text: string, overrideLang?: string) => {
      if (!isSupported || !text) return
      cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = overrideLang ?? lang
      utterance.rate = rate
      utterance.pitch = pitch
      utterance.volume = volume

      // Try to pick best voice
      const voices = window.speechSynthesis.getVoices()
      const preferred =
        voices.find((v) => v.lang === utterance.lang && v.localService) ||
        voices.find((v) => v.lang.startsWith(utterance.lang.split('-')[0])) ||
        voices.find((v) => v.default)
      if (preferred) utterance.voice = preferred

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    },
    [isSupported, lang, rate, pitch, volume, cancel],
  )

  useEffect(() => {
    return () => cancel()
  }, [cancel])

  return { speak, cancel, isSpeaking, isSupported }
}
