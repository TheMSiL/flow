import type { ReactNode, RefObject } from 'react'
import { Popover, type Placement } from './Popover'
import { cn } from '@/lib/utils'

export interface MenuItem {
  id: string
  label: string
  icon?: ReactNode
  shortcut?: string
  onSelect?: () => void
  tone?: 'default' | 'danger'
  disabled?: boolean
  /** Renders a divider above this item. */
  separated?: boolean
  checked?: boolean
}

interface MenuProps {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  items: MenuItem[]
  placement?: Placement
  width?: number
  header?: ReactNode
  ariaLabel?: string
}

export function Menu({
  open,
  anchorRef,
  onClose,
  items,
  placement = 'bottom-end',
  width = 200,
  header,
  ariaLabel = 'Menu',
}: MenuProps) {
  return (
    <Popover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      placement={placement}
      ariaLabel={ariaLabel}
    >
      <div
        role="menu"
        style={{ minWidth: width }}
        className="overflow-hidden rounded-lg border border-line bg-surface-overlay p-1 shadow-xl"
      >
        {header && (
          <div className="border-b border-line px-2.5 pb-2 pt-1.5">{header}</div>
        )}
        {items.map((item) => (
          <div key={item.id}>
            {item.separated && <div className="my-1 h-px bg-line" />}
            <button
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect?.()
                onClose()
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
                'disabled:pointer-events-none disabled:opacity-40',
                item.tone === 'danger'
                  ? 'text-state-danger hover:bg-state-danger/10'
                  : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
              )}
            >
              {item.icon && (
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="flex-1 truncate">{item.label}</span>
              {item.checked && <span className="text-accent">✓</span>}
              {item.shortcut && (
                <span className="font-mono text-[10px] text-ink-faint">
                  {item.shortcut}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>
    </Popover>
  )
}
