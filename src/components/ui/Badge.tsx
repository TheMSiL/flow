import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { WorkflowStatus } from '@/types/workflow'
import type { ExecutionStatus, StepStatus } from '@/types/execution'
import type { IntegrationStatus } from '@/types/integration'

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'danger'
  | 'warning'
  | 'running'
  | 'muted'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-raised text-ink-muted border-line',
  muted: 'bg-transparent text-ink-faint border-line',
  accent: 'bg-accent/12 text-accent border-accent/25',
  success: 'bg-state-success/12 text-state-success border-state-success/25',
  danger: 'bg-state-danger/12 text-state-danger border-state-danger/25',
  warning: 'bg-state-warning/12 text-state-warning border-state-warning/25',
  running: 'bg-state-running/12 text-state-running border-state-running/25',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  icon?: ReactNode
  className?: string
  size?: 'xs' | 'sm'
}

export function Badge({
  tone = 'neutral',
  children,
  icon,
  className,
  size = 'sm',
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border font-medium',
        size === 'xs' ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-2xs',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

export function Tag({
  children,
  onRemove,
  className,
}: {
  children: ReactNode
  onRemove?: () => void
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border border-line bg-surface-sunken px-1.5 py-0.5 text-2xs text-ink-muted',
        className,
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-ink-faint transition-colors hover:text-ink"
          aria-label="Remove tag"
        >
          ×
        </button>
      )}
    </span>
  )
}

/* --------------------------- Status mapping --------------------------- */

const WORKFLOW_TONES: Record<WorkflowStatus, BadgeTone> = {
  draft: 'neutral',
  published: 'success',
  paused: 'warning',
  archived: 'muted',
}

const RUN_TONES: Record<ExecutionStatus, BadgeTone> = {
  queued: 'neutral',
  running: 'running',
  success: 'success',
  failed: 'danger',
  cancelled: 'muted',
}

const STEP_TONES: Record<StepStatus, BadgeTone> = {
  pending: 'neutral',
  running: 'running',
  success: 'success',
  failed: 'danger',
  skipped: 'muted',
}

const INTEGRATION_TONES: Record<IntegrationStatus, BadgeTone> = {
  connected: 'success',
  disconnected: 'neutral',
  error: 'danger',
}

const LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  paused: 'Paused',
  archived: 'Archived',
  queued: 'Queued',
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  skipped: 'Skipped',
  connected: 'Connected',
  disconnected: 'Not connected',
  error: 'Error',
}

export function StatusDot({
  status,
  className,
  pulse,
}: {
  status: string
  className?: string
  pulse?: boolean
}) {
  const colour =
    status === 'success' || status === 'connected' || status === 'published'
      ? 'bg-state-success'
      : status === 'failed' || status === 'error'
        ? 'bg-state-danger'
        : status === 'running'
          ? 'bg-state-running'
          : status === 'paused'
            ? 'bg-state-warning'
            : 'bg-state-idle'
  return (
    <span className={cn('relative flex size-1.5 shrink-0', className)}>
      {pulse && status === 'running' && (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-state-running opacity-60" />
      )}
      <span className={cn('relative inline-flex size-full rounded-full', colour)} />
    </span>
  )
}

export function StatusBadge({
  status,
  kind = 'workflow',
  size = 'sm',
  showDot = true,
}: {
  status: string
  kind?: 'workflow' | 'run' | 'step' | 'integration'
  size?: 'xs' | 'sm'
  showDot?: boolean
}) {
  const tone =
    kind === 'run'
      ? (RUN_TONES[status as ExecutionStatus] ?? 'neutral')
      : kind === 'step'
        ? (STEP_TONES[status as StepStatus] ?? 'neutral')
        : kind === 'integration'
          ? (INTEGRATION_TONES[status as IntegrationStatus] ?? 'neutral')
          : (WORKFLOW_TONES[status as WorkflowStatus] ?? 'neutral')

  return (
    <Badge tone={tone} size={size} icon={showDot ? <StatusDot status={status} pulse /> : undefined}>
      {LABELS[status] ?? status}
    </Badge>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-line bg-surface-sunken px-1.5 font-mono text-[10px] font-medium text-ink-faint',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
