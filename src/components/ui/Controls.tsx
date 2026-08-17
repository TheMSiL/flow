import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------- Select ------------------------------- */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
  sizeVariant?: 'sm' | 'md'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, sizeVariant = 'md', children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'w-full appearance-none rounded-md border border-line bg-surface-sunken pr-8 text-ink',
          'transition-[border-color,box-shadow] duration-150 ease-out',
          'hover:border-line-strong focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/15',
          'disabled:cursor-not-allowed disabled:opacity-50',
          sizeVariant === 'sm' ? 'h-7 pl-2 text-xs' : 'h-9 pl-2.5 text-[13px]',
          invalid && 'border-state-danger/70',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
    </div>
  )
})

/* ------------------------------- Switch ------------------------------- */

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  id?: string
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: SwitchProps) {
  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-accent/40 bg-accent/85'
          : 'border-line bg-surface-sunken hover:border-line-strong',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block size-3.5 rounded-full shadow-sm transition-transform duration-200 ease-spring',
          checked ? 'translate-x-[18px] bg-accent-ink' : 'translate-x-[3px] bg-ink-faint',
        )}
      />
    </button>
  )

  if (!label) return control

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">{description}</p>
        )}
      </div>
      {control}
    </div>
  )
}

/* ------------------------------- Slider ------------------------------- */

interface SliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  formatValue?: (value: number) => string
  id?: string
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.1,
  label,
  formatValue,
  id,
}: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {label && <span className="text-xs text-ink-muted">{label}</span>}
        <span className="tabular text-xs font-medium text-ink">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-sunken outline-none
          [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-bg [&::-webkit-slider-thumb]:bg-accent
          [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110
          [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-bg [&::-moz-range-thumb]:bg-accent"
        style={{
          background: `linear-gradient(to right, rgb(var(--c-accent)) ${percent}%, rgb(var(--c-surface-sunken)) ${percent}%)`,
        }}
      />
    </div>
  )
}

/* ----------------------------- Segmented ------------------------------ */

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: React.ReactNode }[]
  size?: 'sm' | 'md'
  ariaLabel?: string
  className?: string
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-sunken p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[5px] font-medium transition-all duration-150 ease-out',
              size === 'sm' ? 'h-6 px-2 text-2xs' : 'h-7 px-2.5 text-xs',
              active
                ? 'bg-surface-raised text-ink shadow-xs'
                : 'text-ink-faint hover:text-ink-muted',
            )}
          >
            {option.icon}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
