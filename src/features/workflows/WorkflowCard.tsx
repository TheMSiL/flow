import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Blocks, Clock, Zap } from 'lucide-react'
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

export function WorkflowCard({
  workflow,
  index = 0,
}: {
  workflow: Workflow
  index?: number
}) {
  const owner = getUser(workflow.ownerId)
  const nodes = workflow.nodes.filter((n) => !isCanvasPrimitive(n.type))
  const trigger = nodes.find((n) => n.type.startsWith('trigger.'))
  const preview = nodes.slice(0, 5)

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      <Link
        to={`/workflows/${workflow.id}`}
        className="surface-card flex h-full flex-col p-4 transition-all duration-200 hover:border-line-strong hover:shadow-md"
      >
        <div className="flex items-start gap-3">
          <NodeIcon type={trigger?.type ?? 'trigger.manual'} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-semibold tracking-tight text-ink">
              {workflow.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-muted">
              {workflow.description || 'No description yet.'}
            </p>
          </div>
        </div>

        {/* node preview strip */}
        <div className="mt-3.5 flex items-center gap-1">
          {preview.map((node, i) => (
            <div key={node.id} className="flex items-center gap-1">
              {i > 0 && <span className="h-px w-2 bg-line-strong" aria-hidden />}
              <Tooltip content={node.data.label} delay={200}>
                <span>
                  <NodeIcon type={node.type} size="xs" />
                </span>
              </Tooltip>
            </div>
          ))}
          {nodes.length > preview.length && (
            <span className="ml-1 text-[10px] text-ink-faint">
              +{nodes.length - preview.length}
            </span>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">Runs</dt>
            <dd className="tabular mt-0.5 text-[13px] font-medium text-ink">
              {formatNumber(workflow.stats.runs)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">
              Success
            </dt>
            <dd
              className={cn(
                'tabular mt-0.5 text-[13px] font-medium',
                workflow.stats.successRate >= 95
                  ? 'text-ink'
                  : workflow.stats.successRate >= 85
                    ? 'text-state-warning'
                    : 'text-state-danger',
              )}
            >
              {formatPercent(workflow.stats.successRate)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">
              Last run
            </dt>
            <dd className="mt-0.5 truncate text-[13px] font-medium text-ink">
              {workflow.stats.lastRunAt
                ? formatRelative(workflow.stats.lastRunAt)
                : '—'}
            </dd>
          </div>
        </dl>

        <div className="mt-3.5 flex items-center gap-2 border-t border-line pt-3">
          <StatusBadge status={workflow.status} size="xs" />
          <span className="flex items-center gap-1 text-[10px] text-ink-faint">
            <Blocks className="size-3" aria-hidden />
            {nodes.length}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-ink-faint">
            <Zap className="size-3" aria-hidden />v{workflow.version}
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <Tooltip content={`${owner.name} · updated ${formatRelative(workflow.updatedAt)}`}>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3 text-ink-faint" aria-hidden />
                <Avatar user={owner} size="xs" />
              </span>
            </Tooltip>
          </span>
        </div>
      </Link>

      <div className="absolute right-2.5 top-2.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <WorkflowActionsMenu workflow={workflow} />
      </div>
    </motion.article>
  )
}
