import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Blocks,
  CircleCheck,
  Clock3,
  History,
  Plus,
  Timer,
  TrendingUp,
  Workflow as WorkflowIcon,
} from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { StatCard } from '@/components/common/StatCard'
import { ExecutionChart } from '@/components/charts/ExecutionChart'
import { WorkflowTable } from '@/features/workflows/WorkflowTable'
import { CreateWorkflowDialog } from '@/features/workflows/CreateWorkflowDialog'
import {
  Button,
  CardSkeleton,
  EmptyState,
  Segmented,
  Skeleton,
  StatusDot,
  TableSkeleton,
} from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import { useDb } from '@/hooks/useDb'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { usePermissions } from '@/app/providers/SettingsProvider'
import {
  computeSeries,
  computeTotals,
  PERIODS,
  selectMetrics,
  daysFor,
  type Period,
} from '@/services/analytics.service'
import { getUser } from '@/data/users'
import {
  formatCompact,
  formatDuration,
  formatHours,
  formatNumber,
  formatPercent,
  formatRelative,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DbState } from '@/services/db'

const selectAll = (s: DbState) => s

export default function OverviewPage() {
  const state = useDb(selectAll)
  const { workspace, currentUser } = useWorkspace()
  const { readOnly } = usePermissions()
  const navigate = useNavigate()
  const [period, setPeriod] = useState<Period>('30d')
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 260)
    return () => clearTimeout(timer)
  }, [])

  const days = daysFor(period)

  const { totals, series } = useMemo(() => {
    const current = selectMetrics(state.metrics, { workspaceId: workspace.id, days })
    const previous = selectMetrics(state.metrics, {
      workspaceId: workspace.id,
      days,
      offsetWindows: 1,
    })
    const workflows = state.workflows.filter((w) => w.workspaceId === workspace.id)
    return {
      totals: computeTotals(current, previous, workflows),
      series: computeSeries(current, days),
    }
  }, [state.metrics, state.workflows, workspace.id, days])

  const recentWorkflows = useMemo(
    () =>
      state.workflows
        .filter((w) => w.workspaceId === workspace.id && w.status !== 'archived')
        .sort(
          (a, b) =>
            new Date(b.stats.lastRunAt ?? b.updatedAt).getTime() -
            new Date(a.stats.lastRunAt ?? a.updatedAt).getTime(),
        )
        .slice(0, 5),
    [state.workflows, workspace.id],
  )

  const recentRuns = useMemo(
    () => state.executions.filter((e) => e.workspaceId === workspace.id).slice(0, 7),
    [state.executions, workspace.id],
  )

  const activity = useMemo(() => state.activity.slice(0, 6), [state.activity])

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <>
      <Topbar crumbs={[{ label: 'Overview' }]} />
      <PageBody>
        <PageHeader
          title={`${greeting}, ${currentUser.name.split(' ')[0]}`}
          description={`${workspace.name} · ${totals.activeWorkflows} active workflows keeping ${formatHours(totals.timeSavedHours)} of manual work off your team.`}
          actions={
            <>
              <Button variant="secondary" onClick={() => navigate('/templates')}>
                Browse templates
              </Button>
              <Button
                variant="primary"
                icon={<Plus className="size-3.5" />}
                onClick={() => setCreateOpen(true)}
                disabled={readOnly}
              >
                New workflow
              </Button>
            </>
          }
        />

        {/* ── KPI row ── */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px]" />
            ))
          ) : (
            <>
              <StatCard
                index={0}
                label="Active workflows"
                value={totals.activeWorkflows}
                hint={`${state.workflows.filter((w) => w.workspaceId === workspace.id && w.status === 'draft').length} drafts in progress`}
                icon={<WorkflowIcon className="size-4" aria-hidden />}
                onClick={() => navigate('/workflows')}
              />
              <StatCard
                index={1}
                label="Executions"
                value={formatNumber(totals.executions)}
                hint={`Last ${days} days`}
                delta={{ value: totals.trend.executions }}
                icon={<TrendingUp className="size-4" aria-hidden />}
                sparkline={series.map((p) => p.total)}
                onClick={() => navigate('/runs')}
              />
              <StatCard
                index={2}
                label="Success rate"
                value={formatPercent(totals.successRate)}
                hint={`${formatNumber(totals.failed)} failed runs`}
                delta={{ value: totals.trend.successRate }}
                icon={<CircleCheck className="size-4" aria-hidden />}
              />
              <StatCard
                index={3}
                label="Time saved"
                value={formatHours(totals.timeSavedHours)}
                hint={`≈ ${Math.round(totals.timeSavedHours / 8)} working days`}
                delta={{ value: totals.trend.timeSaved }}
                icon={<Timer className="size-4" aria-hidden />}
                onClick={() => navigate('/analytics')}
              />
            </>
          )}
        </div>

        {/* ── chart ── */}
        <section className="surface-card mt-4 p-4">
          <SectionHeader
            title="Workflow executions"
            description={`${formatCompact(totals.executions)} runs · avg ${formatDuration(totals.avgDurationMs)}`}
            action={
              <Segmented
                size="sm"
                ariaLabel="Chart period"
                value={period}
                onChange={setPeriod}
                options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
              />
            }
            className="mb-4"
          />
          {loading ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <ExecutionChart data={series} compact={period === '90d'} />
          )}
        </section>

        {/* ── two columns ── */}
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="min-w-0 space-y-3">
            <SectionHeader
              title="Recent workflows"
              action={
                <Link
                  to="/workflows"
                  className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
                >
                  View all <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {loading ? (
              <TableSkeleton rows={5} />
            ) : recentWorkflows.length ? (
              <WorkflowTable workflows={recentWorkflows} compact />
            ) : (
              <EmptyState
                compact
                icon={<Blocks className="size-4" aria-hidden />}
                title="No workflows in this workspace"
                description="Start from a template to get something running in minutes."
                action={
                  <Button size="sm" variant="secondary" onClick={() => navigate('/templates')}>
                    Browse templates
                  </Button>
                }
              />
            )}
          </section>

          <section className="min-w-0 space-y-3">
            <SectionHeader
              title="Recent runs"
              action={
                <Link
                  to="/runs"
                  className="flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
                >
                  All runs <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {loading ? (
              <CardSkeleton />
            ) : recentRuns.length ? (
              <ul className="surface-card divide-y divide-line overflow-hidden">
                {recentRuns.map((run) => (
                  <li key={run.id}>
                    <Link
                      to={`/runs/${run.id}`}
                      className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-raised/60"
                    >
                      <StatusDot status={run.status} pulse className="mt-px" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">
                          {run.workflowName}{' '}
                          <span
                            className={cn(
                              'text-xs',
                              run.status === 'failed'
                                ? 'text-state-danger'
                                : run.status === 'running'
                                  ? 'text-state-running'
                                  : 'text-ink-faint',
                            )}
                          >
                            {run.status === 'success'
                              ? 'completed'
                              : run.status === 'running'
                                ? 'running'
                                : run.status}
                          </span>
                        </span>
                        <span className="block truncate text-[11px] text-ink-faint">
                          {run.error?.title ?? `${run.steps.length} steps`} ·{' '}
                          {formatRelative(run.startedAt)}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-[11px] text-ink-faint">
                        {run.status === 'running' ? '—' : formatDuration(run.durationMs)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                icon={<History className="size-4" aria-hidden />}
                title="No runs yet"
                description="Publish a workflow and its executions will appear here."
              />
            )}

            <SectionHeader title="Team activity" className="pt-1" />
            <ul className="surface-card divide-y divide-line overflow-hidden">
              {activity.map((entry) => {
                const actor = getUser(entry.actorId)
                return (
                  <li key={entry.id} className="flex items-center gap-2.5 px-3.5 py-2.5">
                    <Avatar user={actor} size="xs" />
                    <p className="min-w-0 flex-1 truncate text-[12px] text-ink-muted">
                      <span className="font-medium text-ink">
                        {actor.name.split(' ')[0]}
                      </span>{' '}
                      {entry.verb}{' '}
                      {entry.targetId ? (
                        <Link
                          to={`/workflows/${entry.targetId}`}
                          className="text-ink transition-colors hover:text-accent"
                        >
                          {entry.target}
                        </Link>
                      ) : (
                        <span className="text-ink">{entry.target}</span>
                      )}
                    </p>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] text-ink-faint">
                      <Clock3 className="size-3" aria-hidden />
                      {formatRelative(entry.createdAt)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </PageBody>

      <CreateWorkflowDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
