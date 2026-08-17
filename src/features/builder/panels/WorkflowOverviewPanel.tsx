import { Link } from 'react-router-dom'
import { ArrowRight, Blocks, GitBranch, StickyNote, Zap } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, StatusBadge } from '@/components/ui/Badge'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { Sparkline } from '@/components/common/StatCard'
import { getUser } from '@/data/users'
import { formatDuration, formatNumber, formatPercent, formatRelative } from '@/lib/format'
import type { Workflow } from '@/types/workflow'
import type { AppNode } from '../graph'

interface Props {
  workflow: Workflow
  nodes: AppNode[]
  edgeCount: number
  noteCount: number
  sparkline: number[]
  onSelectNode: (id: string) => void
}

export function WorkflowOverviewPanel({
  workflow,
  nodes,
  edgeCount,
  noteCount,
  sparkline,
  onSelectNode,
}: Props) {
  const owner = getUser(workflow.ownerId)
  const executable = nodes.filter((n) => !(n.type ?? '').startsWith('canvas.'))
  const triggers = executable.filter((n) => (n.type ?? '').startsWith('trigger.'))

  return (
    <div className="space-y-5 p-4">
      <section>
        <h2 className="text-[13px] font-semibold text-ink">{workflow.name}</h2>
        <p className="mt-1 text-[12px] leading-5 text-ink-muted">
          {workflow.description || 'No description yet — add one from the workflow menu.'}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={workflow.status} size="xs" />
          <Badge tone="muted" size="xs">
            v{workflow.version}
          </Badge>
          <Badge tone="muted" size="xs">
            {workflow.environment}
          </Badge>
          {workflow.tags.map((tag) => (
            <Badge key={tag} tone="neutral" size="xs">
              {tag}
            </Badge>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Metric icon={<Blocks className="size-3" />} label="Nodes" value={executable.length} />
        <Metric icon={<GitBranch className="size-3" />} label="Links" value={edgeCount} />
        <Metric icon={<StickyNote className="size-3" />} label="Notes" value={noteCount} />
      </section>

      <section className="rounded-lg border border-line bg-surface-sunken p-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Run health
          </span>
          <Link
            to={`/runs?workflow=${workflow.id}`}
            className="flex items-center gap-1 text-[11px] text-ink-muted transition-colors hover:text-ink"
          >
            All runs <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
        <dl className="mt-2.5 grid grid-cols-3 gap-2">
          <div>
            <dt className="text-[10px] text-ink-faint">Runs</dt>
            <dd className="tabular text-[13px] font-medium text-ink">
              {formatNumber(workflow.stats.runs)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-ink-faint">Success</dt>
            <dd className="tabular text-[13px] font-medium text-ink">
              {formatPercent(workflow.stats.successRate)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-ink-faint">Avg</dt>
            <dd className="tabular text-[13px] font-medium text-ink">
              {formatDuration(workflow.stats.avgDurationMs)}
            </dd>
          </div>
        </dl>
        {sparkline.length > 1 && <Sparkline values={sparkline} className="mt-2" />}
        <p className="mt-1.5 text-[10px] text-ink-faint">
          Last run{' '}
          {workflow.stats.lastRunAt ? formatRelative(workflow.stats.lastRunAt) : 'never'}
        </p>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Trigger{triggers.length > 1 ? 's' : ''}
        </h3>
        {triggers.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-3 py-3 text-[11px] text-ink-faint">
            No trigger yet. Add one so the workflow knows when to run.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {triggers.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => onSelectNode(node.id)}
                  className="flex w-full items-center gap-2.5 rounded-md border border-line bg-surface-sunken p-2 text-left transition-colors hover:border-line-strong"
                >
                  <NodeIcon type={node.type ?? ''} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] text-ink">
                      {node.data.label}
                    </span>
                  </span>
                  <Zap className="size-3 shrink-0 text-cat-trigger" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Steps
        </h3>
        <ul className="space-y-1">
          {executable.map((node, index) => (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onSelectNode(node.id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-raised"
              >
                <span className="tabular w-4 shrink-0 text-[10px] text-ink-faint">
                  {index + 1}
                </span>
                <NodeIcon type={node.type ?? ''} size="xs" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-ink-muted">
                  {node.data.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex items-center gap-2.5 border-t border-line pt-3">
        <Avatar user={owner} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-ink">{owner.name}</p>
          <p className="text-[10px] text-ink-faint">
            Owner · updated {formatRelative(workflow.updatedAt)}
          </p>
        </div>
      </section>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-md border border-line bg-surface-sunken px-2 py-2">
      <span className="flex items-center gap-1 text-[10px] text-ink-faint">
        {icon}
        {label}
      </span>
      <span className="tabular mt-0.5 block text-[15px] font-semibold text-ink">
        {value}
      </span>
    </div>
  )
}
