import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CircleAlert, Info, TriangleAlert, X } from 'lucide-react'
import { cn, uid } from '@/lib/utils'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  tone: ToastTone
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

interface ToastContextValue {
  toast: (input: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_STYLE: Record<ToastTone, { icon: typeof Check; className: string }> = {
  success: { icon: Check, className: 'text-state-success' },
  error: { icon: CircleAlert, className: 'text-state-danger' },
  warning: { icon: TriangleAlert, className: 'text-state-warning' },
  info: { icon: Info, className: 'text-state-running' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const toast = useCallback(
    (input: Omit<Toast, 'id'>) => {
      const id = uid('toast')
      const next: Toast = { id, duration: 4200, ...input }
      setToasts((current) => [...current.slice(-3), next])
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), next.duration),
      )
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => {
            const { icon: Icon, className } = TONE_STYLE[item.tone]
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-surface-overlay p-3 shadow-lg"
                role="status"
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', className)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-5 text-ink">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs leading-5 text-ink-muted">
                      {item.description}
                    </p>
                  )}
                  {item.action && (
                    <button
                      type="button"
                      onClick={() => {
                        item.action?.onClick()
                        dismiss(item.id)
                      }}
                      className="mt-2 text-xs font-medium text-accent transition-opacity hover:opacity-80"
                    >
                      {item.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="-m-1 rounded p-1 text-ink-faint transition-colors hover:text-ink"
                  aria-label="Dismiss notification"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
