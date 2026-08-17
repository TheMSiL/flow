import { getNodeDefinition, isCanvasPrimitive, isTrigger } from '@/nodes/catalog'
import { createRng, intBetween, pick, pickWeighted, type Rng } from '@/lib/random'
import { iso, NOW, SEED } from './base'
import type {
  Execution,
  ExecutionError,
  ExecutionStatus,
  ExecutionStep,
  LogEntry,
  TriggerSource,
} from '@/types/execution'
import type { Workflow } from '@/types/workflow'
import type { DailyMetric } from './metrics'

const FAILURE_TEMPLATES: Omit<ExecutionError, 'nodeId'>[] = [
  {
    code: 'INVALID_RECIPIENT',
    title: 'Invalid recipient address',
    message: 'The recipient "{{lead.email}}" resolved to an empty string.',
    hint: 'Add a fallback address or guard the step with a filter.',
  },
  {
    code: 'UPSTREAM_502',
    title: 'Upstream service unavailable',
    message: 'The provider returned 502 Bad Gateway after 3 attempts.',
    hint: 'Retry the run once the provider recovers.',
  },
  {
    code: 'AUTH_EXPIRED',
    title: 'Integration credentials expired',
    message: 'The stored access token was rejected (401 Unauthorized).',
    hint: 'Reconnect the integration from the Integrations page.',
  },
  {
    code: 'RATE_LIMITED',
    title: 'Rate limit reached',
    message: 'The API rejected the call with 429 Too Many Requests.',
    hint: 'Add a Wait node or lower the trigger frequency.',
  },
  {
    code: 'SCHEMA_MISMATCH',
    title: 'Unexpected payload shape',
    message: 'Expected "amount" to be a number but received a string.',
    hint: 'Insert a Transform node before this step.',
  },
]

const SAMPLE_INPUTS: Record<string, Record<string, unknown>[]> = {
  default: [
    { name: 'Alex Morgan', email: 'alex@northwind.io', company: 'Northwind', score: 82 },
    { name: 'Jordan Blake', email: 'jordan@lumen.dev', company: 'Lumen', score: 64 },
    { name: 'Sam Okafor', email: 'sam@bright.co', company: 'Bright', score: 91 },
    { name: 'Riley Novak', email: 'riley@vela.io', company: 'Vela', score: 38 },
    { name: 'Casey Lin', email: 'casey@orbit.app', company: 'Orbit', score: 73 },
  ],
}

/** Walks the graph choosing one plausible path, mirroring the live engine. */
function walk(workflow: Workflow, rng: Rng, failIndex: number | null) {
  const nodes = workflow.nodes.filter((n) => !isCanvasPrimitive(n.type))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const entry = nodes.find((n) => isTrigger(n.type)) ?? nodes[0]
  const path: typeof nodes = []
  const branches: (string | undefined)[] = []
  if (!entry) return { path, branches }

  let current: (typeof nodes)[number] | undefined = entry
  const seen = new Set<string>()
  while (current && !seen.has(current.id) && path.length < 12) {
    seen.add(current.id)
    path.push(current)
    if (failIndex !== null && path.length - 1 === failIndex) break

    const def = getNodeDefinition(current.type)
    const outgoing = workflow.edges.filter((e) => e.source === current!.id)
    if (!outgoing.length) break

    let chosen = outgoing[0]
    if (def.outputHandles.length > 1) {
      const handle = pick(rng, def.outputHandles).id
      chosen = outgoing.find((e) => (e.sourceHandle ?? 'out') === handle) ?? outgoing[0]
      branches.push(chosen.sourceHandle ?? undefined)
    } else {
      branches.push(undefined)
    }
    current = byId.get(chosen.target)
  }
  return { path, branches }
}

function outputFor(type: string, rng: Rng): Record<string, unknown> {
  const def = getNodeDefinition(type)
  const output: Record<string, unknown> = {}
  for (const field of def.outputs) {
    const key = field.key.split('.').pop() ?? field.key
    if (field.type === 'number') {
      output[key] = typeof field.sample === 'number' ? field.sample : intBetween(rng, 1, 100)
    } else if (field.type === 'boolean') {
      output[key] = true
    } else {
      output[key] = field.sample
    }
  }
  return output
}

