import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faGear,
  faPlay,
  faPlus,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/lib/i18n'
import {
  deleteCategory,
  listCategories,
  listMyCategories,
  updateCategory,
  type RemoteCategory,
} from '@/lib/catalog-api'
import { listCategoriesWithProgress } from '@/lib/catalog-api'
import { listFriends, listLanguages, listLearningProfiles, type RemoteFriend } from '@/lib/profile-api'
import WordDialog, { type WordFormValue } from '@/components/WordDialog'
import {
  createUserEntry,
  createUserPhrase,
  deleteUserEntry,
  deleteUserPhrase,
  listSharedEntries,
  listSharedPhrases,
  listSharedWithMe,
  listShares,
  listUserEntries,
  listUserPhrases,
  mediaSrc,
  revokeShare,
  shareCategory,
  updateUserEntry,
  updateUserPhrase,
  type LibraryShare,
} from '@/lib/library-api'
import type { RemoteUserEntry, RemoteUserPhrase } from '@/lib/library-api'

interface Row {
  key: string
  kind: 'word' | 'phrase'
  id: string
  title: string
  sub: string
  transcription: string | null
  image: string | null
  audio: string | null
}

function toRow(
  kind: 'word' | 'phrase',
  id: string,
  title: string,
  sub: string,
  transcription: string | null,
  image: string | null,
  audio: string | null,
): Row {
  return { key: `${kind}:${id}`, kind, id, title, sub, transcription, image, audio }
}

