import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

/* ------------------------------ Skeleton ------------------------------ */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-raised',
        'after:absolute after:inset-0 after:animate-shimmer after:bg-gradient-to-r',
        'after:from-transparent after:via-[rgb(var(--c-ink)/0.06)] after:to-transparent',
        className,
      )}
      aria-hidden
    />
  )
}

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="surface-card space-y-4 p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-2.5 w-1/2" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="surface-card divide-y divide-line overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="size-2 rounded-full" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="hidden h-3 w-24 sm:block" />
          <Skeleton className="hidden h-3 w-16 md:block" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/* ---------------------------- Empty / error --------------------------- */

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
  compact?: boolean
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-line text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-16',
        className,
      )}
    >
      {icon && (
        <div className="flex size-11 items-center justify-center rounded-xl border border-line bg-surface-sunken text-ink-faint">
          {icon}
        </div>
      )}
      <div className="max-w-sm space-y-1">
        <h3 className="text-[13px] font-medium text-ink">{title}</h3>
        {description && (
          <p className="text-xs leading-6 text-ink-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'The request could not be completed. Try again in a moment.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-state-danger/25 bg-state-danger/5 px-6 py-10 text-center',
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-xl border border-state-danger/25 bg-state-danger/10 text-state-danger">
        <TriangleAlert className="size-5" aria-hidden />
      </div>
      <div className="max-w-sm space-y-1">
        <h3 className="text-[13px] font-medium text-ink">{title}</h3>
        <p className="text-xs leading-6 text-ink-muted">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

/* ------------------------------- Callout ------------------------------ */

export function Callout({
  tone = 'info',
  title,
  children,
  action,
  icon,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success'
  title?: string
  children: ReactNode
  action?: ReactNode
  icon?: ReactNode
}) {
  const styles = {
    info: 'border-state-running/25 bg-state-running/[0.07] text-state-running',
    warning: 'border-state-warning/25 bg-state-warning/[0.07] text-state-warning',
    danger: 'border-state-danger/25 bg-state-danger/[0.07] text-state-danger',
    success: 'border-state-success/25 bg-state-success/[0.07] text-state-success',
  }[tone]

  return (
    <div className={cn('flex gap-3 rounded-lg border p-3', styles)}>
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        {title && <p className="text-xs font-medium">{title}</p>}
        <div className="text-xs leading-6 text-ink-muted">{children}</div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}
