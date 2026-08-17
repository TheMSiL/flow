import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Flame, Search, X } from 'lucide-react'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { CATEGORY_STYLES } from '@/components/nodes/nodeStyles'
import { Badge } from '@/components/ui/Badge'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { StorageKeys } from '@/lib/storage'
import { CATEGORIES, NODE_DEFINITIONS, searchNodeDefinitions } from '@/nodes/catalog'
import { cn } from '@/lib/utils'
import type { NodeCategory, NodeDefinition, NodeType } from '@/types/node'

interface Props {
  open: boolean
  onClose: () => void
  onPick: (type: NodeType) => void
  /** Set when the picker was opened from a node's "+" handle. */
  contextLabel?: string
}

export function NodePicker({ open, onClose, onPick, contextLabel }: Props) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<NodeCategory | 'all'>('all')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recent, setRecent] = useLocalStorage<NodeType[]>(StorageKeys.recentNodes, [
    'ai.analyze',
    'condition.if',
    'integration.slack',
  ])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setCategory('all')
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const results = useMemo(
    () => searchNodeDefinitions(query, category === 'all' ? undefined : category),
    [query, category],
  )

  const sections = useMemo(() => {
    if (query.trim()) {
      return [{ id: 'results', title: `${results.length} results`, items: results }]
    }
    if (category !== 'all') {
      return [
        {
          id: category,
          title: CATEGORIES.find((c) => c.id === category)?.plural ?? 'Nodes',
          items: results,
        },
      ]
    }
    const recentDefs = recent
      .map((type) => NODE_DEFINITIONS.find((d) => d.type === type))
      .filter((d): d is NodeDefinition => Boolean(d))
      .slice(0, 5)
    return [
      ...(recentDefs.length
        ? [{ id: 'recent', title: 'Recently used', items: recentDefs, icon: 'clock' }]
        : []),
      {
        id: 'popular',
        title: 'Popular',
        items: NODE_DEFINITIONS.filter((d) => d.popular),
        icon: 'flame',
      },
      ...CATEGORIES.map((c) => ({
        id: c.id,
        title: c.plural,
        items: NODE_DEFINITIONS.filter((d) => d.category === c.id),
      })),
    ]
  }, [query, category, results, recent])

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections])

  const choose = (type: NodeType) => {
    setRecent((current) => [type, ...current.filter((t) => t !== type)].slice(0, 6))
    onPick(type)
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, flat.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (event.key === 'Enter' && flat[activeIndex]) {
        event.preventDefault()
        choose(flat[activeIndex].type)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flat, activeIndex, onClose])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  let cursor = -1

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="absolute inset-0 z-panel bg-[rgb(var(--scrim)/0.35)]"
          />
          <motion.aside
            role="dialog"
            aria-label="Add a node"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ type: 'spring', stiffness: 440, damping: 38 }}
            className="absolute bottom-4 left-4 top-4 z-panel flex w-[19rem] flex-col overflow-hidden rounded-xl border border-line bg-surface-overlay shadow-xl"
          >
            <header className="border-b border-line px-3 pb-2.5 pt-3">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="min-w-0">
                  <h2 className="text-[13px] font-semibold text-ink">Add node</h2>
                  {contextLabel && (
                    <p className="truncate text-[11px] text-ink-faint">
                      After {contextLabel}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close node picker"
                  className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-faint"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setActiveIndex(0)
                  }}
                  placeholder="Search actions…"
                  aria-label="Search nodes"
                  className="h-8 w-full rounded-md border border-line bg-surface-sunken pl-8 pr-2 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/60"
                />
              </div>

              <div className="no-scrollbar -mx-1 mt-2.5 flex gap-1 overflow-x-auto px-1">
                <CategoryChip
                  active={category === 'all'}
                  onClick={() => setCategory('all')}
                  label="All"
                />
                {CATEGORIES.map((c) => (
                  <CategoryChip
                    key={c.id}
                    active={category === c.id}
                    onClick={() => setCategory(c.id)}
                    label={c.label}
                    tone={CATEGORY_STYLES[c.id].text}
                  />
                ))}
              </div>
            </header>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-2">
              {flat.length === 0 && (
                <p className="px-2 py-8 text-center text-xs text-ink-faint">
                  Nothing matches “{query}”.
                </p>
              )}
              {sections.map((section) =>
                section.items.length === 0 ? null : (
                  <section key={section.id} className="mb-2 last:mb-0">
                    <h3 className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {'icon' in section && section.icon === 'clock' && (
                        <Clock className="size-3" aria-hidden />
                      )}
                      {'icon' in section && section.icon === 'flame' && (
                        <Flame className="size-3" aria-hidden />
                      )}
                      {section.title}
                    </h3>
                    <ul>
                      {section.items.map((def) => {
                        cursor += 1
                        const index = cursor
                        return (
                          <li key={`${section.id}-${def.type}`}>
                            <button
                              type="button"
                              data-index={index}
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData('application/flow-node', def.type)
                                event.dataTransfer.effectAllowed = 'copy'
                              }}
                              onMouseMove={() => setActiveIndex(index)}
                              onClick={() => choose(def.type)}
                              className={cn(
                                'flex w-full cursor-grab items-start gap-2.5 rounded-md p-2 text-left transition-colors active:cursor-grabbing',
                                index === activeIndex
                                  ? 'bg-surface-raised'
                                  : 'hover:bg-surface-raised/60',
                              )}
                            >
                              <NodeIcon type={def.type} size="sm" className="mt-px" />
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="truncate text-[13px] font-medium text-ink">
                                    {def.label}
                                  </span>
                                  {def.popular && section.id !== 'popular' && (
                                    <Badge tone="muted" size="xs">
                                      Popular
                                    </Badge>
                                  )}
                                </span>
                                <span className="mt-0.5 block line-clamp-2 text-[11px] leading-4 text-ink-faint">
                                  {def.description}
                                </span>
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ),
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-line px-3 py-2 text-[10px] text-ink-faint">
              <span>Drag onto the canvas, or press ↵</span>
              <span>{NODE_DEFINITIONS.length} nodes</span>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  tone?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-2 py-0.5 text-[11px] transition-colors',
        active
          ? 'border-accent/40 bg-accent/12 text-accent'
          : cn('border-line text-ink-muted hover:border-line-strong hover:text-ink', tone),
      )}
    >
      {label}
    </button>
  )
}