export default function TopicDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, token, ready: authReady } = useAuth()
  const t = useT()

  const [category, setCategory] = useState<RemoteCategory | null>(null)
  const [catMissing, setCatMissing] = useState(false)
  const [entries, setEntries] = useState<RemoteUserEntry[]>([])
  const [phrases, setPhrases] = useState<RemoteUserPhrase[]>([])
  const [loading, setLoading] = useState(true)
  const [learned, setLearned] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [catBusy, setCatBusy] = useState(false)
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(false)
  const [dialog, setDialog] = useState<
    | { mode: 'create'; kind: 'word' | 'phrase' }
    | { mode: 'edit'; kind: 'word' | 'phrase'; id: string }
    | null
  >(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
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

  const isOwn = !!category && !!user && category.user_id === user.id
  // Owner name when the topic was shared with me (read-only mode).
  const [sharedFrom, setSharedFrom] = useState<string | null>(null)
  const [shares, setShares] = useState<LibraryShare[]>([])
  const [friends, setFriends] = useState<RemoteFriend[]>([])
  const [shareFriend, setShareFriend] = useState('')
  const [shareBusy, setShareBusy] = useState(false)
  const isShared = !isOwn && sharedFrom !== null

  const loadWords = useCallback(
    async (shared: boolean) => {
      if (!user || !token || !id) return
      const [e, p] = shared
        ? await Promise.all([
            listSharedEntries(user.id, token, id),
            listSharedPhrases(user.id, token, id),
          ])
        : await Promise.all([
            listUserEntries(user.id, token, { category_id: id }),
            listUserPhrases(user.id, token, { category_id: id }),
          ])
      setEntries(e)
      setPhrases(p)
    },
    [user, token, id],
  )

  const reloadWords = useCallback(() => loadWords(isShared), [loadWords, isShared])

  useEffect(() => {
    if (!authReady || !user || !token || !id) return
    let cancelled = false
    setLoading(true)
    setCatMissing(false)
    ;(async () => {
      try {
        const mine = await listMyCategories(user.id, token)
        if (cancelled) return
        let found = mine.find((c) => c.id === id) ?? null
        let shared: typeof sharedFrom = null
        if (!found) {
          const pub = await listCategories()
          if (cancelled) return
          found = pub.find((c) => c.id === id) ?? null
        }
        if (!found) {
          const sharedList = await listSharedWithMe(user.id, token).catch(() => [])
          if (cancelled) return
          const row = sharedList.find((c) => c.id === id)
          if (row) {
            found = {
              id: row.id,
              parent_id: null,
              user_id: '__shared__',
              slug: row.id,
              type: 'theme',
              color: null,
              icon: null,
              sort: 500,
              name: row.name,
              entries_count: row.words_count,
            }
            shared = row.owner_name
          }
        }
        if (cancelled) return
        if (!found) {
          setCatMissing(true)
          return
        }
        setCategory(found)
        setSharedFrom(shared)
        setCatName(found.name ?? '')
        await loadWords(shared !== null)
        if (cancelled) return
        if (found.user_id === user.id) {
          try {
            const [s, f] = await Promise.all([
              listShares(user.id, token, id),
              listFriends(user.id, token),
            ])
            if (!cancelled) {
              setShares(s)
              setFriends(f)
            }
          } catch {
            /* optional */
          }
        }
        try {
          const profiles = await listLearningProfiles(user.id, token)
          const active = profiles.find((p) => p.is_active) ?? profiles[0]
          if (active && !cancelled) {
            const withProgress = await listCategoriesWithProgress(user.id, token, active.id)
            if (!cancelled) {
              const row = withProgress.find((c) => c.id === id)
              setLearned(row?.learned_count ?? 0)
            }
          }
        } catch {
          /* learned count is optional */
        }
      } catch {
        if (!cancelled) setCatMissing(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, user, token, id, reloadWords])

  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    for (const e of entries) {
      const en = e.translations[0]
      const ru = e.translations.find((x) => x.id !== en?.id)
      out.push(
        toRow(
          'word',
          e.id,
          en?.text ?? e.translations[0]?.text ?? '…',
          ru?.text ?? '',
          en?.transcription ?? null,
          mediaSrc(e.image_path),
          en?.audio_path ? mediaSrc(en.audio_path) : null,
        ),
      )
    }
    for (const p of phrases) {
      const en = p.translations[0]
      const ru = p.translations.find((x) => x.id !== en?.id)
      out.push(
        toRow(
          'phrase',
          p.id,
          en?.text ?? p.translations[0]?.text ?? '…',
          ru?.text ?? '',
          en?.transcription ?? null,
          mediaSrc(p.image_path),
          en?.audio_path ? mediaSrc(en.audio_path) : null,
        ),
      )
    }
    return out
  }, [entries, phrases])

  const saveCategoryName = async () => {
    if (!user || !token || !id || catName.trim() === '' || catBusy) return
    setCatBusy(true)
    try {
      const updated = await updateCategory(user.id, token, id, { name: catName.trim() })
      setCategory((prev) => (prev ? { ...prev, name: updated.name } : prev))
      setSettingsOpen(false)
    } catch {
      /* keep open */
    } finally {
      setCatBusy(false)
    }
  }

  const removeCategory = async () => {
    if (!user || !token || !id || catBusy) return
    setCatBusy(true)
    try {
      await deleteCategory(user.id, token, id)
      navigate('/')
    } catch {
      setCatBusy(false)
    }
  }

  const grantAccess = async () => {
    if (!user || !token || !id || shareFriend === '' || shareBusy) return
    setShareBusy(true)
    try {
      const created = await shareCategory(user.id, token, {
        category_id: id,
        friend_user_id: shareFriend,
      })
      setShares((prev) => [...prev, created])
      setShareFriend('')
    } catch {
      /* keep open */
    } finally {
      setShareBusy(false)
    }
  }

  const revokeAccess = async (shareId: string) => {
    if (!user || !token) return
    try {
      await revokeShare(user.id, token, shareId)
      setShares((prev) => prev.filter((s) => s.id !== shareId))
    } catch {
      /* ignore */
    }
  }

  const openCreate = (kind: 'word' | 'phrase') => {
    setFormError(null)
    setDialog({ mode: 'create', kind })
  }

  const openEdit = (row: Row) => {
    setFormError(null)
    setDialog({ mode: 'edit', kind: row.kind, id: row.id })
  }

  const removeWord = async (row: Row) => {
    if (!user || !token) return
    try {
      if (row.kind === 'word') await deleteUserEntry(user.id, token, row.id)
      else await deleteUserPhrase(user.id, token, row.id)
      setDeleteTarget(null)
      await reloadWords()
    } catch {
      /* ignore */
    }
  }

  const saveWord = async (value: WordFormValue) => {
    if (!user || !token || !id) return
    setSaving(true)
    setFormError(null)
    try {
      const translations = [
        {
          language_id: value.langEn,
          text: value.word,
          ...(value.transcription ? { transcription: value.transcription } : {}),
          ...(value.kind === 'word' && value.pos ? { part_of_speech: value.pos } : {}),
          ...(value.notes ? { notes: value.notes } : {}),
          ...(value.audioPath ? { audio_path: value.audioPath } : {}),
        },
        { language_id: value.langRu, text: value.translation },
      ]
      if (dialog?.mode === 'edit') {
        if (value.kind === 'word') {
          await updateUserEntry(user.id, token, dialog.id, {
            category_id: id,
            image_path: value.imagePath,
            translations,
          })
        } else {
          await updateUserPhrase(user.id, token, dialog.id, {
            category_id: id,
            image_path: value.imagePath,
            translations,
          })
        }
      } else if (value.kind === 'word') {
        await createUserEntry(user.id, token, { category_id: id, translations })
      } else {
        await createUserPhrase(user.id, token, { category_id: id, translations })
      }
      setDialog(null)
      await reloadWords()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (!authReady) {
    return (
      <div className="w-full max-w-[760px] mx-auto rounded-[20px] border border-white/[0.06] bg-[#171717] p-10 grid place-items-center">
        <span className="text-sm opacity-50 animate-pulse">…</span>
      </div>
    )
  }

  if (!loading && (catMissing || !category)) {
    return (
      <div className="w-full max-w-[760px] mx-auto rounded-[20px] border border-white/[0.06] bg-[#171717] p-10 text-center">
        <div className="text-[15px] font-black">{t('topics.title')}</div>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-5 py-2.5 rounded-full bg-white text-black text-xs font-black"
        >
          {t('topics.back')}
        </button>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
      className="w-full flex flex-col gap-4 max-w-[760px] mx-auto"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          aria-label={t('topics.back')}
          className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center hover:bg-white/10 shrink-0"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-black tracking-tight leading-none truncate">
            {category?.name ?? '…'}
          </h1>
          <p className="text-xs opacity-40 mt-1 tabular-nums">
            {rows.length} {t('topics.words')}
            {learned !== null && ` • ${learned} ${t('topics.learned')}`}
            {isShared && sharedFrom && ` • ${t('topics.share.sharedBy', { name: sharedFrom })}`}
          </p>
        </div>
        {isOwn && (
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            aria-label={t('topics.edit')}
            className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/[0.06] grid place-items-center hover:bg-white/10 shrink-0"
          >
            <FontAwesomeIcon icon={faGear} className="text-xs" />
          </button>
        )}
      </div>

      {isOwn && settingsOpen && (
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-4 flex flex-col gap-2">
          <div className="text-[11px] font-black uppercase tracking-widest opacity-40">
            {t('topics.settings.title')}
          </div>
          <div className="flex gap-2">
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder={t('topics.settings.namePh')}
              maxLength={60}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/20 border border-white/[0.08] text-sm focus:outline-none focus:border-white/20"
            />
            <button
              onClick={() => void saveCategoryName()}
              disabled={catBusy}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-black hover:brightness-110 disabled:opacity-50"
            >
              {t('topics.settings.save')}
            </button>
          </div>
          <div className="text-[11px] font-black uppercase tracking-widest opacity-40 mt-1">
            {t('topics.share.title')}
          </div>
          {shares.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {shares.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-[13px]">
                  <span className="w-6 h-6 rounded-full bg-white/[0.08] grid place-items-center font-bold text-[11px] shrink-0">
                    {(s.friend_name?.[0] || '?').toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0 font-bold truncate">
                    {s.friend_name ?? s.friend_user_id}
                  </span>
                  <button
                    onClick={() => void revokeAccess(s.id)}
                    className="text-[11px] font-bold text-white/40 hover:text-[#f43f5e]"
                  >
                    {t('topics.share.revoke')}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs opacity-40">{t('topics.share.empty')}</div>
          )}
          <div className="flex gap-2">
            <select
              value={shareFriend}
              onChange={(e) => setShareFriend(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/20 border border-white/[0.08] text-sm focus:outline-none"
            >
              <option value="">{t('topics.share.pickPh')}</option>
              {friends
                .filter((f) => !shares.some((s) => s.friend_user_id === f.user_id))
                .map((f) => (
                  <option key={f.user_id} value={f.user_id}>
                    {f.name ?? f.user_id}
                  </option>
                ))}
            </select>
            <button
              onClick={() => void grantAccess()}
              disabled={shareBusy || shareFriend === ''}
              className="px-4 py-2 rounded-xl bg-[#5B74FF]/20 border border-[#5B74FF]/40 text-[#8b9bff] text-xs font-black hover:bg-[#5B74FF]/30 disabled:opacity-40"
            >
              {t('topics.share.grant')}
            </button>
          </div>
          {!confirmDeleteCat ? (
            <button
              onClick={() => setConfirmDeleteCat(true)}
              className="self-start text-xs font-bold text-[#f43f5e]/80 hover:text-[#f43f5e]"
            >
              {t('topics.delete')}
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="opacity-60">
                {t('topics.settings.deleteTitle', { name: category?.name ?? '' })}
              </span>
              <button
                onClick={() => void removeCategory()}
                disabled={catBusy}
                className="px-3 py-1.5 rounded-full bg-[#f43f5e] text-white font-black disabled:opacity-50"
              >
                {t('topics.settings.deleteBtn')}
              </button>
              <button onClick={() => setConfirmDeleteCat(false)} className="opacity-60 hover:opacity-100">
                {t('topics.keep')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate(`/learn?category=${id}`)}
          className="flex-1 min-w-[160px] py-3 rounded-2xl bg-[#5AD4B5] text-black text-sm font-black hover:brightness-110 transition flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faPlay} className="text-xs" /> {t('topics.learn')}
        </button>
        {isOwn && (
          <>
            <button
              onClick={() => openCreate('word')}
              className="px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm font-black hover:bg-white/[0.1]"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs mr-1.5" /> {t('topics.addWord')}
            </button>
            <button
              onClick={() => openCreate('phrase')}
              className="px-4 py-3 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-sm font-black hover:bg-white/[0.1]"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs mr-1.5" /> {t('topics.addPhrase')}
            </button>
          </>
        )}
      </div>

      {!isOwn && (
        <div className="text-[12.5px] opacity-50">{t('topics.systemReadonly')}</div>
      )}

      {loading ? (
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-10 grid place-items-center">
          <span className="text-sm opacity-50 animate-pulse">{t('topics.loading')}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-10 text-center text-sm opacity-50">
          {t('topics.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-4 flex gap-3"
            >
              {row.image && (
                <img
                  src={row.image}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-white/[0.08]"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[16px] font-black break-words">{row.title}</span>
                  {row.kind === 'phrase' && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#5B74FF]/15 text-[#8b9bff] text-[10px] font-black uppercase">
                      {t('topics.kindBadge')}
                    </span>
                  )}
                </div>
                {row.sub !== '' && (
                  <div className="text-[13px] text-white/60 font-bold break-words mt-0.5">{row.sub}</div>
                )}
                {row.transcription && (
                  <div className="text-[12px] text-[#5AD4B5]/80 tabular-nums mt-0.5">
                    [{row.transcription}]
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                {row.audio && (
                  <audio controls preload="none" src={row.audio} className="w-40 max-w-[40vw] h-8" />
                )}
                {isOwn && (
                  <div className="flex gap-1.5 justify-end">
                    <button
                      onClick={() => openEdit(row)}
                      aria-label={t('topics.edit')}
                      className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] grid place-items-center text-xs hover:bg-white/[0.12]"
                    >
                      <FontAwesomeIcon icon={faPen} className="text-[11px]" />
                    </button>
                    {deleteTarget === row.key ? (
                      <>
                        <button
                          onClick={() => void removeWord(row)}
                          aria-label={t('topics.delete')}
                          title={t('topics.confirmDeleteWord')}
                          className="h-8 px-2.5 rounded-full bg-[#f43f5e] text-white text-[11px] font-black"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setDeleteTarget(null)}
                          aria-label={t('topics.keep')}
                          className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] grid place-items-center text-xs"
                        >
                          ×
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteTarget(row.key)}
                        aria-label={t('topics.delete')}
                        className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] grid place-items-center text-xs hover:bg-[#f43f5e]/20"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {dialog && (
        <WordDialog
          key={`${dialog.mode}-${dialog.kind}-${dialog.mode === 'edit' ? dialog.id : 'new'}`}
          kind={dialog.kind}
          initial={
            dialog.mode === 'edit'
              ? dialog.kind === 'word'
                ? entryToForm(entries.find((e) => e.id === dialog.id))
                : phraseToForm(phrases.find((p) => p.id === dialog.id))
              : undefined
          }
          saving={saving}
          serverError={formError}
          onClose={() => {
            setDialog(null)
            setFormError(null)
          }}
          onSave={(v) => void saveWord(v)}
        />
      )}
    </motion.div>
  )

  function entryToForm(e: RemoteUserEntry | undefined) {
    if (!e || !langIds) return undefined
    const en = e.translations.find((x) => x.language_id === langIds.en) ?? e.translations[0]
    const ru = e.translations.find((x) => x.language_id === langIds.ru && x.id !== en?.id)
    if (!en) return undefined
    return {
      kind: 'word' as const,
      word: en.text,
      translation: ru?.text ?? '',
      transcription: en.transcription ?? '',
      pos: '',
      notes: '',
      image: e.image_path ? { play: mediaSrc(e.image_path), store: e.image_path } : null,
      audio: en.audio_path ? { play: mediaSrc(en.audio_path), store: en.audio_path } : null,
    }
  }

  function phraseToForm(p: RemoteUserPhrase | undefined) {
    if (!p || !langIds) return undefined
    const en = p.translations[0]
    const ru = p.translations.find((x) => x.id !== en?.id)
    if (!en) return undefined
    return {
      kind: 'phrase' as const,
      word: en.text,
      translation: ru?.text ?? '',
      transcription: en.transcription ?? '',
      pos: '',
      notes: '',
      image: p.image_path ? { play: mediaSrc(p.image_path), store: p.image_path } : null,
      audio: en.audio_path ? { play: mediaSrc(en.audio_path), store: en.audio_path } : null,
    }
  }
}
