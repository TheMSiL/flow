import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChartColumn,
  CornerDownLeft,
  History,
  LayoutDashboard,
  LayoutTemplate,
  Moon,
  PanelLeft,
  Plus,
  Puzzle,
  Search,
  Settings,
  Sun,
  Workflow as WorkflowIcon,
} from 'lucide-react'
import { commandRegistry, type Command } from '@/app/commandRegistry'
import { useUi } from '@/app/providers/UiProvider'
import { useSettings } from '@/app/providers/SettingsProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { useDb } from '@/hooks/useDb'
import { StatusDot } from '@/components/ui/Badge'
import { cn, modKey } from '@/lib/utils'
import type { DbState } from '@/services/db'
import type { Workflow } from '@/types/workflow'

const selectWorkflows = (s: DbState) => s.workflows

export function CommandPalette() {
  const { commandOpen, setCommandOpen, toggleSidebar } = useUi()
  const { theme, setTheme } = useSettings()
  const { workspace } = useWorkspace()
  const workflows = useDb(selectWorkflows)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const contextual = useSyncExternalStore(
    commandRegistry.subscribe,
    commandRegistry.get,
    commandRegistry.get,
  )

  const close = useCallback(() => setCommandOpen(false), [setCommandOpen])

  const globalCommands = useMemo<Command[]>(
    () => [
      {
        id: 'nav-overview',
        label: 'Open Overview',
        group: 'Navigation',
        icon: <LayoutDashboard className="size-3.5" />,
        run: () => navigate('/'),
      },
      {
        id: 'nav-workflows',
        label: 'Open Workflows',
        group: 'Navigation',
        icon: <WorkflowIcon className="size-3.5" />,
        run: () => navigate('/workflows'),
      },
      {
        id: 'nav-runs',
        label: 'Open Runs',
        group: 'Navigation',
        icon: <History className="size-3.5" />,
        run: () => navigate('/runs'),
      },
      {
        id: 'nav-integrations',
        label: 'Open Integrations',
        group: 'Navigation',
        icon: <Puzzle className="size-3.5" />,
        run: () => navigate('/integrations'),
      },
      {
        id: 'nav-templates',
        label: 'Open Templates',
        group: 'Navigation',
        icon: <LayoutTemplate className="size-3.5" />,
        run: () => navigate('/templates'),
      },
      {
        id: 'nav-analytics',
        label: 'Open Analytics',
        group: 'Navigation',
        icon: <ChartColumn className="size-3.5" />,
        run: () => navigate('/analytics'),
      },
      {
        id: 'nav-settings',
        label: 'Open Settings',
        group: 'Navigation',
        icon: <Settings className="size-3.5" />,
        shortcut: `${modKey()} ,`,
        run: () => navigate('/settings'),
      },
      {
        id: 'new-workflow',
        label: 'New workflow',
        group: 'Actions',
        icon: <Plus className="size-3.5" />,
        keywords: 'create build blank',
        run: () => navigate('/workflows?new=1'),
      },
      {
        id: 'toggle-sidebar',
        label: 'Toggle sidebar',
        group: 'Actions',
        icon: <PanelLeft className="size-3.5" />,
        shortcut: `${modKey()} B`,
        run: toggleSidebar,
      },
      {
        id: 'toggle-theme',
        label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        group: 'Actions',
        icon:
          theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />,
        keywords: 'appearance dark light mode',
        run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      },
    ],
    [navigate, toggleSidebar, theme, setTheme],
  )

  const workflowCommands = useMemo<Command[]>(
    () =>
      workflows
        .filter((w) => w.workspaceId === workspace.id)
        .slice(0, 40)
        .map((w: Workflow) => ({
          id: `wf-${w.id}`,
          label: w.name,
          group: 'Workflows',
          icon: <StatusDot status={w.status} />,
          keywords: `${w.description} ${w.tags.join(' ')}`,
          run: () => navigate(`/workflows/${w.id}`),
        })),
    [workflows, workspace.id, navigate],
  )

  const results = useMemo(() => {
    const all = [...contextual, ...globalCommands, ...workflowCommands]
    const q = query.trim().toLowerCase()
    const matched = q
      ? all.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            c.group.toLowerCase().includes(q) ||
            (c.keywords ?? '').toLowerCase().includes(q),
        )
      : all
    const groups = new Map<string, Command[]>()
    for (const command of matched) {
      groups.set(command.group, [...(groups.get(command.group) ?? []), command])
    }
    const flat = [...groups.values()].flat()
    return { groups: [...groups.entries()], flat }
  }, [contextual, globalCommands, workflowCommands, query])

  useEffect(() => setActiveIndex(0), [query, commandOpen])

  useEffect(() => {
    if (!commandOpen) setQuery('')
  }, [commandOpen])

  useEffect(() => {
    if (!commandOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, results.flat.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (event.key === 'Enter') {
        event.preventDefault()
        const command = results.flat[activeIndex]
        if (command && !command.disabled) {
          close()
          command.run()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [commandOpen, results.flat, activeIndex, close])

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (typeof document === 'undefined') return null

  let cursor = -1

  return createPortal(
    <AnimatePresence>
      {commandOpen && (
        <div className="fixed inset-0 z-palette flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14 }}
            onClick={close}
            className="absolute inset-0 bg-[rgb(var(--scrim)/0.7)] backdrop-blur-[3px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ type: 'spring', stiffness: 520, damping: 40 }}
            className="relative flex max-h-[min(32rem,70vh)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-line bg-surface-overlay shadow-xl"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-3.5">
              <Search className="size-4 shrink-0 text-ink-faint" aria-hidden />
              {/* Autofocus is correct here: the palette exists to be typed into. */}
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands, workflows…"
                aria-label="Search commands"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              />
              <kbd className="hidden rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-faint sm:block">
                ESC
              </kbd>
            </div>

            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-1.5">
              {results.flat.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-ink-faint">
                  No results for “{query}”
                </p>
              ) : (
                results.groups.map(([group, commands]) => (
                  <div key={group} className="mb-1 last:mb-0">
                    <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {group}
                    </p>
                    {commands.map((command) => {
                      cursor += 1
                      const index = cursor
                      const active = index === activeIndex
                      return (
                        <button
                          key={command.id}
                          data-index={index}
                          type="button"
                          disabled={command.disabled}
                          onMouseMove={() => setActiveIndex(index)}
                          onClick={() => {
                            close()
                            command.run()
                          }}
                          className={cn(
                            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                            'disabled:pointer-events-none disabled:opacity-40',
                            active
                              ? 'bg-surface-raised text-ink'
                              : 'text-ink-muted hover:text-ink',
                          )}
                        >
                          <span className="flex size-4 shrink-0 items-center justify-center text-ink-faint">
                            {command.icon}
                          </span>
                          <span className="flex-1 truncate">{command.label}</span>
                          {command.shortcut && (
                            <span className="font-mono text-[10px] text-ink-faint">
                              {command.shortcut}
                            </span>
                          )}
                          {active && (
                            <CornerDownLeft
                              className="size-3 shrink-0 text-ink-faint"
                              aria-hidden
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            <footer className="flex items-center gap-3 border-t border-line px-3 py-2 text-[10px] text-ink-faint">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line px-1">↑</kbd>
                <kbd className="rounded border border-line px-1">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-line px-1">↵</kbd>
                select
              </span>
              <span className="ml-auto">{results.flat.length} results</span>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
