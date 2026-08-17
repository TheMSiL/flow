import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
  delta?: { value: number; positiveIsGood?: boolean }
  sparkline?: number[]
  index?: number
  onClick?: () => void
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  delta,
  sparkline,
  index = 0,
  onClick,
}: StatCardProps) {
  // A 0.0% change is noise, not information — leave it off the card.
  const showDelta = delta !== undefined && Math.abs(delta.value) >= 0.05
  const positive = delta ? delta.value >= 0 : true
  const good = delta ? (delta.positiveIsGood ?? true) === positive : true
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <Wrapper
        onClick={onClick}
        className={cn(
          'surface-card relative flex h-full w-full flex-col overflow-hidden p-4 text-left transition-colors',
          onClick && 'hover:border-line-strong',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium text-ink-muted">{label}</p>
          {icon && <span className="text-ink-faint">{icon}</span>}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="tabular text-2xl font-semibold tracking-tight text-ink">
            {value}
          </span>
          {showDelta && delta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-medium tabular',
                good ? 'text-state-success' : 'text-state-danger',
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3" aria-hidden />
              )}
              {Math.abs(delta.value).toFixed(1)}%
            </span>
          )}
        </div>

        {hint && <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>}

        {sparkline && sparkline.length > 1 && (
          <Sparkline values={sparkline} className="mt-auto pt-3" />
        )}
      </Wrapper>
    </motion.div>
  )
}

export function Sparkline({
  values,
  className,
  tone = 'accent',
}: {
  values: number[]
  className?: string
  tone?: 'accent' | 'success' | 'danger'
}) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 100
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const stroke =
    tone === 'success'
      ? 'rgb(var(--c-success))'
      : tone === 'danger'
        ? 'rgb(var(--c-danger))'
        : 'rgb(var(--c-accent))'

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn('h-8 w-full', className)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity="0.85"
      />
    </svg>
  )
}
