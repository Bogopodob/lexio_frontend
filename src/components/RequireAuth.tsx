import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useT } from '@/lib/i18n'
import { Skeleton, SkeletonCard, SkeletonLine } from '@/components/ui/Skeleton'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const t = useT()
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="w-full flex flex-col gap-5 animate-in fade-in duration-300">
        <div className="flex flex-col gap-2">
          <SkeletonLine width="35%" className="h-3 opacity-40" />
          <SkeletonLine width="50%" className="h-7" />
          <SkeletonLine width="40%" className="h-4 opacity-50" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} className="min-h-[120px]">
              <div className="flex flex-col gap-2.5">
                <Skeleton className="h-3 w-20 rounded-md opacity-40" />
                <Skeleton className="h-5 w-28 rounded-lg" />
                <Skeleton className="h-3 w-16 rounded-md opacity-50" />
              </div>
            </SkeletonCard>
          ))}
        </div>
        <SkeletonCard className="min-h-[200px]">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-32 rounded-lg" />
            <Skeleton className="h-[140px] w-full rounded-xl" />
          </div>
        </SkeletonCard>
        <SkeletonCard className="min-h-[100px]">
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-4 w-40 rounded-lg" />
            <Skeleton className="h-3 w-56 rounded-md opacity-50" />
          </div>
        </SkeletonCard>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
