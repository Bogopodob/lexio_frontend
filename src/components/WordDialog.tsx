import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/lib/i18n'
import {
  mediaSrc,
  mediaStreamPath,
  speakText,
  transcribeText,
  uploadLibraryMedia,
} from '@/lib/library-api'
import { listLanguages } from '@/lib/profile-api'

export interface MediaSel {
  /** Playable URL (object URL for fresh blobs, absolute for stored). */
  play: string
  /** Relative stored path (e.g. /library/users/<id>/media/<id>), null until uploaded. */
  store: string | null
  blob?: Blob
  name?: string
}

export interface WordFormInitial {
  kind: 'word' | 'phrase'
  word: string
  translation: string
  transcription: string
  pos: string
  notes: string
  image: { play: string | null; store: string | null } | null
  audio: { play: string | null; store: string | null } | null
}

export interface WordFormValue {
  kind: 'word' | 'phrase'
  word: string
  translation: string
  transcription: string
  pos: string
  notes: string
  imagePath: string | null
  audioPath: string | null
  langEn: string
  langRu: string
}

interface WordDialogProps {
  kind: 'word' | 'phrase'
  initial?: WordFormInitial
  saving: boolean
  serverError: string | null
  onClose: () => void
  onSave: (value: WordFormValue) => void
}

const MAX_MEDIA_BYTES = 10 * 1024 * 1024

