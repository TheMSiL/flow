import { useReactFlow } from '@xyflow/react'
import {
  Crosshair,
  Info,
  Map as MapIcon,
  MessageCircle,
  Plus,
  Redo2,
  ShieldCheck,
  StickyNote,
  Undo2,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn, modKey } from '@/lib/utils'
import type { ValidationResult } from '@/types/workflow'
import type { PanelMode } from './BuilderPage'

interface Props {
  onAddNode: () => void
  onAddNote: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  showMinimap: boolean
  onToggleMinimap: () => void
  validation: ValidationResult
  panel: PanelMode
  onPanelChange: (panel: PanelMode) => void
  readOnly: boolean
  commentCount: number
}

export function BuilderToolbar({
  onAddNode,
  onAddNote,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showMinimap,
  onToggleMinimap,
  validation,
  panel,
  onPanelChange,
  readOnly,
  commentCount,
}: Props) {
  const { fitView } = useReactFlow()
  const mod = modKey()

  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b border-line bg-surface px-2.5">
      <button
        type="button"
        onClick={onAddNode}
        disabled={readOnly}
        className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent px-2.5 text-xs font-medium text-accent-ink transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45"
      >
        <Plus className="size-3.5" aria-hidden />
        Add node
        <kbd className="ml-0.5 rounded bg-black/15 px-1 font-mono text-[9px]">N</kbd>
      </button>

      <Tooltip content="Add sticky note">
        <button
          type="button"
          onClick={onAddNote}
          disabled={readOnly}
          aria-label="Add sticky note"
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-40"
        >
          <StickyNote className="size-3.5" aria-hidden />
        </button>
      </Tooltip>

      <Divider />

      <Tooltip content="Undo" shortcut={`${mod} Z`}>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo || readOnly}
          aria-label="Undo"
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-30"
        >
          <Undo2 className="size-3.5" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip content="Redo" shortcut={`${mod} ⇧ Z`}>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo || readOnly}
          aria-label="Redo"
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink disabled:opacity-30"
        >
          <Redo2 className="size-3.5" aria-hidden />
        </button>
      </Tooltip>

      <Divider />

      <Tooltip content="Fit view" shortcut="F">
        <button
          type="button"
          onClick={() => fitView({ padding: 0.28, duration: 320 })}
          aria-label="Fit view"
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
        >
          <Crosshair className="size-3.5" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip content={showMinimap ? 'Hide minimap' : 'Show minimap'} shortcut="M">
        <button
          type="button"
          onClick={onToggleMinimap}
          aria-label="Toggle minimap"
          aria-pressed={showMinimap}
          className={cn(
            'flex size-7 items-center justify-center rounded-md transition-colors hover:bg-surface-raised',
            showMinimap ? 'text-ink' : 'text-ink-faint',
          )}
        >
          <MapIcon className="size-3.5" aria-hidden />
        </button>
      </Tooltip>

      <div className="ml-auto flex items-center gap-1">
        <PanelTab
          active={panel === 'overview'}
          onClick={() => onPanelChange('overview')}
          icon={<Info className="size-3.5" aria-hidden />}
          label="Overview"
        />
        <PanelTab
          active={panel === 'validation'}
          onClick={() => onPanelChange('validation')}
          icon={<ShieldCheck className="size-3.5" aria-hidden />}
          label="Validate"
          badge={
            validation.errorCount > 0 ? (
              <Badge tone="danger" size="xs">
                {validation.errorCount}
              </Badge>
            ) : validation.warningCount > 0 ? (
              <Badge tone="warning" size="xs">
                {validation.warningCount}
              </Badge>
            ) : (
              <Badge tone="success" size="xs">
                OK
              </Badge>
            )
          }
        />
        <PanelTab
          active={panel === 'comments'}
          onClick={() => onPanelChange('comments')}
          icon={<MessageCircle className="size-3.5" aria-hidden />}
          label="Comments"
          badge={
            commentCount > 0 ? (
              <Badge tone="neutral" size="xs">
                {commentCount}
              </Badge>
            ) : undefined
          }
        />
      </div>
    </div>
  )
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-line" aria-hidden />
}

function PanelTab({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  badge?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs transition-colors',
        active
          ? 'bg-surface-raised text-ink'
          : 'text-ink-muted hover:bg-surface-raised/60 hover:text-ink',
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
      {badge}
    </button>
  )
}
