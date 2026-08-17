import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type Placement =
  | 'bottom-start'
  | 'bottom-end'
  | 'bottom'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'right'
  | 'left'

interface Rect {
  top: number
  left: number
}

const GAP = 8
const MARGIN = 8

function computePosition(
  anchor: DOMRect,
  floating: { width: number; height: number },
  placement: Placement,
): Rect {
  let top = 0
  let left = 0

  switch (placement) {
    case 'top':
      top = anchor.top - floating.height - GAP
      left = anchor.left + anchor.width / 2 - floating.width / 2
      break
    case 'top-start':
      top = anchor.top - floating.height - GAP
      left = anchor.left
      break
    case 'top-end':
      top = anchor.top - floating.height - GAP
      left = anchor.right - floating.width
      break
    case 'bottom':
      top = anchor.bottom + GAP
      left = anchor.left + anchor.width / 2 - floating.width / 2
      break
    case 'bottom-end':
      top = anchor.bottom + GAP
      left = anchor.right - floating.width
      break
    case 'right':
      top = anchor.top + anchor.height / 2 - floating.height / 2
      left = anchor.right + GAP
      break
    case 'left':
      top = anchor.top + anchor.height / 2 - floating.height / 2
      left = anchor.left - floating.width - GAP
      break
    default:
      top = anchor.bottom + GAP
      left = anchor.left
  }

  // Flip vertically when the preferred side would overflow.
  if (top + floating.height > window.innerHeight - MARGIN) {
    const flipped = anchor.top - floating.height - GAP
    if (flipped > MARGIN) top = flipped
    else top = Math.max(MARGIN, window.innerHeight - floating.height - MARGIN)
  }
  if (top < MARGIN) top = MARGIN

  left = Math.min(
    Math.max(MARGIN, left),
    Math.max(MARGIN, window.innerWidth - floating.width - MARGIN),
  )

  return { top, left }
}

interface PopoverProps {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  placement?: Placement
  children: ReactNode
  className?: string
  /** Skips focus trapping / outside-click for hover tooltips. */
  passive?: boolean
  matchAnchorWidth?: boolean
  ariaLabel?: string
}

export function Popover({
  open,
  anchorRef,
  onClose,
  placement = 'bottom-start',
  children,
  className,
  passive = false,
  matchAnchorWidth = false,
  ariaLabel,
}: PopoverProps) {
  const floatingRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<Rect>({ top: -9999, left: -9999 })
  const [width, setWidth] = useState<number>()

  const reposition = useCallback(() => {
    const anchor = anchorRef.current
    const floating = floatingRef.current
    if (!anchor || !floating) return
    const anchorRect = anchor.getBoundingClientRect()
    setPosition(
      computePosition(
        anchorRect,
        { width: floating.offsetWidth, height: floating.offsetHeight },
        placement,
      ),
    )
    if (matchAnchorWidth) setWidth(anchorRect.width)
  }, [anchorRef, placement, matchAnchorWidth])

  useLayoutEffect(() => {
    if (!open) return
    reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const handle = () => reposition()
    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle, true)
      window.removeEventListener('resize', handle)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open || passive) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (floatingRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, passive, onClose, anchorRef])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={floatingRef}
          role={passive ? 'tooltip' : 'dialog'}
          aria-label={ariaLabel}
          initial={{ opacity: 0, scale: 0.97, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -2 }}
          transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width,
            zIndex: 90,
          }}
          className={cn(passive && 'pointer-events-none', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
