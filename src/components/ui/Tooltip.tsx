import {
  cloneElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { Popover, type Placement } from './Popover'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: ReactNode
  children: ReactElement<{ ref?: Ref<HTMLElement> }>
  placement?: Placement
  shortcut?: string
  delay?: number
  disabled?: boolean
}

/**
 * Hover / focus tooltip. Cloned onto the child so it works with any
 * trigger element without an extra wrapper node in the layout.
 */
export function Tooltip({
  content,
  children,
  placement = 'bottom',
  shortcut,
  delay = 380,
  disabled,
}: TooltipProps) {
  const anchorRef = useRef<HTMLElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const [open, setOpen] = useState(false)

  const show = () => {
    if (disabled) return
    timer.current = setTimeout(() => setOpen(true), delay)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(false)
  }

  const trigger = cloneElement(children, {
    ref: anchorRef,
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  } as Record<string, unknown>)

  return (
    <>
      {trigger}
      <Popover
        open={open && !disabled}
        anchorRef={anchorRef}
        onClose={hide}
        placement={placement}
        passive
      >
        <div
          className={cn(
            'flex items-center gap-2 rounded-md border border-line bg-surface-overlay px-2 py-1 text-xs text-ink shadow-lg',
          )}
        >
          <span className="whitespace-nowrap">{content}</span>
          {shortcut && (
            <span className="font-mono text-[10px] text-ink-faint">{shortcut}</span>
          )}
        </div>
      </Popover>
    </>
  )
}
