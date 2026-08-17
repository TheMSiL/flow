import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface TabItem<T extends string = string> {
  id: T
  label: string
  icon?: ReactNode
  count?: number
  disabled?: boolean
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  variant?: 'underline' | 'pill'
  className?: string
  ariaLabel?: string
  /** Shared layoutId — must be unique when two tab bars are on screen. */
  layoutId?: string
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  className,
  ariaLabel,
  layoutId = 'tab-indicator',
}: TabsProps<T>) {
  if (variant === 'pill') {
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn('no-scrollbar flex items-center gap-1 overflow-x-auto', className)}
      >
        {items.map((item) => {
          const active = item.id === value
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={active}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              className={cn(
                'relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                'disabled:pointer-events-none disabled:opacity-40',
                active
                  ? 'text-accent-ink'
                  : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {item.icon}
                {item.label}
                {item.count !== undefined && (
                  <span className={cn('tabular', active ? 'opacity-70' : 'text-ink-faint')}>
                    {item.count}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'no-scrollbar flex items-center gap-4 overflow-x-auto border-b border-line',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative shrink-0 pb-2.5 pt-1 text-[13px] font-medium transition-colors',
              'disabled:pointer-events-none disabled:opacity-40',
              active ? 'text-ink' : 'text-ink-faint hover:text-ink-muted',
            )}
          >
            <span className="flex items-center gap-1.5">
              {item.icon}
              {item.label}
              {item.count !== undefined && (
                <span className="tabular rounded-full bg-surface-raised px-1.5 py-px text-[10px] text-ink-muted">
                  {item.count}
                </span>
              )}
            </span>
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent"
                transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
