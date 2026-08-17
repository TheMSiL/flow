import { cn } from '@/lib/utils'

/**
 * The mark is three stacked flow lines of decreasing length — a workflow
 * narrowing to a single output.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-7', className)}
      role="img"
      aria-label="FLOW"
    >
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <path
        d="M10 10h12M10 16h8.5M10 22h5"
        stroke="rgb(var(--c-accent-ink))"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-semibold tracking-[0.18em] text-ink',
        className,
      )}
    >
      FLOW
    </span>
  )
}
