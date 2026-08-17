import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  meta?: ReactNode
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  meta,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {meta}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-[13px] leading-6 text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

export function SectionHeader({
  title,
  action,
  description,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div>
        <h2 className="text-[13px] font-semibold tracking-tight text-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
