import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChartColumn,
  CircleCheck,
  CircleX,
  DollarSign,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { StatCard, Sparkline } from '@/components/common/StatCard'
import { ExecutionChart } from '@/components/charts/ExecutionChart'
import { CostDonut } from '@/components/charts/CostDonut'
import { EmptyState, Segmented, Skeleton } from '@/components/ui'
import { useDb } from '@/hooks/useDb'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import {
  computeCostBreakdown,
  computeSeries,
  computeTotals,
  computeWorkflowAnalytics,
  daysFor,
  PERIODS,
  selectMetrics,
  type Period,
} from '@/services/analytics.service'
import {
  formatCurrency,
  formatDuration,
  formatHours,
  formatNumber,
  formatPercent,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DbState } from '@/services/db'

const selectState = (s: DbState) => s

export default function AnalyticsPage() {
  const state = useDb(selectState)
  const { workspace } = useWorkspace()
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 240)
    return () => clearTimeout(timer)
  }, [])

  const days = daysFor(period)

  const { totals, series, cost, breakdown } = useMemo(() => {
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
      cost: computeCostBreakdown(current, workflows),
      breakdown: workflows
        .map((w) => computeWorkflowAnalytics(w, current, state.executions, days))
        .filter((a) => a.runs > 0)
        .sort((a, b) => b.runs - a.runs),
    }
  }, [state.metrics, state.workflows, state.executions, workspace.id, days])

  const maxRuns = Math.max(...breakdown.map((b) => b.runs), 1)

  return (
    <>
      <Topbar crumbs={[{ label: 'Analytics' }]} />
      <PageBody>
        <PageHeader
          title="Analytics"
          description={`Execution health and spend for ${workspace.name}.`}
          actions={
            <Segmented
              ariaLabel="Reporting period"
              value={period}
              onChange={setPeriod}
              options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
            />
          }
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px]" />
            ))
          ) : (
            <>
              <StatCard
                index={0}
                label="Executions"
                value={formatNumber(totals.executions)}
                hint={`Last ${days} days`}
                delta={{ value: totals.trend.executions }}
                icon={<TrendingUp className="size-4" aria-hidden />}
                sparkline={series.map((p) => p.total)}
              />
              <StatCard
                index={1}
                label="Success rate"
                value={formatPercent(totals.successRate)}
                hint={`${formatNumber(totals.successful)} successful runs`}
                delta={{ value: totals.trend.successRate }}
                icon={<CircleCheck className="size-4" aria-hidden />}
              />
              <StatCard
                index={2}
                label="Failure rate"
                value={formatPercent(totals.failureRate)}
                hint={`${formatNumber(totals.failed)} failed runs`}
                delta={{ value: -totals.trend.successRate, positiveIsGood: false }}
                icon={<CircleX className="size-4" aria-hidden />}
              />
              <StatCard
                index={3}
                label="Average duration"
                value={formatDuration(totals.avgDurationMs)}
                hint="Per completed execution"
                icon={<Timer className="size-4" aria-hidden />}
              />
              <StatCard
                index={4}
                label="Time saved"
                value={formatHours(totals.timeSavedHours)}
                hint={`≈ ${Math.round(totals.timeSavedHours / 8)} working days`}
                delta={{ value: totals.trend.timeSaved }}
                icon={<Timer className="size-4" aria-hidden />}
              />
              <StatCard
                index={5}
                label="Estimated cost"
                value={formatCurrency(cost.total)}
                hint="Projected monthly automation spend"
                icon={<DollarSign className="size-4" aria-hidden />}
              />
            </>
          )}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <section className="surface-card p-4">
            <SectionHeader
              title="Executions over time"
              description={`${formatNumber(totals.executions)} runs across ${days} days`}
              className="mb-4"
            />
            {loading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <ExecutionChart data={series} height={280} compact={period === '90d'} />
            )}
          </section>

          <section className="surface-card p-4">
            <SectionHeader
              title="Cost estimate"
              description="Mock billing — no real charges"
              className="mb-4"
            />
            {loading ? <Skeleton className="h-[180px]" /> : <CostDonut cost={cost} />}
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-5 text-ink-faint">
              AI inference dominates spend on this workspace. Switching the highest-volume
              analyze nodes to the mini model would cut roughly{' '}
              {formatCurrency(cost.ai * 0.42)} per month.
            </p>
          </section>
        </div>

        <section className="mt-4">
          <SectionHeader
            title="Workflow breakdown"
            description="Sorted by execution volume in the selected period."
            className="mb-3"
          />
          {loading ? (
            <Skeleton className="h-56" />
          ) : breakdown.length === 0 ? (
            <EmptyState
              icon={<ChartColumn className="size-5" aria-hidden />}
              title="Nothing to report yet"
              description="Once workflows start running, their performance shows up here."
            />
          ) : (
            <div className="surface-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-faint">
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Workflow
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Volume
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Runs
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Success
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Avg
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Saved
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Cost
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Top failure
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {breakdown.map((row) => (
                      <tr
                        key={row.workflow.id}
                        className="transition-colors hover:bg-surface-raised/60"
                      >
                        <td className="max-w-[16rem] px-4 py-2.5">
                          <Link
                            to={`/workflows/${row.workflow.id}`}
                            className="block truncate text-[13px] font-medium text-ink transition-colors hover:text-accent"
                          >
                            {row.workflow.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-sunken">
                              <div
                                className="h-full rounded-full bg-accent/70"
                                style={{ width: `${(row.runs / maxRuns) * 100}%` }}
                              />
                            </div>
                            <Sparkline
                              values={row.sparkline}
                              className="h-5 w-16"
                              tone={row.successRate >= 97 ? 'accent' : 'danger'}
                            />
                          </div>
                        </td>
                        <td className="tabular px-3 py-2.5 text-right text-[13px] text-ink-muted">
                          {formatNumber(row.runs)}
                        </td>
                        <td
                          className={cn(
                            'tabular px-3 py-2.5 text-right text-[13px]',
                            row.successRate >= 97
                              ? 'text-ink-muted'
                              : row.successRate >= 92
                                ? 'text-state-warning'
                                : 'text-state-danger',
                          )}
                        >
                          {formatPercent(row.successRate)}
                        </td>
                        <td className="tabular px-3 py-2.5 text-right text-[13px] text-ink-muted">
                          {formatDuration(row.avgDurationMs)}
                        </td>
                        <td className="tabular px-3 py-2.5 text-right text-[13px] text-ink-muted">
                          {formatHours(row.timeSavedHours)}
                        </td>
                        <td className="tabular px-3 py-2.5 text-right text-[13px] text-ink-muted">
                          {formatCurrency(row.cost)}
                        </td>
                        <td className="max-w-[14rem] px-4 py-2.5">
                          <span className="block truncate text-[12px] text-ink-faint">
                            {row.topFailure
                              ? `${row.topFailure.title} (${row.topFailure.count})`
                              : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </PageBody>
    </>
  )
}
