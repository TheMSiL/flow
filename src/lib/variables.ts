import { getNodeDefinition, isCanvasPrimitive } from '@/nodes/catalog'
import type { WorkflowNode } from '@/types/node'
import type { Workflow, WorkflowEdge } from '@/types/workflow'

/** `{{ some.path }}` — whitespace tolerant, non-greedy. */
export const VARIABLE_RE = /\{\{\s*([\w.[\]-]+?)\s*\}\}/g

export interface VariableEntry {
  path: string
  label: string
  type: string
  description: string
  sample: string
  source: string
  sourceNodeId?: string
}

export interface VariableGroup {
  id: string
  label: string
  hint?: string
  entries: VariableEntry[]
}

/** Resolves `a.b[0].c` against a plain object graph. */
export function getByPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')
  let cursor: unknown = obj
  for (const part of parts) {
    if (cursor == null || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[part]
  }
  return cursor
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Substitutes every `{{path}}` occurrence in `input`.
 * Unresolved paths are left verbatim so the failure is visible in the log
 * rather than silently producing an empty string.
 */
export function resolveTemplate(
  input: string,
  context: Record<string, unknown>,
): string {
  return input.replace(VARIABLE_RE, (match, path: string) => {
    const value = getByPath(context, path)
    return value === undefined ? match : stringify(value)
  })
}

/** Deep-resolves templates inside an arbitrary config value. */
export function resolveDeep<T>(value: T, context: Record<string, unknown>): T {
  if (typeof value === 'string') return resolveTemplate(value, context) as T
  if (Array.isArray(value)) {
    return value.map((item) => resolveDeep(item, context)) as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = resolveDeep(v, context)
    }
    return out as T
  }
  return value
}

export function extractVariables(input: string): string[] {
  const found: string[] = []
  for (const match of input.matchAll(VARIABLE_RE)) found.push(match[1])
  return found
}

/** Coerces a resolved template into a number when it looks like one. */
export function coerce(value: string): string | number | boolean {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (trimmed !== '' && !Number.isNaN(Number(trimmed))) return Number(trimmed)
  return value
}

/* ------------------------------------------------------------------ *
 * Catalog — what the variable picker shows for a given node
 * ------------------------------------------------------------------ */

const SYSTEM_VARS: VariableEntry[] = [
  { path: 'system.now', label: 'now', type: 'string', description: 'Current ISO timestamp', sample: '2026-08-17T21:04:12Z', source: 'System' },
  { path: 'system.date', label: 'date', type: 'string', description: 'Current date', sample: '2026-08-17', source: 'System' },
  { path: 'system.runId', label: 'runId', type: 'string', description: 'Execution id', sample: 'run_8f21c4', source: 'System' },
  { path: 'system.environment', label: 'environment', type: 'string', description: 'Active environment', sample: 'production', source: 'System' },
  { path: 'system.attempt', label: 'attempt', type: 'number', description: 'Retry attempt number', sample: '1', source: 'System' },
]

const WORKSPACE_VARS: VariableEntry[] = [
  { path: 'workspace.name', label: 'name', type: 'string', description: 'Workspace name', sample: 'Acme Labs', source: 'Workspace' },
  { path: 'workspace.id', label: 'id', type: 'string', description: 'Workspace id', sample: 'ws_acme', source: 'Workspace' },
  { path: 'company.name', label: 'company', type: 'string', description: 'Company name', sample: 'Acme Inc.', source: 'Workspace' },
  { path: 'company.domain', label: 'domain', type: 'string', description: 'Primary domain', sample: 'acme.co', source: 'Workspace' },
  { path: 'workflow.name', label: 'workflow', type: 'string', description: 'Current workflow name', sample: 'Lead qualification', source: 'Workspace' },
]

/** Walks the graph backwards to find every node that can reach `nodeId`. */
export function upstreamNodeIds(
  nodeId: string,
  edges: WorkflowEdge[],
  limit = 50,
): string[] {
  const incoming = new Map<string, string[]>()
  for (const edge of edges) {
    const list = incoming.get(edge.target) ?? []
    list.push(edge.source)
    incoming.set(edge.target, list)
  }
  const seen = new Set<string>()
  const order: string[] = []
  const queue = [...(incoming.get(nodeId) ?? [])]
  while (queue.length && order.length < limit) {
    const current = queue.shift()!
    if (seen.has(current)) continue
    seen.add(current)
    order.push(current)
    queue.push(...(incoming.get(current) ?? []))
  }
  return order
}

function slugForNode(node: WorkflowNode, index: number) {
  const base = node.data.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return base || `node_${index + 1}`
}

export function buildVariableCatalog(
  workflow: Pick<Workflow, 'nodes' | 'edges'>,
  currentNodeId?: string,
): VariableGroup[] {
  const groups: VariableGroup[] = []
  const executable = workflow.nodes.filter((n) => !isCanvasPrimitive(n.type))

  const triggers = executable.filter((n) => n.type.startsWith('trigger.'))
  if (triggers.length) {
    const entries: VariableEntry[] = []
    for (const trigger of triggers) {
      const def = getNodeDefinition(trigger.type)
      for (const out of def.outputs) {
        const path = out.key.includes('.') ? out.key : `trigger.${out.key}`
        entries.push({
          path,
          label: path,
          type: out.type,
          description: out.description,
          sample: String(out.sample),
          source: trigger.data.label,
          sourceNodeId: trigger.id,
        })
      }
    }
    groups.push({
      id: 'trigger',
      label: 'Trigger data',
      hint: 'Available to every node in the run',
      entries,
    })
  }

  const upstream = currentNodeId
    ? upstreamNodeIds(currentNodeId, workflow.edges)
    : []
  const previous = upstream
    .map((id) => executable.find((n) => n.id === id))
    .filter((n): n is WorkflowNode => Boolean(n))
    .filter((n) => !n.type.startsWith('trigger.'))

  if (previous.length) {
    const entries: VariableEntry[] = []
    previous.forEach((node, index) => {
      const def = getNodeDefinition(node.type)
      const slug = slugForNode(node, index)
      for (const out of def.outputs) {
        entries.push({
          path: `${slug}.${out.key}`,
          label: `${slug}.${out.key}`,
          type: out.type,
          description: out.description,
          sample: String(out.sample),
          source: node.data.label,
          sourceNodeId: node.id,
        })
      }
    })
    groups.push({
      id: 'previous',
      label: 'Previous nodes',
      hint: 'Output of every upstream step',
      entries,
    })
  }

  groups.push({ id: 'workspace', label: 'Workspace', entries: WORKSPACE_VARS })
  groups.push({ id: 'system', label: 'System', entries: SYSTEM_VARS })

  return groups.filter((g) => g.entries.length > 0)
}

export { slugForNode }
