import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  style?: CSSProperties
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <span
      className={cn('inline-block rounded-lg bg-white/[0.07] animate-pulse', className)}
      style={style}
      aria-hidden
    />
  )
}

export function SkeletonLine({ width, className }: SkeletonProps & { width?: string }) {
  return <Skeleton className={cn('h-4 rounded-lg', className)} style={{ width }} />
}

export function SkeletonCircle({ size, className }: SkeletonProps & { size?: number }) {
  return (
    <Skeleton
      className={cn('rounded-full shrink-0', className)}
      style={{ width: size ?? 40, height: size ?? 40 }}
    />
  )
}

export function SkeletonCard({ className, children }: SkeletonProps & { children?: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[20px] border border-white/[0.06] bg-[#171717] p-5',
        className,
      )}
      aria-hidden
    >
      {children ?? (
        <div className="flex flex-col gap-2.5">
          <SkeletonLine width="40%" />
          <SkeletonLine width="70%" className="h-6" />
          <SkeletonLine width="55%" />
        </div>
      )}
    </div>
  )
}

export function SkeletonPill({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-8 w-24 rounded-full', className)} />
}

export function SkeletonBlock({ count = 3, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('flex flex-col gap-4', className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}