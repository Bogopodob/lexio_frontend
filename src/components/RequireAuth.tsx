import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="w-full grid place-items-center py-20">
        <div className="px-4 py-2 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/50 text-xs font-bold animate-pulse">
          Проверяем вход…
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
