import { getNodeDefinition, isCanvasPrimitive, isTrigger } from '@/nodes/catalog'
import { createRng } from '@/lib/random'
import { uid } from '@/lib/utils'
import { missingFields } from '@/lib/validation'
import { slugForNode } from '@/lib/variables'
import { getExecutor, resolveNodeInput } from './executors'
import type { WorkflowNode } from '@/types/node'
import type { WorkflowEdge } from '@/types/workflow'
import type {
  Execution,
  ExecutionError,
  ExecutionSpeed,
  ExecutionStep,
  LogEntry,
  LogLevel,
  TriggerSource,
} from '@/types/execution'
import type { Environment } from '@/types/workflow'

/* ------------------------------------------------------------------ *
 * Timing
 * ------------------------------------------------------------------ */

const SPEED_PROFILE: Record<ExecutionSpeed, { node: [number, number]; edge: number }> = {
  normal: { node: [300, 700], edge: 240 },
  fast: { node: [100, 200], edge: 90 },
  instant: { node: [0, 0], edge: 0 },
}

export const SPEED_LABELS: Record<ExecutionSpeed, string> = {
  normal: 'Normal',
  fast: 'Fast',
  instant: 'Instant',
}

/* ------------------------------------------------------------------ *
 * Events
 * ------------------------------------------------------------------ */

export type EngineEvent =
  | { type: 'run:start'; runId: string; startedAt: string; nodeIds: string[] }
  | { type: 'edge:active'; edgeId: string }
  | { type: 'edge:done'; edgeId: string; skipped?: boolean }
  | { type: 'node:start'; nodeId: string; step: ExecutionStep }
  | { type: 'node:finish'; nodeId: string; step: ExecutionStep }
  | { type: 'log'; entry: LogEntry }
  | { type: 'run:finish'; execution: Execution }

export interface RunOptions {
  workflow: {
    id: string
    name: string
    workspaceId: string
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
  }
  input?: Record<string, unknown>
  speed?: ExecutionSpeed
  /** Start from an arbitrary node instead of the trigger ("Run from here"). */
  startNodeId?: string
  environment?: Environment
  triggeredBy?: string
  triggerSource?: TriggerSource
  /** Forces a failure on a specific node — powers the failure demo. */
  failAtNodeId?: string
  seed?: number
  signal?: AbortSignal
  onEvent?: (event: EngineEvent) => void
  retryOf?: string
}

class AbortedError extends Error {}

/* ------------------------------------------------------------------ *
 * Scope helpers
 * ------------------------------------------------------------------ */

const TRIGGER_NAMESPACE: Record<string, string> = {
  'trigger.new_lead': 'lead',
  'trigger.new_order': 'order',
  'trigger.email_received': 'email',
  'trigger.payment_received': 'payment',
  'trigger.form_submitted': 'form',
  'trigger.webhook': 'payload',
  'trigger.schedule': 'schedule',
  'trigger.manual': 'manual',
}

function buildInitialScope(
  trigger: WorkflowNode | undefined,
  input: Record<string, unknown>,
  meta: { runId: string; environment: Environment; workflowName: string; workspaceId: string },
) {
  const scope: Record<string, unknown> = {
    ...input,
    trigger: input,
    system: {
      now: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      runId: meta.runId,
      environment: meta.environment,
      attempt: 1,
    },
    workspace: { id: meta.workspaceId, name: 'Acme Labs' },
    company: { name: 'Acme Inc.', domain: 'acme.co' },
    workflow: { name: meta.workflowName },
  }

  // Also expose the payload under the trigger's natural namespace so
  // `{{lead.score}}` resolves for a flat `{ score: 82 }` test input.
  const ns = trigger ? TRIGGER_NAMESPACE[trigger.type] : undefined
  if (ns && scope[ns] === undefined) scope[ns] = input
  return scope
}

/* ------------------------------------------------------------------ *
 * Engine
 * ------------------------------------------------------------------ */

