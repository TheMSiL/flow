import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'subtle'
  | 'danger'
  | 'outline'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink hover:brightness-110 active:brightness-95 shadow-xs font-medium',
  secondary:
    'bg-surface-raised text-ink border border-line hover:border-line-strong hover:bg-surface-raised/80',
  outline: 'border border-line-strong text-ink hover:bg-surface-raised',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-raised',
  subtle: 'bg-surface-sunken text-ink-muted hover:text-ink hover:bg-surface-raised',
  danger: 'bg-state-danger text-white hover:brightness-110 active:brightness-95',
}

const SIZES: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-2xs gap-1 rounded-sm',
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3 text-[13px] gap-1.5 rounded-md',
  lg: 'h-10 px-4 text-sm gap-2 rounded-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  full?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    iconRight,
    full,
    className,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[background-color,border-color,color,filter,transform] duration-150 ease-out',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        full && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        icon
      )}
      {children}
      {iconRight}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  label: string
  active?: boolean
}

const ICON_SIZES: Record<ButtonSize, string> = {
  xs: 'size-6 rounded-sm',
  sm: 'size-7 rounded-md',
  md: 'size-8 rounded-md',
  lg: 'size-10 rounded-lg',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = 'ghost', size = 'md', label, active, className, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex shrink-0 items-center justify-center transition-all duration-150 ease-out',
          'active:scale-95 disabled:pointer-events-none disabled:opacity-40',
          VARIANTS[variant],
          ICON_SIZES[size],
          active && 'bg-accent/12 text-accent',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    )
  },
)
