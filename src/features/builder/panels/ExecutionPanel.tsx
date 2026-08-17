import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Play,
  RotateCcw,
  Square,
} from 'lucide-react'
import { Badge, Button, Tabs } from '@/components/ui'
import { JsonViewer } from './JsonViewer'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { formatDuration, formatTimeWithSeconds } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Execution, LogEntry, RuntimeState } from '@/types/execution'

interface Props {
  runtime: RuntimeState
  execution: Execution | null
  onFocusNode: (nodeId: string) => void
  onRerun: () => void
  onCancel: () => void
  onOpenTest: () => void
}

const LOG_TONE: Record<LogEntry['level'], string> = {
  info: 'text-ink-muted',
  success: 'text-state-success',
  warn: 'text-state-warning',
  error: 'text-state-danger',
}

export function ExecutionPanel({
  runtime,
  execution,
  onFocusNode,
  onRerun,
  onCancel,
  onOpenTest,
}: Props) {
  const [tab, setTab] = useState<'steps' | 'log'>('steps')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tab === 'log') logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [runtime.logs.length, tab])

  const running = runtime.status === 'running'
  const finished = runtime.status === 'success' || runtime.status === 'failed'

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line px-4 pb-3 pt-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {running ? (
              <LoaderCircle
                className="size-4 shrink-0 animate-spin text-state-running"
                aria-hidden
              />
            ) : runtime.status === 'success' ? (
              <CircleCheck className="size-4 shrink-0 text-state-success" aria-hidden />
            ) : runtime.status === 'failed' ? (
              <CircleX className="size-4 shrink-0 text-state-danger" aria-hidden />
            ) : (
              <Play className="size-4 shrink-0 text-ink-faint" aria-hidden />
            )}
            <div className="min-w-0">
              <h2 className="truncate text-[13px] font-semibold text-ink">
                {running
                  ? 'Execution running'
                  : runtime.status === 'success'
                    ? 'Execution completed'
                    : runtime.status === 'failed'
                      ? 'Execution failed'
                      : runtime.status === 'cancelled'
                        ? 'Execution cancelled'
                        : 'No execution yet'}
              </h2>
              <p className="truncate text-[11px] text-ink-faint">
                {execution
                  ? `${execution.steps.length} steps · ${formatDuration(execution.durationMs)}`
                  : running
                    ? `${runtime.steps.length} steps so far`
                    : 'Run a test to see it execute live'}
              </p>
            </div>
          </div>
          {running ? (
            <Button size="sm" variant="ghost" icon={<Square className="size-3" />} onClick={onCancel}>
              Stop
            </Button>
          ) : finished ? (
            <Button
              size="sm"
              variant="secondary"
              icon={<RotateCcw className="size-3.5" />}
              onClick={onRerun}
            >
              Re-run
            </Button>
          ) : (
            <Button size="sm" variant="primary" icon={<Play className="size-3" />} onClick={onOpenTest}>
              Test
            </Button>
          )}
        </div>

        {runtime.error && (
          <div className="mt-3 rounded-md border border-state-danger/25 bg-state-danger/[0.07] p-2.5">
            <p className="text-[11px] font-medium text-state-danger">
              {runtime.error.title}
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-ink-muted">
              {runtime.error.message}
            </p>
            <div className="mt-2 flex gap-2">
              {runtime.error.nodeId && (
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => onFocusNode(runtime.error!.nodeId!)}
                >
                  Open node
                </Button>
              )}
              <Button size="xs" variant="ghost" onClick={onRerun}>
                Retry
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3">
          <Tabs
            variant="pill"
            layoutId="execution-tabs"
            value={tab}
            onChange={(value) => setTab(value as 'steps' | 'log')}
            ariaLabel="Execution details"
            items={[
              { id: 'steps', label: 'Steps', count: runtime.steps.length },
              { id: 'log', label: 'Log', count: runtime.logs.length },
            ]}
          />
        </div>
      </header>

      {tab === 'steps' ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {runtime.steps.length === 0 ? (
            <p className="px-2 py-8 text-center text-[11px] text-ink-faint">
              Steps appear here as the run progresses.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {runtime.steps.map((step, index) => (
                <li key={step.id}>
                  <div
                    className={cn(
                      'rounded-lg border p-2.5 transition-colors',
                      step.status === 'running'
                        ? 'border-state-running/40 bg-state-running/[0.06]'
                        : step.status === 'failed'
                          ? 'border-state-danger/30 bg-state-danger/[0.05]'
                          : step.status === 'skipped'
                            ? 'border-line bg-surface-sunken opacity-70'
                            : 'border-line bg-surface-sunken',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onFocusNode(step.nodeId)}
                      className="flex w-full items-center gap-2 text-left"
                    >
                      <span className="tabular w-4 shrink-0 text-[10px] text-ink-faint">
                        {index + 1}
                      </span>
                      <NodeIcon type={step.nodeType} size="xs" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-ink">
                          {step.nodeLabel}
                        </span>
                        <span className="tabular block text-[10px] text-ink-faint">
                          {formatTimeWithSeconds(step.startedAt)}
                          {step.finishedAt && ` · ${formatDuration(step.durationMs)}`}
                        </span>
                      </span>
                      {step.branch && (
                        <Badge
                          tone={
                            step.branch === 'yes' || step.branch === 'pass'
                              ? 'success'
                              : step.branch === 'no' || step.branch === 'drop'
                                ? 'danger'
                                : 'neutral'
                          }
                          size="xs"
                        >
                          {step.branch.toUpperCase()}
                        </Badge>
                      )}
                      <StepGlyph status={step.status} />
                    </button>

                    {step.output && Object.keys(step.output).length > 0 && (
                      <div className="mt-2">
                        <JsonViewer title="Output" value={step.output} maxHeight={180} />
                      </div>
                    )}
                    {step.error && (
                      <p className="mt-2 text-[11px] leading-5 text-state-danger">
                        {step.error.message}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {execution && (
            <div className="mt-3 border-t border-line pt-3">
              <Link
                to={`/runs/${execution.id}`}
                className="flex items-center justify-between rounded-md border border-line bg-surface-sunken px-3 py-2 text-[12px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                <span className="font-mono">{execution.id}</span>
                <span className="flex items-center gap-1">
                  Full run details <ArrowRight className="size-3" aria-hidden />
                </span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div ref={logRef} className="min-h-0 flex-1 overflow-y-auto bg-surface-sunken/40">
          {runtime.logs.length === 0 ? (
            <p className="px-4 py-8 text-center text-[11px] text-ink-faint">
              The execution log is empty.
            </p>
          ) : (
            <ul className="divide-y divide-line/60 font-mono text-[11px]">
              {runtime.logs.map((entry) => (
                <li key={entry.id} className="flex gap-2 px-3 py-1.5">
                  <span className="tabular shrink-0 text-ink-faint">
                    {formatTimeWithSeconds(entry.ts)}
                  </span>
                  {entry.nodeLabel && (
                    <span className="max-w-[7rem] shrink-0 truncate text-ink">
                      {entry.nodeLabel}
                    </span>
                  )}
                  <span className={cn('min-w-0 flex-1 break-words', LOG_TONE[entry.level])}>
                    {entry.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function StepGlyph({ status }: { status: string }) {
  if (status === 'running') {
    return (
      <LoaderCircle className="size-3.5 shrink-0 animate-spin text-state-running" aria-label="Running" />
    )
  }
  if (status === 'failed') {
    return <CircleX className="size-3.5 shrink-0 text-state-danger" aria-label="Failed" />
  }
  if (status === 'skipped') {
    return <Square className="size-3 shrink-0 text-ink-faint" aria-label="Skipped" />
  }
  return <CircleCheck className="size-3.5 shrink-0 text-state-success" aria-label="Succeeded" />
}
