import { Link } from 'react-router-dom'
import { ChevronRight, Clock, Webhook } from 'lucide-react'
import { StatusBadge, StatusDot } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { getUser } from '@/data/users'
import { formatDuration, formatRelative, formatTimeWithSeconds } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Execution } from '@/types/execution'

const TRIGGER_LABEL: Record<string, string> = {
  webhook: 'Webhook',
  schedule: 'Schedule',
  manual: 'Manual',
  test: 'Test run',
  retry: 'Retry',
}

export function RunTable({
  runs,
  showWorkflow = true,
}: {
  runs: Execution[]
  showWorkflow?: boolean
}) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-faint">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Run
              </th>
              {showWorkflow && (
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Workflow
                </th>
              )}
              <th scope="col" className="px-3 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Started
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Duration
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Triggered by
              </th>
              <th scope="col" className="w-8 px-2 py-2.5">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {runs.map((run) => {
              const user =
                run.triggeredBy === 'system' ? null : getUser(run.triggeredBy)
              return (
                <tr
                  key={run.id}
                  className="group cursor-pointer transition-colors hover:bg-surface-raised/60"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/runs/${run.id}`}
                      className="flex items-center gap-2 font-mono text-xs text-ink-muted transition-colors group-hover:text-ink"
                    >
                      <StatusDot status={run.status} pulse />
                      {run.id}
                    </Link>
                  </td>
                  {showWorkflow && (
                    <td className="max-w-[14rem] px-3 py-2.5">
                      <Link
                        to={`/workflows/${run.workflowId}`}
                        className="block truncate text-[13px] text-ink transition-colors hover:text-accent"
                      >
                        {run.workflowName}
                      </Link>
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <StatusBadge status={run.status} kind="run" size="xs" showDot={false} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/runs/${run.id}`} className="block">
                      <span className="block text-[13px] text-ink-muted">
                        {formatRelative(run.startedAt)}
                      </span>
                      <span className="tabular block text-[10px] text-ink-faint">
                        {formatTimeWithSeconds(run.startedAt)}
                      </span>
                    </Link>
                  </td>
                  <td
                    className={cn(
                      'tabular px-3 py-2.5 text-right text-[13px]',
                      run.status === 'running' ? 'text-state-running' : 'text-ink-muted',
                    )}
                  >
                    {run.status === 'running' ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3 animate-pulse" aria-hidden />
                        live
                      </span>
                    ) : (
                      formatDuration(run.durationMs)
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
                      {user ? (
                        <>
                          <Avatar user={user} size="xs" />
                          <span className="hidden truncate lg:block">{user.name}</span>
                        </>
                      ) : (
                        <>
                          <Webhook className="size-3.5 text-ink-faint" aria-hidden />
                          <span className="hidden lg:block">
                            {TRIGGER_LABEL[run.triggerSource] ?? 'System'}
                          </span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-2.5">
                    <Link
                      to={`/runs/${run.id}`}
                      aria-label={`Open run ${run.id}`}
                      className="flex size-7 items-center justify-center rounded-md text-ink-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-surface-raised hover:text-ink focus-visible:opacity-100"
                    >
                      <ChevronRight className="size-4" aria-hidden />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
