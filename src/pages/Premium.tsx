import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCrown, faRotate } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '@/context/AuthContext'
import { useList, useT } from '@/lib/i18n'

export default function Premium() {
  const t = useT()
  const navigate = useNavigate()
  const { user, refresh } = useAuth()
  const freeFeatures = useList('premium.page.free_features')
  const premiumFeatures = useList('premium.page.premium_features')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null)
  const [checkoutHit, setCheckoutHit] = useState(false)

  const isGuest = !user
  const isPremium = Boolean(user?.is_premium)

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshMsg(null)
    try {
      await refresh()
      setRefreshMsg(t('premium.page.refresh_done'))
    } catch {
      setRefreshMsg(t('premium.page.refresh_error'))
    } finally {
      setRefreshing(false)
    }
  }

  const statusTitle = isGuest
    ? t('premium.page.status_guest_title')
    : isPremium
      ? t('premium.page.status_active_title')
      : t('premium.page.status_inactive_title')
  const statusText = isGuest
    ? t('premium.page.status_guest_text')
    : isPremium
      ? t('premium.page.status_active_text')
      : t('premium.page.status_inactive_text')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36 }}
      className="w-full flex flex-col gap-5"
    >
      <div className="relative overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#171717] p-6 sm:p-7">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#F5C16A]/[0.07] blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#F5C16A]/15 border border-[#F5C16A]/20 grid place-items-center text-[#F5C16A]">
                <FontAwesomeIcon icon={faCrown} />
              </span>
              <h1 className="text-[24px] sm:text-[28px] font-black tracking-tight leading-none">
                {t('premium.page.title')}
              </h1>
              {!isGuest && (
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                    isPremium
                      ? 'bg-[#5AD4B5]/15 border-[#5AD4B5]/30 text-[#5AD4B5]'
                      : 'bg-white/[0.06] border-white/[0.08] text-white/50'
                  }`}
                >
                  {isPremium ? t('premium.page.badge_active') : t('premium.page.badge_inactive')}
                </span>
              )}
            </div>
            <p className="text-sm text-white/55 mt-2">{t('premium.page.subtitle')}</p>
          </div>
        </div>

        <div className="relative mt-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4">
          <div className="text-[13px] font-black">{statusTitle}</div>
          <div className="text-xs text-white/55 mt-1">{statusText}</div>
          {!isGuest && !isPremium && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-black hover:bg-white/[0.10] disabled:opacity-60"
            >
              <FontAwesomeIcon icon={faRotate} spin={refreshing} />
              {refreshing ? t('premium.page.refreshing') : t('premium.page.refresh')}
            </button>
          )}
          {isGuest && (
            <button
              onClick={() => navigate('/auth')}
              className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-full bg-white text-black text-xs font-black"
            >
              {t('premium.page.login_cta')}
            </button>
          )}
          {refreshMsg && <div className="text-[11px] font-bold text-white/60 mt-2">{refreshMsg}</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-[20px] border border-white/[0.06] bg-[#171717] p-5 flex flex-col">
          <div className="text-[15px] font-black">{t('premium.page.free_title')}</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[26px] font-black">{t('premium.page.free_price')}</span>
            <span className="text-xs opacity-40">{t('premium.page.free_period')}</span>
          </div>
          {!isGuest && !isPremium && (
            <div className="mt-2 text-[11px] font-black text-white/50 uppercase tracking-wide">
              {t('premium.page.current_label')}
            </div>
          )}
          <ul className="mt-3 space-y-2 flex-1">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-white/70">
                <FontAwesomeIcon icon={faCheck} className="mt-1 text-white/30 text-[11px]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[20px] border border-[#F5C16A]/25 bg-[#171717] p-5 flex flex-col relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#F5C16A]/[0.08] blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#F5C16A]/15 border border-[#F5C16A]/20 grid place-items-center text-[#F5C16A]">
              <FontAwesomeIcon icon={faCrown} />
            </span>
            <div className="text-[15px] font-black">{t('premium.page.premium_title')}</div>
            {isPremium && (
              <span className="ml-auto px-2.5 py-1 rounded-full bg-[#5AD4B5]/15 border border-[#5AD4B5]/30 text-[#5AD4B5] text-[11px] font-black">
                {t('premium.page.badge_active')}
              </span>
            )}
          </div>
          <div className="relative mt-1 flex items-baseline gap-1.5">
            <span className="text-[26px] font-black text-[#F5C16A]">{t('premium.page.premium_price')}</span>
            <span className="text-xs opacity-40">{t('premium.page.premium_period')}</span>
          </div>
          {isPremium && (
            <div className="relative mt-2 text-[11px] font-black text-[#5AD4B5] uppercase tracking-wide">
              {t('premium.page.current_label')}
            </div>
          )}
          <ul className="relative mt-3 space-y-2 flex-1">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-white/80">
                <FontAwesomeIcon icon={faCheck} className="mt-1 text-[#F5C16A] text-[11px]" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="relative mt-4 flex flex-col gap-2">
            {!isPremium && (
              <button
                onClick={() => setCheckoutHit(true)}
                className="w-full py-2.5 rounded-full bg-[#F5C16A] text-black text-sm font-black hover:opacity-90"
              >
                {t('premium.page.checkout')}
              </button>
            )}
            {(!isPremium && checkoutHit) || !isPremium ? (
              <div className="text-[11px] text-white/40 text-center">{t('premium.page.checkout_note')}</div>
            ) : null}
            {!isGuest && !isPremium && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-xs font-bold hover:bg-white/[0.10] disabled:opacity-60"
              >
                {refreshing ? t('premium.page.refreshing') : t('premium.page.refresh')}
              </button>
            )}
            {isGuest && (
              <Link
                to="/auth"
                className="w-full py-2.5 rounded-full bg-white text-black text-sm font-black text-center"
              >
                {t('premium.page.login_cta')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