export function buildExecutions(workflows: Workflow[]): Execution[] {
  const rng = createRng(SEED + 7717)
  const executions: Execution[] = []
  const runnable = workflows.filter((w) => w.status !== 'draft')

  // Weighted so busy production workflows dominate the run history.
  const weights = runnable.map(
    (w) => [w, w.status === 'published' ? (w.environment === 'production' ? 10 : 4) : 2] as const,
  )

  const TOTAL = 168
  for (let i = 0; i < TOTAL; i++) {
    const workflow = pickWeighted(rng, weights)
    const status: ExecutionStatus =
      i === 0
        ? 'running'
        : i === 1
          ? 'running'
          : pickWeighted<ExecutionStatus>(rng, [
              ['success', 88],
              ['failed', 8],
              ['cancelled', 2],
            ])

    const failing = status === 'failed'
    const nodes = workflow.nodes.filter((n) => !isCanvasPrimitive(n.type))
    const failIndex = failing ? intBetween(rng, 1, Math.max(1, nodes.length - 1)) : null
    const { path, branches } = walk(workflow, rng, failIndex)

    // The detailed log keeps roughly the last day of traffic; anything
    // older is represented by the daily rollups in `data/metrics.ts`.
    const ageMinutes = Math.round(Math.pow(i / TOTAL, 1.35) * 1_180) + i
    const startedMs = NOW - ageMinutes * 60_000
    let cursor = startedMs
    let cost = 0

    const steps: ExecutionStep[] = []
    const logs: LogEntry[] = []
    let error: ExecutionError | null = null

    logs.push({
      id: `${workflow.id}_${i}_l0`,
      ts: iso(cursor),
      level: 'info',
      message: `Run started in ${workflow.environment}`,
    })

    path.forEach((node, index) => {
      const def = getNodeDefinition(node.type)
      const duration = intBetween(rng, 90, 1400)
      const isLast = index === path.length - 1
      const stepFailed = failing && isLast
      const stepStart = cursor
      cursor += duration
      cost += def.unitCost ?? 0

      if (stepFailed) {
        const template = pick(rng, FAILURE_TEMPLATES)
        error = { ...template, nodeId: node.id }
      }

      steps.push({
        id: `${workflow.id}_${i}_s${index}`,
        nodeId: node.id,
        nodeLabel: node.data.label,
        nodeType: node.type,
        status: stepFailed ? 'failed' : status === 'running' && isLast ? 'running' : 'success',
        startedAt: iso(stepStart),
        finishedAt: status === 'running' && isLast ? null : iso(cursor),
        durationMs: duration,
        input: index === 0 ? pick(rng, SAMPLE_INPUTS.default) : { from: path[index - 1].data.label },
        output: stepFailed ? null : outputFor(node.type, rng),
        error: stepFailed ? error : null,
        branch: branches[index] ?? undefined,
      })

      logs.push({
        id: `${workflow.id}_${i}_l${index + 1}`,
        ts: iso(stepStart),
        level: stepFailed ? 'error' : 'success',
        nodeId: node.id,
        nodeLabel: node.data.label,
        message: stepFailed
          ? (error?.message ?? 'Step failed')
          : `${node.data.label} completed in ${duration}ms`,
      })
    })

    const triggerSource = pickWeighted<TriggerSource>(rng, [
      ['webhook', 6],
      ['schedule', 4],
      ['manual', 2],
      ['test', 1],
    ])

    const durationMs = cursor - startedMs
    executions.push({
      id: `run_${(100000 + i * 37).toString(36)}${workflow.id.slice(-2)}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workspaceId: workflow.workspaceId,
      environment: workflow.environment,
      status,
      startedAt: iso(startedMs),
      finishedAt: status === 'running' ? null : iso(cursor),
      durationMs: status === 'running' ? 0 : durationMs,
      triggeredBy: triggerSource === 'manual' || triggerSource === 'test' ? workflow.ownerId : 'system',
      triggerSource,
      input: steps[0]?.input ?? {},
      output: status === 'success' ? (steps[steps.length - 1]?.output ?? null) : null,
      error,
      steps,
      logs,
      cost: Number(cost.toFixed(5)),
    })
  }

  return executions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )
}

/**
 * Recomputes denormalised workflow statistics.
 *
 * Volume and reliability come from the 90-day rollups; "last run" comes
 * from the detailed log so a fresh test run updates the card immediately.
 */
export function applyStats(
  workflows: Workflow[],
  executions: Execution[],
  metrics: DailyMetric[] = [],
): Workflow[] {
  const byWorkflow = new Map<string, DailyMetric[]>()
  for (const metric of metrics) {
    byWorkflow.set(metric.workflowId, [...(byWorkflow.get(metric.workflowId) ?? []), metric])
  }

  return workflows.map((workflow) => {
    const rollups = byWorkflow.get(workflow.id) ?? []
    const detailed = executions.filter((e) => e.workflowId === workflow.id)
    const latest = detailed[0] ?? null

    const successful = rollups.reduce((a, m) => a + m.successful, 0)
    const failed = rollups.reduce((a, m) => a + m.failed, 0)
    const running = rollups.reduce((a, m) => a + m.running, 0)
    const finished = successful + failed
    const localFinished = detailed.filter((e) => e.status !== 'running')

    const runs = successful + failed + running + detailed.length
    const localSuccess = localFinished.filter((e) => e.status === 'success').length

    return {
      ...workflow,
      stats: {
        runs,
        successRate:
          finished + localFinished.length > 0
            ? Number(
                (((successful + localSuccess) / (finished + localFinished.length)) * 100).toFixed(1),
              )
            : 100,
        avgDurationMs: rollups.length
          ? Math.round(rollups.reduce((a, m) => a + m.avgDurationMs, 0) / rollups.length)
          : localFinished.length
            ? Math.round(
                localFinished.reduce((a, e) => a + e.durationMs, 0) / localFinished.length,
              )
            : 0,
        lastRunAt: latest?.startedAt ?? null,
        lastRunStatus: latest
          ? latest.status === 'running'
            ? 'running'
            : latest.status === 'success'
              ? 'success'
              : 'failed'
          : null,
      },
    }
  })
}
