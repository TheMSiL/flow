import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const BASE =
  'w-full bg-surface-sunken border border-line rounded-md text-ink placeholder:text-ink-faint ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ease-out ' +
  'hover:border-line-strong focus:outline-none focus:border-accent/70 focus:ring-2 focus:ring-accent/15 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  sizeVariant?: 'sm' | 'md'
  mono?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, sizeVariant = 'md', mono, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        BASE,
        sizeVariant === 'sm' ? 'h-7 px-2 text-xs' : 'h-9 px-2.5 text-[13px]',
        mono && 'font-mono text-xs',
        invalid && 'border-state-danger/70 focus:border-state-danger focus:ring-state-danger/15',
        className,
      )}
      {...props}
    />
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  mono?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, mono, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          BASE,
          'resize-y px-2.5 py-2 text-[13px] leading-6',
          mono && 'font-mono text-xs leading-5',
          invalid && 'border-state-danger/70 focus:border-state-danger focus:ring-state-danger/15',
          className,
        )}
        {...props}
      />
    )
  },
)

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  action?: ReactNode
  children: ReactNode
  htmlFor?: string
  className?: string
}

export function Field({
  label,
  hint,
  error,
  required,
  action,
  children,
  htmlFor,
  className,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {(label || action) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={htmlFor}
              className="text-xs font-medium text-ink-muted"
            >
              {label}
              {required && <span className="ml-1 text-state-danger">*</span>}
            </label>
          )}
          {action}
        </div>
      )}
      {children}
      {error ? (
        <p className="text-xs text-state-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs leading-5 text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}

interface SearchInputProps extends Omit<InputProps, 'onChange' | 'value'> {
  value: string
  onChange: (value: string) => void
  shortcut?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  shortcut,
  className,
  ...props
}: SearchInputProps) {
  const id = useId()
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
        aria-hidden
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-faint transition-colors hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : shortcut ? (
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-faint sm:block">
          {shortcut}
        </kbd>
      ) : null}
    </div>
  )
}
