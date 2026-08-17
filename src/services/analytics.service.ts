import { db, request } from './db'
import type { DailyMetric } from '@/data/metrics'
import type { Execution } from '@/types/execution'
import type { Workflow } from '@/types/workflow'

export type Period = '7d' | '30d' | '90d'

export const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: '7d', label: '7D', days: 7 },
  { id: '30d', label: '30D', days: 30 },
  { id: '90d', label: '90D', days: 90 },
]

export interface SeriesPoint {
  date: string
  label: string
  successful: number
  failed: number
  running: number
  total: number
  avgDurationMs: number
}

export interface Totals {
  executions: number
  successful: number
  failed: number
  running: number
  successRate: number
  failureRate: number
  avgDurationMs: number
  timeSavedHours: number
  cost: number
  activeWorkflows: number
  /** Percentage change against the immediately preceding window. */
  trend: { executions: number; successRate: number; timeSaved: number }
}

export interface CostBreakdown {
  total: number
  ai: number
  integrations: number
  executions: number
}

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */

function daysFor(period: Period) {
  return PERIODS.find((p) => p.id === period)?.days ?? 30
}

function cutoff(days: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() - (days - 1) * 86_400_000).toISOString().slice(0, 10)
}

export function selectMetrics(
  metrics: DailyMetric[],
  opts: { workspaceId?: string; workflowId?: string; days: number; offsetWindows?: number },
) {
  const { workspaceId, workflowId, days, offsetWindows = 0 } = opts
  const end = cutoff(days * offsetWindows)
  const start = cutoff(days * (offsetWindows + 1))
  return metrics.filter(
    (m) =>
      m.date >= start &&
      (offsetWindows === 0 ? true : m.date < end) &&
      (!workspaceId || m.workspaceId === workspaceId) &&
      (!workflowId || m.workflowId === workflowId),
  )
}

/* ------------------------------------------------------------------ *
 * Aggregation
 * ------------------------------------------------------------------ */

function rawTotals(metrics: DailyMetric[]) {
  const successful = metrics.reduce((a, m) => a + m.successful, 0)
  const failed = metrics.reduce((a, m) => a + m.failed, 0)
  const running = metrics.reduce((a, m) => a + m.running, 0)
  const minutesSaved = metrics.reduce((a, m) => a + m.minutesSaved, 0)
  const cost = metrics.reduce((a, m) => a + m.cost, 0)
  const finished = successful + failed
  return {
    successful,
    failed,
    running,
    finished,
    executions: successful + failed + running,
    successRate: finished ? (successful / finished) * 100 : 100,
    minutesSaved,
    cost,
    avgDurationMs: metrics.length
      ? Math.round(metrics.reduce((a, m) => a + m.avgDurationMs, 0) / metrics.length)
      : 0,
  }
}

function pctChange(current: number, previous: number) {
  if (!previous) return 0
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export function computeTotals(
  metrics: DailyMetric[],
  previous: DailyMetric[],
  workflows: Workflow[],
): Totals {
  const now = rawTotals(metrics)
  const before = rawTotals(previous)

  return {
    executions: now.executions,
    successful: now.successful,
    failed: now.failed,
    running: now.running,
    successRate: Number(now.successRate.toFixed(1)),
    failureRate: Number((100 - now.successRate).toFixed(1)),
    avgDurationMs: now.avgDurationMs,
    timeSavedHours: Number((now.minutesSaved / 60).toFixed(1)),
    cost: Number(now.cost.toFixed(2)),
    activeWorkflows: workflows.filter(
      (w) => w.status === 'published' || w.status === 'paused',
    ).length,
    trend: {
      executions: pctChange(now.executions, before.executions),
      successRate: Number((now.successRate - before.successRate).toFixed(1)),
      timeSaved: pctChange(now.minutesSaved, before.minutesSaved),
    },
  }
}

export function computeSeries(metrics: DailyMetric[], days: number): SeriesPoint[] {
  const buckets = new Map<string, SeriesPoint>()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86_400_000)
    const key = day.toISOString().slice(0, 10)
    buckets.set(key, {
      date: key,
      label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      successful: 0,
      failed: 0,
      running: 0,
      total: 0,
      avgDurationMs: 0,
    })
  }

  const durations = new Map<string, number[]>()
  for (const metric of metrics) {
    const point = buckets.get(metric.date)
    if (!point) continue
    point.successful += metric.successful
    point.failed += metric.failed
    point.running += metric.running
    point.total += metric.successful + metric.failed + metric.running
    durations.set(metric.date, [...(durations.get(metric.date) ?? []), metric.avgDurationMs])
  }

  for (const [date, list] of durations) {
    const point = buckets.get(date)
    if (point && list.length) {
      point.avgDurationMs = Math.round(list.reduce((a, b) => a + b, 0) / list.length)
    }
  }

  return [...buckets.values()]
}