export async function runWorkflow(options: RunOptions): Promise<Execution> {
  const {
    workflow,
    input = {},
    speed = 'normal',
    startNodeId,
    environment = 'development',
    triggeredBy = 'u_maya',
    triggerSource = 'test',
    failAtNodeId,
    seed,
    signal,
    onEvent,
    retryOf,
  } = options

  const runId = `run_${uid('x').split('_')[1]}`
  const profile = SPEED_PROFILE[speed]
  const rng = createRng(seed ?? Math.floor(Math.random() * 1e9))
  const emit = (event: EngineEvent) => onEvent?.(event)

  const nodes = workflow.nodes.filter((n) => !isCanvasPrimitive(n.type))
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const edges = workflow.edges.filter(
    (e) => nodeById.has(e.source) && nodeById.has(e.target),
  )

  const steps: ExecutionStep[] = []
  const logs: LogEntry[] = []
  const startedAt = new Date().toISOString()
  const startedAtMs = Date.now()
  let cost = 0
  let error: ExecutionError | null = null

  const log = (level: LogLevel, message: string, node?: WorkflowNode, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      id: uid('log'),
      ts: new Date().toISOString(),
      level,
      nodeId: node?.id,
      nodeLabel: node?.data.label,
      message,
      data,
    }
    logs.push(entry)
    emit({ type: 'log', entry })
  }

  const wait = async (ms: number) => {
    if (ms <= 0) return
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, ms)
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          reject(new AbortedError())
        },
        { once: true },
      )
    })
  }

  const entry =
    (startNodeId && nodeById.get(startNodeId)) ||
    nodes.find((n) => isTrigger(n.type)) ||
    nodes[0]

  emit({ type: 'run:start', runId, startedAt, nodeIds: nodes.map((n) => n.id) })

  if (!entry) {
    error = {
      code: 'NO_ENTRY',
      title: 'Nothing to run',
      message: 'This workflow has no nodes to execute.',
    }
    log('error', error.message)
    return finish('failed')
  }

  const scope = buildInitialScope(
    nodes.find((n) => isTrigger(n.type)),
    input,
    { runId, environment, workflowName: workflow.name, workspaceId: workflow.workspaceId },
  )

  log('info', `Run started in ${environment}`, undefined, { runId })

  type QueueItem = { nodeId: string; edgeId?: string; payload: Record<string, unknown> }
  const queue: QueueItem[] = [{ nodeId: entry.id, payload: input }]
  const executed = new Set<string>()
  let status: Execution['status'] = 'success'
  let lastOutput: Record<string, unknown> | null = null

  try {
    while (queue.length) {
      const item = queue.shift()!
      const node = nodeById.get(item.nodeId)
      if (!node || executed.has(node.id)) continue
      executed.add(node.id)

      /* — animate the incoming connection — */
      if (item.edgeId) {
        emit({ type: 'edge:active', edgeId: item.edgeId })
        await wait(profile.edge)
        emit({ type: 'edge:done', edgeId: item.edgeId })
      }

      const def = getNodeDefinition(node.type)
      const stepStartedAt = new Date().toISOString()
      const stepStartMs = Date.now()

      /* — disabled nodes are skipped but still traverse — */
      if (node.data.disabled) {
        const step: ExecutionStep = {
          id: uid('step'),
          nodeId: node.id,
          nodeLabel: node.data.label,
          nodeType: node.type,
          status: 'skipped',
          startedAt: stepStartedAt,
          finishedAt: stepStartedAt,
          durationMs: 0,
          input: item.payload,
          output: item.payload,
          error: null,
        }
        steps.push(step)
        emit({ type: 'node:finish', nodeId: node.id, step })
        log('warn', `${node.data.label} is disabled — skipped`, node)
        enqueueNext(node, item.payload)
        continue
      }

      const runningStep: ExecutionStep = {
        id: uid('step'),
        nodeId: node.id,
        nodeLabel: node.data.label,
        nodeType: node.type,
        status: 'running',
        startedAt: stepStartedAt,
        finishedAt: null,
        durationMs: 0,
        input: resolveNodeInput(node, scope),
        output: null,
        error: null,
      }
      steps.push(runningStep)
      emit({ type: 'node:start', nodeId: node.id, step: runningStep })

      const duration =
        profile.node[0] === 0
          ? 0
          : Math.round(profile.node[0] + rng() * (profile.node[1] - profile.node[0]))
      await wait(duration)

      /* — failure paths — */
      const missing = missingFields(node)
      if (failAtNodeId === node.id || missing.length > 0) {
        const stepError: ExecutionError =
          failAtNodeId === node.id
            ? {
                code: 'NODE_FAILED',
                title: `${node.data.label} failed`,
                message: 'The upstream service rejected the request (502 Bad Gateway).',
                nodeId: node.id,
                hint: 'Check the integration connection and retry the run.',
              }
            : {
                code: 'MISSING_CONFIG',
                title: `${node.data.label} is not configured`,
                message: `Required ${missing.length === 1 ? 'field' : 'fields'}: ${missing
                  .map((f) => f.label)
                  .join(', ')}.`,
                nodeId: node.id,
                hint: 'Open the node and fill in the highlighted fields.',
              }

        Object.assign(runningStep, {
          status: 'failed' as const,
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - stepStartMs,
          error: stepError,
        })
        emit({ type: 'node:finish', nodeId: node.id, step: runningStep })
        log('error', stepError.message, node)
        error = stepError
        status = 'failed'
        break
      }

      /* — success path — */
      const executor = getExecutor(node.type)
      const result = executor({ scope, input: item.payload, node, rng })

      cost += def.unitCost ?? 0
      const slug = slugForNode(node, steps.length)
      scope[slug] = result.output
      scope.last = result.output
      lastOutput = result.output

      Object.assign(runningStep, {
        status: 'success' as const,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - stepStartMs,
        output: result.output,
        branch: result.branch,
      })
      emit({ type: 'node:finish', nodeId: node.id, step: runningStep })

      for (const line of result.logs ?? []) log(line.level, line.message, node)
      if (!result.logs?.length) {
        log('success', `${node.data.label} completed in ${runningStep.durationMs}ms`, node)
      }

      enqueueNext(node, result.output, result.branch)
    }
  } catch (err) {
    if (err instanceof AbortedError) {
      status = 'cancelled'
      log('warn', 'Run cancelled')
    } else {
      status = 'failed'
      error = {
        code: 'ENGINE_ERROR',
        title: 'Execution error',
        message: err instanceof Error ? err.message : 'Unknown engine error',
      }
      log('error', error.message)
    }
  }

  function enqueueNext(
    node: WorkflowNode,
    payload: Record<string, unknown>,
    branch?: string,
  ) {
    const outgoing = edges.filter((e) => e.source === node.id)
    const taken = branch
      ? outgoing.filter((e) => (e.sourceHandle ?? 'out') === branch)
      : outgoing
    const dropped = outgoing.filter((e) => !taken.includes(e))
    for (const edge of dropped) emit({ type: 'edge:done', edgeId: edge.id, skipped: true })
    for (const edge of taken) queue.push({ nodeId: edge.target, edgeId: edge.id, payload })
    if (branch && taken.length === 0) {
      log('warn', `Branch "${branch}" has no connected node — run ends here`, node)
    }
  }

  function finish(finalStatus: Execution['status']): Execution {
    const finishedAt = new Date().toISOString()
    const execution: Execution = {
      id: runId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      workspaceId: workflow.workspaceId,
      environment,
      status: finalStatus,
      startedAt,
      finishedAt,
      durationMs: Date.now() - startedAtMs,
      triggeredBy,
      triggerSource,
      input,
      output: lastOutput,
      error,
      steps,
      logs,
      cost: Number(cost.toFixed(5)),
      retryOf,
    }
    emit({ type: 'run:finish', execution })
    return execution
  }

  if (status === 'success') {
    log('success', `Execution completed · ${steps.length} steps`)
  }
  return finish(status)
}
