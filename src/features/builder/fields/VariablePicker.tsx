import { useMemo, useRef, useState, type RefObject } from 'react'
import { Braces, Search } from 'lucide-react'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/utils'
import type { VariableGroup } from '@/lib/variables'

const TYPE_TONE: Record<string, string> = {
  string: 'text-cat-action',
  number: 'text-cat-condition',
  boolean: 'text-cat-integration',
  object: 'text-cat-ai',
  array: 'text-cat-trigger',
}

interface Props {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose: () => void
  groups: VariableGroup[]
  onSelect: (path: string) => void
}

export function VariablePickerPopover({
  open,
  anchorRef,
  onClose,
  groups,
  onSelect,
}: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((group) => ({
        ...group,
        entries: group.entries.filter(
          (entry) =>
            entry.path.toLowerCase().includes(q) ||
            entry.description.toLowerCase().includes(q) ||
            entry.source.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.entries.length > 0)
  }, [groups, query])

  return (
    <Popover
      open={open}
      anchorRef={anchorRef}
      onClose={onClose}
      placement="bottom-end"
      ariaLabel="Insert variable"
    >
      <div className="flex max-h-[22rem] w-[20rem] flex-col overflow-hidden rounded-lg border border-line bg-surface-overlay shadow-xl">
        <div className="relative border-b border-line">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          {/* The popover opens on an explicit click, so taking focus is expected. */}
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="lead.email, deal.value…"
            aria-label="Search variables"
            className="h-9 w-full bg-transparent pl-8 pr-2.5 text-[13px] text-ink outline-none placeholder:text-ink-faint"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-ink-faint">
              No variables match “{query}”.
            </p>
          )}
          {filtered.map((group) => (
            <section key={group.id} className="mb-1 last:mb-0">
              <div className="px-2 pb-1 pt-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  {group.label}
                </p>
                {group.hint && (
                  <p className="text-[10px] text-ink-faint/70">{group.hint}</p>
                )}
              </div>
              <ul>
                {group.entries.map((entry) => (
                  <li key={`${group.id}-${entry.path}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(entry.path)
                        onClose()
                      }}
                      className="group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-raised"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[11px] text-ink">
                          {'{{'}
                          {entry.path}
                          {'}}'}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] text-ink-faint">
                          {entry.description} · {entry.source}
                        </span>
                      </span>
                      <span
                        className={cn(
                          'shrink-0 rounded border border-line px-1 py-px text-[9px] uppercase',
                          TYPE_TONE[entry.type] ?? 'text-ink-faint',
                        )}
                      >
                        {entry.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="border-t border-line px-2.5 py-1.5 text-[10px] text-ink-faint">
          Values resolve at run time from the trigger and upstream outputs.
        </footer>
      </div>
    </Popover>
  )
}

/** Button + popover pairing used by every variable-enabled field. */
export function InsertVariableButton({
  groups,
  onSelect,
  compact,
}: {
  groups: VariableGroup[]
  onSelect: (path: string) => void
  compact?: boolean
}) {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'inline-flex items-center gap-1 rounded text-[10px] font-medium text-ink-faint transition-colors hover:text-accent',
          compact ? 'px-1' : 'px-1.5 py-0.5',
        )}
      >
        <Braces className="size-3" aria-hidden />
        {!compact && 'Insert variable'}
      </button>
      <VariablePickerPopover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        groups={groups}
        onSelect={onSelect}
      />
    </>
  )
}
