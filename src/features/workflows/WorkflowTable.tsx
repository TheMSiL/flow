import { Link } from 'react-router-dom'
import { StatusBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/Tooltip'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { WorkflowActionsMenu } from './WorkflowActionsMenu'
import { isCanvasPrimitive } from '@/nodes/catalog'
import { getUser } from '@/data/users'
import { formatNumber, formatPercent, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Workflow } from '@/types/workflow'

interface Props {
  workflows: Workflow[]
  /** Hides secondary columns for the compact Overview variant. */
  compact?: boolean
}

export function WorkflowTable({ workflows, compact }: Props) {
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-faint">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Workflow
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Runs
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Success
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Last run
              </th>
              {!compact && (
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Owner
                </th>
              )}
              <th scope="col" className="w-10 px-2 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {workflows.map((workflow) => {
              const owner = getUser(workflow.ownerId)
              const nodes = workflow.nodes.filter((n) => !isCanvasPrimitive(n.type))
              const trigger = nodes.find((n) => n.type.startsWith('trigger.'))
              return (
                <tr
                  key={workflow.id}
                  className="group transition-colors hover:bg-surface-raised/60"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/workflows/${workflow.id}`}
                      className="flex items-center gap-2.5"
                    >
                      <NodeIcon type={trigger?.type ?? 'trigger.manual'} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink">
                          {workflow.name}
                        </span>
                        {!compact && (
                          <span className="block truncate text-[11px] text-ink-faint">
                            {nodes.length} nodes · v{workflow.version}
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={workflow.status} size="xs" />
                  </td>
                  <td className="tabular px-3 py-2.5 text-right text-[13px] text-ink-muted">
                    {formatNumber(workflow.stats.runs)}
                  </td>
                  <td
                    className={cn(
                      'tabular px-3 py-2.5 text-right text-[13px]',
                      workflow.stats.successRate >= 95
                        ? 'text-ink-muted'
                        : workflow.stats.successRate >= 85
                          ? 'text-state-warning'
                          : 'text-state-danger',
                    )}
                  >
                    {formatPercent(workflow.stats.successRate)}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-ink-muted">
                    {workflow.stats.lastRunAt
                      ? formatRelative(workflow.stats.lastRunAt)
                      : '—'}
                  </td>
                  {!compact && (
                    <td className="px-3 py-2.5">
                      <Tooltip content={owner.name}>
                        <span className="flex items-center gap-2">
                          <Avatar user={owner} size="xs" />
                          <span className="hidden truncate text-[13px] text-ink-muted lg:block">
                            {owner.name}
                          </span>
                        </span>
                      </Tooltip>
                    </td>
                  )}
                  <td className="px-2 py-2.5">
                    <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <WorkflowActionsMenu workflow={workflow} />
                    </div>
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
