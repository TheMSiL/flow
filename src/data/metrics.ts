import { createRng, floatBetween } from '@/lib/random'
import { getNodeDefinition, isCanvasPrimitive } from '@/nodes/catalog'
import { NOW, SEED } from './base'
import type { Workflow } from '@/types/workflow'

/**
 * Pre-aggregated daily rollups.
 *
 * A production automation platform does not scan every execution row to
 * render a dashboard — it reads a rollup table. FLOW mirrors that: charts
 * and totals come from here, while `executions` holds the detailed run log
 * for the most recent window.
 */
export interface DailyMetric {
  date: string
  workflowId: string
  workspaceId: string
  successful: number
  failed: number
  running: number
  avgDurationMs: number
  /** Minutes of manual work displaced. */
  minutesSaved: number
  cost: number
}

export const METRIC_DAYS = 90

/** Target average executions per day across the whole account. */
const DAILY_BASE = 206

function dayKey(offsetDays: number) {
  const d = new Date(NOW - offsetDays * 86_400_000)
  d.setHours(12, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export function buildDailyMetrics(workflows: Workflow[]): DailyMetric[] {
  const rng = createRng(SEED + 4242)
  const active = workflows.filter(
    (w) => w.status === 'published' || w.status === 'paused',
  )
  if (!active.length) return []

  // Weight busy production workflows higher so the mix looks organic.
  const weights = active.map((w) => {
    const base = w.environment === 'production' ? 1 : 0.35
    const paused = w.status === 'paused' ? 0.2 : 1
    return base * paused * floatBetween(rng, 0.4, 2.2)
  })
  const weightTotal = weights.reduce((a, b) => a + b, 0)

  // Per-workflow reliability, stable across the whole window.
  const reliability = active.map(() => floatBetween(rng, 0.955, 0.998, 4))

  // Average node cost + step count per workflow, from its actual graph.
  const profile = active.map((w) => {
    const nodes = w.nodes.filter((n) => !isCanvasPrimitive(n.type))
    const cost = nodes.reduce(
      (acc, n) => acc + (getNodeDefinition(n.type).unitCost ?? 0),
      0,
    )
    return { steps: Math.max(2, nodes.length - 1), cost }
  })

  const metrics: DailyMetric[] = []

  for (let offset = METRIC_DAYS - 1; offset >= 0; offset--) {
    const date = dayKey(offset)
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay()
    // Weekends are quieter; volume trends gently upward over the window.
    const weekendFactor = weekday === 0 || weekday === 6 ? 0.42 : 1
    const growth = 0.82 + ((METRIC_DAYS - offset) / METRIC_DAYS) * 0.36
    const noise = floatBetween(rng, 0.88, 1.14, 3)
    const dayTotal = Math.round(DAILY_BASE * weekendFactor * growth * noise)

    active.forEach((workflow, index) => {
      const share = weights[index] / weightTotal
      const total = Math.max(0, Math.round(dayTotal * share))
      if (total === 0) return

      const failed = Math.round(total * (1 - reliability[index]) * floatBetween(rng, 0.4, 2.6))
      const running = offset === 0 && rng() > 0.75 ? 1 : 0
      const successful = Math.max(0, total - failed - running)
      const avgDurationMs = Math.round(
        profile[index].steps * floatBetween(rng, 240, 720) + floatBetween(rng, 120, 400),
      )

      metrics.push({
        date,
        workflowId: workflow.id,
        workspaceId: workflow.workspaceId,
        successful,
        failed,
        running,
        avgDurationMs,
        minutesSaved: Number((successful * profile[index].steps * 1.4).toFixed(1)),
        cost: Number(
          (total * profile[index].cost + total * 0.0011).toFixed(4),
        ),
      })
    })
  }

  return metrics
}
