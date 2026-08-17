import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  side?: 'right' | 'left'
  width?: string
  footer?: ReactNode
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  width = 'w-[min(26rem,100vw)]',
  footer,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-drawer">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(var(--scrim)/0.6)]"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Panel'}
            initial={{ x: side === 'right' ? '100%' : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'right' ? '100%' : '-100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            className={cn(
              'absolute inset-y-0 flex flex-col border-line bg-surface shadow-xl',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              width,
            )}
          >
            {title && (
              <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close panel"
                  className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </header>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer && (
              <footer className="border-t border-line px-4 py-3">{footer}</footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

/** Mobile-first sheet with a drag-to-dismiss handle. */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKeyDown)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
    }
  }, [open, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-drawer flex items-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(var(--scrim)/0.65)]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Details'}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
            className="relative flex max-h-[88vh] w-full flex-col rounded-t-2xl border-t border-line bg-surface shadow-xl"
          >
            <div className="flex justify-center pb-1 pt-2">
              <span className="h-1 w-9 rounded-full bg-line-strong" />
            </div>
            {title && (
              <header className="border-b border-line px-4 pb-3 pt-1">
                <h2 className="text-sm font-semibold text-ink">{title}</h2>
                {subtitle && (
                  <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
                )}
              </header>
            )}
            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {children}
            </div>
            {footer && (
              <footer
                className="border-t border-line px-4 py-3"
                style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
              >
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
