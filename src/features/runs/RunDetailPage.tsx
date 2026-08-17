import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  ExternalLink,
  LoaderCircle,
  RotateCcw,
  Square,
  Timer,
  Webhook,
} from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader } from '@/components/common/PageHeader'
import { JsonViewer } from '@/features/builder/panels/JsonViewer'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import {
  Badge,
  Button,
  Callout,
  EmptyState,
  StatusBadge,
  Tabs,
} from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import { useDb } from '@/hooks/useDb'
import { useToast } from '@/app/providers/ToastProvider'
import { executionService } from '@/services/execution.service'
import { getUser } from '@/data/users'
import {
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatTimeWithSeconds,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DbState } from '@/services/db'
import type { ExecutionStep, LogEntry } from '@/types/execution'

const LOG_TONE: Record<LogEntry['level'], string> = {
  info: 'text-ink-muted',
  success: 'text-state-success',
  warn: 'text-state-warning',
  error: 'text-state-danger',
}

export default function RunDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const run = useDb(
    useCallback((s: DbState) => s.executions.find((e) => e.id === id) ?? null, [id]),
  )
  const [tab, setTab] = useState<'timeline' | 'log' | 'payload'>('timeline')
  const [retrying, setRetrying] = useState(false)
  const [openStep, setOpenStep] = useState<string | null>(null)

  const failedStep = useMemo(
    () => run?.steps.find((s) => s.status === 'failed'),
    [run],
  )

  if (!run) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Runs', to: '/runs' }, { label: 'Not found' }]} />
        <PageBody>
          <EmptyState
            icon={<Webhook className="size-5" aria-hidden />}
            title="Run not found"
            description={`No execution with the id “${id}”.`}
            action={
              <Button variant="primary" onClick={() => navigate('/runs')}>
                Back to runs
              </Button>
            }
          />
        </PageBody>
      </>
    )
  }

  const user = run.triggeredBy === 'system' ? null : getUser(run.triggeredBy)

  const retry = async () => {
    setRetrying(true)
    const next = await executionService.retryRun(run.id)
    setRetrying(false)
    if (next) {
      toast({
        tone: next.status === 'success' ? 'success' : 'error',
        title: next.status === 'success' ? 'Retry succeeded' : 'Retry failed again',
        description: next.error?.message,
      })
      navigate(`/runs/${next.id}`)
    }
  }

  return (
    <>
      <Topbar
        crumbs={[{ label: 'Runs', to: '/runs' }, { label: run.id }]}
        actions={
          <>
            <Button
              size="sm"
              variant="secondary"
              icon={<RotateCcw className="size-3.5" />}
              loading={retrying}
              onClick={retry}
            >
              <span className="hidden sm:inline">Retry run</span>
            </Button>
            {run.status === 'running' && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Square className="size-3" />}
                onClick={() => executionService.cancelRun(run.id)}
              >
                Cancel
              </Button>
            )}
          </>
        }
      />
      <PageBody>
        <div className="mb-4">
          <Link
            to="/runs"
            className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All runs
          </Link>
        </div>

        <PageHeader
          title={run.workflowName}
          description={`Run ${run.id} · started ${formatDateTime(run.startedAt)}`}
          meta={<StatusBadge status={run.status} kind="run" />}
          actions={
            <Button
              size="sm"
              variant="secondary"
              iconRight={<ExternalLink className="size-3.5" />}
              onClick={() => navigate(`/workflows/${run.workflowId}`)}
            >
              Open workflow
            </Button>
          }
        />

        {run.error && (
          <div className="mt-4">
            <Callout
              tone="danger"
              title={run.error.title}
              icon={<CircleX className="size-4" aria-hidden />}
              action={
                <div className="flex gap-2">
                  {failedStep && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => navigate(`/workflows/${run.workflowId}`)}
                    >
                      Open node
                    </Button>
                  )}
                  <Button size="xs" variant="ghost" onClick={retry} loading={retrying}>
                    Retry run
                  </Button>
                </div>
              }
            >
              <p>{run.error.message}</p>
              {failedStep && (
                <p className="mt-1 text-ink-faint">
                  Failed at step {run.steps.indexOf(failedStep) + 1} —{' '}
                  <span className="text-ink">{failedStep.nodeLabel}</span>
                </p>
              )}
              {run.error.hint && <p className="mt-1 text-ink-faint">{run.error.hint}</p>}
            </Callout>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Fact label="Status" value={<StatusBadge status={run.status} kind="run" size="xs" />} />
          <Fact
            label="Duration"
            value={
              <span className="tabular inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
                <Timer className="size-3.5 text-ink-faint" aria-hidden />
                {run.status === 'running' ? 'in progress' : formatDuration(run.durationMs)}
              </span>
            }
          />
          <Fact
            label="Steps"
            value={
              <span className="tabular text-[13px] font-medium text-ink">
                {run.steps.filter((s) => s.status === 'success').length}/{run.steps.length}
              </span>
            }
          />
          <Fact
            label="Triggered by"
            value={
              <span className="flex items-center gap-1.5 text-[13px] text-ink">
                {user ? (
                  <>
                    <Avatar user={user} size="xs" />
                    <span className="truncate">{user.name}</span>
                  </>
                ) : (
                  <>
                    <Webhook className="size-3.5 text-ink-faint" aria-hidden />
                    <span className="capitalize">{run.triggerSource}</span>
                  </>
                )}
              </span>
            }
          />
          <Fact
            label="Cost"
            value={
              <span className="tabular text-[13px] font-medium text-ink">
                {formatCurrency(run.cost, 4)}
              </span>
            }
          />
        </dl>

        <div className="mt-5">
          <Tabs
            layoutId="run-detail-tabs"
            value={tab}
            onChange={(value) => setTab(value as typeof tab)}
            ariaLabel="Run detail sections"
            items={[
              { id: 'timeline', label: 'Timeline', count: run.steps.length },
              { id: 'log', label: 'Log', count: run.logs.length },
              { id: 'payload', label: 'Input & output' },
            ]}
          />
        </div>

        <div className="mt-4">
          {tab === 'timeline' && (
            <ol className="space-y-2">
              {run.steps.map((step, index) => (
                <li key={step.id}>
                  <StepRow
                    step={step}
                    index={index}
                    open={openStep === step.id}
                    onToggle={() => setOpenStep(openStep === step.id ? null : step.id)}
                    startedAtMs={new Date(run.startedAt).getTime()}
                    totalMs={run.durationMs || 1}
                  />
                </li>
              ))}
              {run.steps.length === 0 && (
                <EmptyState
                  compact
                  title="No steps recorded"
                  description="The run ended before any node executed."
                />
              )}
            </ol>
          )}

          {tab === 'log' && (
            <div className="surface-card overflow-hidden">
              <ul className="divide-y divide-line font-mono text-[11px]">
                {run.logs.map((entry) => (
                  <li key={entry.id} className="flex gap-3 px-3 py-2">
                    <span className="tabular shrink-0 text-ink-faint">
                      {formatTimeWithSeconds(entry.ts)}
                    </span>
                    {entry.nodeLabel && (
                      <span className="w-40 shrink-0 truncate text-ink">
                        {entry.nodeLabel}
                      </span>
                    )}
                    <span className={cn('min-w-0 flex-1 break-words', LOG_TONE[entry.level])}>
                      {entry.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'payload' && (
            <div className="grid gap-3 lg:grid-cols-2">
              <JsonViewer title="Trigger input" value={run.input} defaultOpen maxHeight={420} />
              <JsonViewer
                title="Final output"
                value={run.output ?? { message: 'No output — the run did not complete.' }}
                defaultOpen
                maxHeight={420}
              />
            </div>
          )}
        </div>
      </PageBody>
    </>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="surface-card px-3 py-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  )
}

function StepRow({
  step,
  index,
  open,
  onToggle,
  startedAtMs,
  totalMs,
}: {
  step: ExecutionStep
  index: number
  open: boolean
  onToggle: () => void
  startedAtMs: number
  totalMs: number
}) {
  const offset = Math.max(0, new Date(step.startedAt).getTime() - startedAtMs)
  const left = Math.min(96, (offset / totalMs) * 100)
  const width = Math.max(2, Math.min(100 - left, (step.durationMs / totalMs) * 100))

  return (
    <div
      className={cn(
        'surface-card overflow-hidden transition-colors',
        step.status === 'failed' && 'border-state-danger/35',
        step.status === 'running' && 'border-state-running/40',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-raised/50"
      >
        <span className="tabular w-5 shrink-0 text-[11px] text-ink-faint">{index + 1}</span>
        <NodeIcon type={step.nodeType} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink">
            {step.nodeLabel}
          </span>
          <span className="tabular block text-[10px] text-ink-faint">
            {formatTimeWithSeconds(step.startedAt)}
          </span>
        </span>

        <span className="hidden h-1.5 w-40 shrink-0 overflow-hidden rounded-full bg-surface-sunken md:block">
          <span
            className={cn(
              'block h-full rounded-full',
              step.status === 'failed'
                ? 'bg-state-danger'
                : step.status === 'running'
                  ? 'bg-state-running'
                  : 'bg-state-success/70',
            )}
            style={{ marginLeft: `${left}%`, width: `${width}%` }}
          />
        </span>

        {step.branch && (
          <Badge
            size="xs"
            tone={
              step.branch === 'yes' || step.branch === 'pass'
                ? 'success'
                : step.branch === 'no' || step.branch === 'drop'
                  ? 'danger'
                  : 'neutral'
            }
          >
            {step.branch.toUpperCase()}
          </Badge>
        )}

        <span className="tabular w-16 shrink-0 text-right text-[11px] text-ink-muted">
          {formatDuration(step.durationMs)}
        </span>

        {step.status === 'running' ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-state-running" aria-label="Running" />
        ) : step.status === 'failed' ? (
          <CircleX className="size-4 shrink-0 text-state-danger" aria-label="Failed" />
        ) : step.status === 'skipped' ? (
          <Square className="size-3.5 shrink-0 text-ink-faint" aria-label="Skipped" />
        ) : (
          <CircleCheck className="size-4 shrink-0 text-state-success" aria-label="Succeeded" />
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t border-line bg-surface-sunken/40 p-3">
          {step.error && (
            <p className="rounded-md border border-state-danger/25 bg-state-danger/[0.07] p-2.5 text-[11px] leading-5 text-state-danger">
              {step.error.message}
            </p>
          )}
          <JsonViewer title="Input" value={step.input} />
          <JsonViewer title="Output" value={step.output ?? {}} defaultOpen />
        </div>
      )}
    </div>
  )
}
