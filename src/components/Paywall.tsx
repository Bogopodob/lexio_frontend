import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLock } from '@fortawesome/free-solid-svg-icons'
import { useT } from '@/lib/i18n'

interface PaywallProps {
  title: string
  text: string
  compact?: boolean
}

export default function Paywall({ title, text, compact = false }: PaywallProps) {
  const t = useT()
  return (
    <div
      className={`rounded-[20px] border border-[#F5C16A]/20 bg-[#171717] text-center ${
        compact ? 'p-4' : 'p-6 sm:p-8'
      }`}
    >
      <div
        className={`mx-auto grid place-items-center rounded-2xl bg-[#F5C16A]/10 border border-[#F5C16A]/20 text-[#F5C16A] ${
          compact ? 'w-10 h-10 text-[15px]' : 'w-12 h-12 text-[18px]'
        }`}
      >
        <FontAwesomeIcon icon={faLock} />
      </div>
      <div
        className={`mt-3 font-black tracking-tight ${compact ? 'text-[14px]' : 'text-[18px]'}`}
      >
        {title}
      </div>
      <p className={`mt-1.5 text-white/55 ${compact ? 'text-xs' : 'text-sm'}`}>{text}</p>
      <Link
        to="/premium"
        className={`mt-4 inline-flex items-center justify-center rounded-full bg-white text-black font-black transition-colors hover:bg-[#F5C16A] ${
          compact ? 'px-4 py-1.5 text-xs' : 'px-5 py-2.5 text-sm'
        }`}
      >
        {t('premium.paywall.cta')}
      </Link>
      <div className={`mt-2 text-white/35 font-semibold ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {t('premium.paywall.soon_note')}
      </div>
    </div>
  )
}