export default function WordDialog({
  kind: initialKind,
  initial,
  saving,
  serverError,
  onClose,
  onSave,
}: WordDialogProps) {
  const { user, token } = useAuth()
  const t = useT()
  const [langIds, setLangIds] = useState<{ en: string; ru: string } | null>(null)

  useEffect(() => {
    listLanguages()
      .then((langs) => {
        const en = langs.find((l) => l.code === 'en')?.id
        const ru = langs.find((l) => l.code === 'ru')?.id
        if (en && ru) setLangIds({ en, ru })
      })
      .catch(() => undefined)
  }, [])

  const [kind, setKind] = useState<'word' | 'phrase'>(initial?.kind ?? initialKind)
  const [word, setWord] = useState(initial?.word ?? '')
  const [translation, setTranslation] = useState(initial?.translation ?? '')
  const [transcription, setTranscription] = useState(initial?.transcription ?? '')
  const [suggesting, setSuggesting] = useState(false)
  const [pos, setPos] = useState(initial?.pos ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [image, setImage] = useState<MediaSel | null>(
    initial?.image?.play
      ? { play: initial.image.play, store: initial.image.store ?? null }
      : null,
  )
  const [audio, setAudio] = useState<MediaSel | null>(
    initial?.audio?.play
      ? { play: initial.audio.play, store: initial.audio.store ?? null }
      : null,
  )
  const [audioTab, setAudioTab] = useState<'record' | 'file' | 'tts'>('record')
  const [recording, setRecording] = useState(false)
  const [ttsBusy, setTtsBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(
    () => () => {
      recRef.current?.stream?.getTracks().forEach((tr) => tr.stop())
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
    },
    [],
  )

  const pickImage = (f: File | undefined) => {
    if (!f) return
    if (f.size > 5 * 1024 * 1024 || !/^image\/(png|jpeg)$/.test(f.type)) {
      setError(t('topics.form.badFile'))
      return
    }
    setError(null)
    if (image?.play.startsWith('blob:')) URL.revokeObjectURL(image.play)
    setImage({ play: URL.createObjectURL(f), store: null, blob: f, name: f.name })
  }

  const pickAudioFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > MAX_MEDIA_BYTES) {
      setError(t('topics.form.tooBig'))
      return
    }
    setError(null)
    if (audio?.play.startsWith('blob:')) URL.revokeObjectURL(audio.play)
    setAudio({ play: URL.createObjectURL(f), store: null, blob: f, name: f.name })
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' })
        if (audio?.play.startsWith('blob:')) URL.revokeObjectURL(audio.play)
        setAudio({ play: URL.createObjectURL(blob), store: null, blob, name: 'recording.webm' })
        setRecording(false)
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
    } catch {
      setError(t('topics.form.recordDenied'))
    }
  }

  const stopRecording = () => {
    recRef.current?.stop()
  }

  const robotSpeak = async () => {
    if (!user || !token || word.trim() === '' || ttsBusy) return
    setTtsBusy(true)
    setError(null)
    try {
      const res = await speakText(user.id, token, { text: word.trim(), lang: 'en' })
      setAudio({ play: mediaSrc(`/library/users/${user.id}/media/${res.media_id}`) ?? '', store: `/library/users/${user.id}/media/${res.media_id}` })
      if (transcription.trim() === '' && res.transcription) {
        setTranscription(res.transcription)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setTtsBusy(false)
    }
  }

  const suggestTranscription = async () => {
    if (!token || word.trim() === '' || suggesting) return
    setSuggesting(true)
    try {
      const res = await transcribeText(token, { text: word.trim(), lang: 'en' })
      setTranscription(res.transcription)
    } catch {
      /* keep manual input */
    } finally {
      setSuggesting(false)
    }
  }

  const uploadPending = async (
    sel: MediaSel | null,
    kindLabel: 'image' | 'audio',
  ): Promise<string | null> => {
    if (!sel) return null
    if (!sel.blob) return sel.store
    if (!user || !token) return null
    const uploaded = await uploadLibraryMedia(
      user.id,
      token,
      kindLabel,
      sel.blob,
      sel.name ?? (kindLabel === 'image' ? 'image.png' : 'audio.webm'),
    )
    return mediaStreamPath(user.id, uploaded.id)
  }

  const save = async () => {
    if (word.trim() === '' || translation.trim() === '') {
      setError(t('topics.form.fillBoth'))
      return
    }
    if (!user || !token || !langIds) return
    setBusy(true)
    setError(null)
    try {
      const imagePath = await uploadPending(image, 'image')
      const audioPath = await uploadPending(audio, 'audio')
      onSave({
        kind,
        word: word.trim(),
        translation: translation.trim(),
        transcription: transcription.trim(),
        pos,
        notes: notes.trim(),
        imagePath,
        audioPath,
        langEn: langIds.en,
        langRu: langIds.ru,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl bg-black/20 border border-white/[0.08] text-sm focus:outline-none focus:border-white/20'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-[20px] border border-white/[0.08] bg-[#171717] p-5 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-[15px] font-black">
            {initial
              ? kind === 'word'
                ? t('topics.form.editWord')
                : t('topics.form.editPhrase')
              : kind === 'word'
                ? t('topics.form.newWord')
                : t('topics.form.newPhrase')}
          </h4>
          <button
            onClick={onClose}
            aria-label={t('topics.form.cancel')}
            className="w-8 h-8 rounded-full bg-white/[0.06] grid place-items-center hover:bg-white/[0.12]"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        </div>

        {!initial && (
          <div className="flex gap-1.5 mt-3">
            {(['word', 'phrase'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${kind === k ? 'bg-white text-black border-white' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
              >
                {k === 'word' ? t('topics.form.kindWord') : t('topics.form.kindPhrase')}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-widest opacity-70">
            {t('topics.form.wordLabel')}
            <input value={word} onChange={(e) => setWord(e.target.value)} className={inputCls} maxLength={255} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-widest opacity-70">
            {t('topics.form.translationLabel')}
            <input
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className={inputCls}
              maxLength={255}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-widest opacity-70 mt-2">
          {t('topics.form.transcriptionLabel')}
          <span className="flex gap-2">
            <input
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              className={`${inputCls} flex-1 min-w-0`}
              maxLength={255}
            />
            <button
              onClick={() => void suggestTranscription()}
              disabled={suggesting || word.trim() === ''}
              className="px-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-black hover:bg-white/[0.12] disabled:opacity-40 shrink-0"
            >
              {suggesting ? t('topics.form.suggesting') : t('topics.form.suggest')}
            </button>
          </span>
        </label>

        {kind === 'word' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-widest opacity-70">
              {t('topics.form.posLabel')}
              <select value={pos} onChange={(e) => setPos(e.target.value)} className={inputCls}>
                <option value="">{t('topics.form.posNone')}</option>
                <option value="noun">{t('topics.form.posNoun')}</option>
                <option value="verb">{t('topics.form.posVerb')}</option>
                <option value="adjective">{t('topics.form.posAdj')}</option>
                <option value="adverb">{t('topics.form.posAdv')}</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-black uppercase tracking-widest opacity-70">
              {t('topics.form.notesLabel')}
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('topics.form.notesPh')}
                className={inputCls}
                maxLength={200}
              />
            </label>
          </div>
        )}

        <div className="mt-3 text-[11px] font-black uppercase tracking-widest opacity-70">
          {t('topics.form.imageLabel')}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          {image?.play ? (
            <>
              <img src={image.play} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/[0.1]" />
              <button
                onClick={() => {
                  if (image.play.startsWith('blob:')) URL.revokeObjectURL(image.play)
                  setImage(null)
                }}
                className="text-xs font-bold text-white/50 hover:text-white"
              >
                {t('topics.form.imageRemove')}
              </button>
            </>
          ) : (
            <label className="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-black hover:bg-white/[0.12] cursor-pointer">
              {t('topics.form.imagePick')}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  pickImage(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </div>

        <div className="mt-3 text-[11px] font-black uppercase tracking-widest opacity-70">
          {t('topics.form.audioLabel')}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {(['record', 'file', 'tts'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setAudioTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all ${audioTab === tab ? 'bg-white text-black border-white' : 'bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08]'}`}
            >
              {tab === 'record'
                ? t('topics.form.audioTabRecord')
                : tab === 'file'
                  ? t('topics.form.audioTabFile')
                  : t('topics.form.audioTabTts')}
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-2xl bg-black/20 border border-white/[0.06] p-3">
          {audioTab === 'record' && (
            <div className="flex items-center gap-2">
              {!recording ? (
                <button
                  onClick={() => void startRecording()}
                  className="px-4 py-2 rounded-xl bg-[#f43f5e]/15 border border-[#f43f5e]/30 text-[#fb7185] text-xs font-black hover:bg-[#f43f5e]/25"
                >
                  {t('topics.form.recordStart')}
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 rounded-xl bg-[#f43f5e] text-white text-xs font-black animate-pulse"
                >
                  {t('topics.form.recordStop')}
                </button>
              )}
              {recording && (
                <span className="text-xs font-bold text-[#fb7185] animate-pulse">●●●</span>
              )}
            </div>
          )}
          {audioTab === 'file' && (
            <label className="px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-black hover:bg-white/[0.12] cursor-pointer inline-block">
              {t('topics.form.audioTabFile')}
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  pickAudioFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </label>
          )}
          {audioTab === 'tts' && (
            <button
              onClick={() => void robotSpeak()}
              disabled={ttsBusy || word.trim() === ''}
              className="px-4 py-2 rounded-xl bg-[#5B74FF]/15 border border-[#5B74FF]/30 text-[#8b9bff] text-xs font-black hover:bg-[#5B74FF]/25 disabled:opacity-40"
            >
              {ttsBusy ? t('topics.form.ttsBusy') : t('topics.form.ttsSpeak')}
            </button>
          )}
          {audio && (
            <div className="mt-2 flex items-center gap-2">
              <audio controls preload="none" src={audio.play} className="flex-1 min-w-0 h-8" />
              <button onClick={() => setAudio(null)} className="text-xs font-bold text-white/50 hover:text-white shrink-0">
                {t('topics.form.audioRemove')}
              </button>
            </div>
          )}
        </div>

        {(error || serverError) && (
          <div className="text-xs font-bold text-[#f43f5e] mt-3">{error ?? serverError}</div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-black hover:bg-white/[0.1]"
          >
            {t('topics.form.cancel')}
          </button>
          <button
            onClick={() => void save()}
            disabled={busy || saving}
            className="flex-1 py-2.5 rounded-xl bg-[#5AD4B5] text-black text-xs font-black hover:brightness-110 disabled:opacity-50"
          >
            {t('topics.form.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
