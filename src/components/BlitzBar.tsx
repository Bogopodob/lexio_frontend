import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt, faFire, faTrophy } from '@fortawesome/free-solid-svg-icons'

interface BlitzBarProps {
  seconds: number
  streak: number
  best: number
  onTimeout: () => void
}

const R = 18
const CIRC = 2 * Math.PI * R

export default function BlitzBar({ seconds, streak, best, onTimeout }: BlitzBarProps) {
  const [left, setLeft] = useState(seconds)
  const fired = useRef(false)
  const cb = useRef(onTimeout)
  cb.current = onTimeout

  useEffect(() => {
    const t = window.setInterval(() => {
      setLeft((v) => {
        const nv = Math.max(0, Math.round((v - 0.25) * 100) / 100)
        if (nv <= 0 && !fired.current) {
          fired.current = true
          window.setTimeout(() => cb.current(), 0)
        }
        return nv
      })
    }, 250)
    return () => window.clearInterval(t)
  }, [])

  const frac = left / seconds
  const color = frac > 0.5 ? '#5AD4B5' : frac > 0.25 ? '#F5C16A' : '#f43f5e'

  return (
    <div className="rounded-[20px] border border-[#F5C16A]/25 bg-[#171717] px-4 py-2.5 flex items-center gap-3">
      <div className="relative w-11 h-11 shrink-0">
        <svg viewBox="0 0 44 44" className="w-11 h-11 -rotate-90">
          <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - frac)}
            style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s' }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-[13px] font-black tabular-nums">
          {Math.ceil(left)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-[15px] font-black">
        <FontAwesomeIcon icon={faBolt} className="text-[#F5C16A]" />
        Блиц
      </div>
      <div className="ml-auto flex items-center gap-4 text-[13px] font-black tabular-nums">
        <span className="flex items-center gap-1.5 text-[#ff9d5c]" title="Серия верных ответов">
          <FontAwesomeIcon icon={faFire} />×{streak}
        </span>
        <span className="flex items-center gap-1.5 text-white/45" title="Лучшая серия">
          <FontAwesomeIcon icon={faTrophy} className="text-[11px]" />{best}
        </span>
      </div>
    </div>
  )
}