/**
 * Splits spend into the three lines that appear on a real invoice.
 * AI inference dominates; integrations and the per-execution platform fee
 * are derived from the same rollup totals.
 */
export function computeCostBreakdown(
  metrics: DailyMetric[],
  workflows: Workflow[],
): CostBreakdown {
  const aiWorkflowIds = new Set(
    workflows
      .filter((w) => w.nodes.some((n) => n.type.startsWith('ai.') || n.type === 'integration.openai'))
      .map((w) => w.id),
  )

  let ai = 0
  let integrations = 0
  let executions = 0

  for (const metric of metrics) {
    const runs = metric.successful + metric.failed + metric.running
    const platform = runs * 0.0011
    executions += platform
    const nodeCost = Math.max(0, metric.cost - platform)
    if (aiWorkflowIds.has(metric.workflowId)) {
      ai += nodeCost * 0.78
      integrations += nodeCost * 0.22
    } else {
      integrations += nodeCost
    }
  }

  return {
    total: Number((ai + integrations + executions).toFixed(2)),
    ai: Number(ai.toFixed(2)),
    integrations: Number(integrations.toFixed(2)),
    executions: Number(executions.toFixed(2)),
  }
}

export interface WorkflowAnalytics {
  workflow: Workflow
  runs: number
  successRate: number
  avgDurationMs: number
  timeSavedHours: number
  cost: number
  topFailure: { title: string; count: number } | null
  sparkline: number[]
}

export function computeWorkflowAnalytics(
  workflow: Workflow,
  metrics: DailyMetric[],
  executions: Execution[],
  days: number,
): WorkflowAnalytics {
  const own = metrics.filter((m) => m.workflowId === workflow.id)
  const totals = rawTotals(own)

  const failureCounts = new Map<string, number>()
  for (const run of executions) {
    if (run.workflowId === workflow.id && run.error) {
      failureCounts.set(run.error.title, (failureCounts.get(run.error.title) ?? 0) + 1)
    }
  }
  const topFailure = [...failureCounts.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    workflow,
    runs: totals.executions,
    successRate: Number(totals.successRate.toFixed(1)),
    avgDurationMs: totals.avgDurationMs,
    timeSavedHours: Number((totals.minutesSaved / 60).toFixed(1)),
    cost: Number(totals.cost.toFixed(2)),
    topFailure: topFailure ? { title: topFailure[0], count: topFailure[1] } : null,
    sparkline: computeSeries(own, Math.min(days, 30)).map((p) => p.total),
  }
}

/* ------------------------------------------------------------------ *
 * Service
 * ------------------------------------------------------------------ */

export const analyticsService = {
  getOverview(workspaceId?: string, period: Period = '30d') {
    return request(() => {
      const state = db.get()
      const days = daysFor(period)
      const current = selectMetrics(state.metrics, { workspaceId, days })
      const previous = selectMetrics(state.metrics, { workspaceId, days, offsetWindows: 1 })
      const workflows = state.workflows.filter(
        (w) => !workspaceId || w.workspaceId === workspaceId,
      )
      return {
        totals: computeTotals(current, previous, workflows),
        series: computeSeries(current, days),
        cost: computeCostBreakdown(current, workflows),
      }
    })
  },

  getWorkflowBreakdown(workspaceId?: string, period: Period = '30d') {
    return request(() => {
      const state = db.get()
      const days = daysFor(period)
      const metrics = selectMetrics(state.metrics, { workspaceId, days })
      const workflows = state.workflows.filter(
        (w) => !workspaceId || w.workspaceId === workspaceId,
      )
      return workflows
        .map((w) => computeWorkflowAnalytics(w, metrics, state.executions, days))
        .filter((a) => a.runs > 0)
        .sort((a, b) => b.runs - a.runs)
    })
  },
}

export { daysFor }
