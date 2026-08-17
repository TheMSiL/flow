import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Cloud,
  CloudOff,
  Copy,
  Ellipsis,
  History,
  LoaderCircle,
  Pause,
  Play,
  Rocket,
  Trash2,
} from 'lucide-react'
import { Badge, Button, StatusBadge } from '@/components/ui'
import { Menu } from '@/components/ui/Menu'
import { useMenu } from '@/components/ui/useMenu'
import { Tooltip } from '@/components/ui/Tooltip'
import { Select } from '@/components/ui/Controls'
import { cn, modKey } from '@/lib/utils'
import type { Environment, SaveState, Workflow } from '@/types/workflow'

interface Props {
  workflow: Workflow
  saveState: SaveState
  readOnly: boolean
  canPublish: boolean
  isRunning: boolean
  errorCount: number
  onRename: (name: string) => void
  onTest: () => void
  onPublish: () => void
  onTogglePause: () => void
  onDuplicate: () => void
  onDelete: () => void
  onOpenVersions: () => void
  onEnvironmentChange: (environment: Environment) => void
}

const SAVE_COPY: Record<SaveState, { label: string; icon: typeof Check; tone: string }> = {
  saved: { label: 'Saved', icon: Check, tone: 'text-ink-faint' },
  saving: { label: 'Saving…', icon: LoaderCircle, tone: 'text-ink-muted' },
  dirty: { label: 'Unsaved changes', icon: Cloud, tone: 'text-state-warning' },
  error: { label: 'Save failed', icon: CloudOff, tone: 'text-state-danger' },
}

export function BuilderTopbar({
  workflow,
  saveState,
  readOnly,
  canPublish,
  isRunning,
  errorCount,
  onRename,
  onTest,
  onPublish,
  onTogglePause,
  onDuplicate,
  onDelete,
  onOpenVersions,
  onEnvironmentChange,
}: Props) {
  const menu = useMenu()
  const [name, setName] = useState(workflow.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setName(workflow.name), [workflow.name])

  const save = SAVE_COPY[saveState]
  const SaveIcon = save.icon

  return (
    <header className="z-header flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg px-3">
      <Tooltip content="Back to workflows">
        <Link
          to="/workflows"
          aria-label="Back to workflows"
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </Tooltip>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          ref={inputRef}
          value={name}
          disabled={readOnly}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name !== workflow.name && onRename(name.trim())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') inputRef.current?.blur()
            if (e.key === 'Escape') {
              setName(workflow.name)
              inputRef.current?.blur()
            }
          }}
          aria-label="Workflow name"
          className="min-w-0 max-w-[18rem] flex-1 truncate rounded-md bg-transparent px-1 py-1 text-sm font-semibold tracking-tight text-ink outline-none transition-colors hover:bg-surface-raised focus:bg-surface-raised disabled:hover:bg-transparent"
        />

        <StatusBadge status={workflow.status} size="xs" />

        <span
          className={cn('hidden items-center gap-1.5 text-[11px] sm:flex', save.tone)}
          aria-live="polite"
        >
          <SaveIcon
            className={cn('size-3', saveState === 'saving' && 'animate-spin')}
            aria-hidden
          />
          {save.label}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Select
          sizeVariant="sm"
          aria-label="Environment"
          value={workflow.environment}
          disabled={readOnly}
          onChange={(e) => onEnvironmentChange(e.target.value as Environment)}
          className="hidden w-[8.5rem] lg:block"
        >
          <option value="development">Development</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </Select>

        {errorCount > 0 && (
          <Tooltip content={`${errorCount} validation error${errorCount === 1 ? '' : 's'}`}>
            <span>
              <Badge tone="danger" size="xs">
                {errorCount}
              </Badge>
            </span>
          </Tooltip>
        )}

        <Button
          size="sm"
          variant="secondary"
          icon={<Play className="size-3.5" />}
          onClick={onTest}
          loading={isRunning}
        >
          <span className="hidden sm:inline">Test</span>
        </Button>

        <Button
          size="sm"
          variant="primary"
          icon={<Rocket className="size-3.5" />}
          onClick={onPublish}
          disabled={!canPublish}
        >
          <span className="hidden sm:inline">Publish</span>
        </Button>

        <button
          ref={menu.anchorRef}
          type="button"
          onClick={menu.toggle}
          aria-label="More workflow actions"
          aria-expanded={menu.open}
          className={cn(
            'flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink',
            menu.open && 'bg-surface-raised text-ink',
          )}
        >
          <Ellipsis className="size-4" aria-hidden />
        </button>

        <Menu
          open={menu.open}
          anchorRef={menu.anchorRef}
          onClose={menu.close}
          ariaLabel="Workflow actions"
          items={[
            {
              id: 'versions',
              label: 'Version history',
              icon: <History className="size-3.5" />,
              onSelect: onOpenVersions,
            },
            {
              id: 'duplicate',
              label: 'Duplicate workflow',
              icon: <Copy className="size-3.5" />,
              disabled: readOnly,
              onSelect: onDuplicate,
            },
            {
              id: 'pause',
              label: workflow.status === 'paused' ? 'Resume workflow' : 'Pause workflow',
              icon:
                workflow.status === 'paused' ? (
                  <Play className="size-3.5" />
                ) : (
                  <Pause className="size-3.5" />
                ),
              disabled: readOnly || workflow.status === 'draft',
              onSelect: onTogglePause,
            },
            {
              id: 'shortcuts',
              label: 'Keyboard shortcuts',
              shortcut: '?',
              separated: true,
              onSelect: () =>
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: '?', shiftKey: true }),
                ),
            },
            {
              id: 'save',
              label: 'Save now',
              shortcut: `${modKey()} S`,
              onSelect: () =>
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 's', metaKey: true, ctrlKey: true }),
                ),
            },
            {
              id: 'delete',
              label: 'Delete workflow',
              icon: <Trash2 className="size-3.5" />,
              tone: 'danger',
              separated: true,
              disabled: readOnly,
              onSelect: onDelete,
            },
          ]}
        />
      </div>
    </header>
  )
}
