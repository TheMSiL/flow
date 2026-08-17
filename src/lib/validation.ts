import { z } from 'zod'
import {
  getNodeDefinition,
  isCanvasPrimitive,
  isCondition,
  isTrigger,
} from '@/nodes/catalog'
import type { FieldDef, NodeConfig, WorkflowNode } from '@/types/node'
import type {
  ValidationIssue,
  ValidationResult,
  Workflow,
  WorkflowEdge,
} from '@/types/workflow'

/* ------------------------------------------------------------------ *
 * Field-level schemas
 * ------------------------------------------------------------------ */

function schemaForField(field: FieldDef): z.ZodTypeAny {
  let schema: z.ZodTypeAny

  switch (field.type) {
    case 'number':
    case 'slider':
      schema = z.coerce.number({ invalid_type_error: 'Must be a number' })
      if (field.min !== undefined) {
        schema = (schema as z.ZodNumber).min(field.min, `Minimum is ${field.min}`)
      }
      if (field.max !== undefined) {
        schema = (schema as z.ZodNumber).max(field.max, `Maximum is ${field.max}`)
      }
      break
    case 'boolean':
      schema = z.boolean()
      break
    case 'keyvalue':
      schema = z.record(z.string())
      break
    case 'json':
      schema = z.string().superRefine((value, ctx) => {
        if (!value.trim()) return
        try {
          JSON.parse(value)
        } catch {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid JSON' })
        }
      })
      break
    default:
      schema = z.string()
  }

  if (!field.required) return schema.optional().nullable()

  if (field.type === 'keyvalue') {
    return (schema as z.ZodRecord).refine(
      (value) => Object.keys(value ?? {}).length > 0,
      { message: `${field.label} is required` },
    )
  }
  if (schema instanceof z.ZodString) {
    return schema.min(1, `${field.label} is required`)
  }
  return schema
}

/** Builds a Zod object schema from a node definition's field list. */
export function buildNodeSchema(type: string) {
  const def = getNodeDefinition(type)
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of def.fields) shape[field.key] = schemaForField(field)
  return z.object(shape)
}

/** A field is only enforced when its `showIf` guard is satisfied. */
export function isFieldVisible(field: FieldDef, config: NodeConfig): boolean {
  if (!field.showIf) return true
  const current = config[field.showIf.key]
  const expected = field.showIf.equals
  if (Array.isArray(expected)) return expected.includes(String(current))
  return current === expected
}

export function visibleFields(type: string, config: NodeConfig): FieldDef[] {
  return getNodeDefinition(type).fields.filter((f) => isFieldVisible(f, config))
}

function isBlank(value: unknown) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/** Missing required fields for one node — the basis of "Needs configuration". */
export function missingFields(node: WorkflowNode): FieldDef[] {
  if (isCanvasPrimitive(node.type)) return []
  return visibleFields(node.type, node.data.config).filter(
    (field) => field.required && isBlank(node.data.config[field.key]),
  )
}

export function isNodeConfigured(node: WorkflowNode): boolean {
  return missingFields(node).length === 0
}

/* ------------------------------------------------------------------ *
 * Graph-level validation
 * ------------------------------------------------------------------ */

function detectCycle(nodeIds: string[], edges: WorkflowEdge[]): string[] | null {
  const adjacency = new Map<string, string[]>()
  for (const edge of edges) {
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target])
  }
  const WHITE = 0
  const GREY = 1
  const BLACK = 2
  const colour = new Map<string, number>(nodeIds.map((id) => [id, WHITE]))
  const stack: string[] = []
  let cycle: string[] | null = null

  const visit = (id: string): boolean => {
    colour.set(id, GREY)
    stack.push(id)
    for (const next of adjacency.get(id) ?? []) {
      if (!colour.has(next)) continue
      if (colour.get(next) === GREY) {
        cycle = stack.slice(stack.indexOf(next))
        return true
      }
      if (colour.get(next) === WHITE && visit(next)) return true
    }
    stack.pop()
    colour.set(id, BLACK)
    return false
  }

  for (const id of nodeIds) {
    if (colour.get(id) === WHITE && visit(id)) break
  }
  return cycle
}

export function validateWorkflow(
  workflow: Pick<Workflow, 'nodes' | 'edges' | 'name'>,
): ValidationResult {
  const issues: ValidationIssue[] = []
  const nodes = workflow.nodes.filter((n) => !isCanvasPrimitive(n.type))
  const nodeIds = nodes.map((n) => n.id)
  const edges = workflow.edges.filter(
    (e) => nodeIds.includes(e.source) && nodeIds.includes(e.target),
  )

  const push = (issue: Omit<ValidationIssue, 'id'>) =>
    issues.push({ id: `${issue.rule}:${issue.nodeId ?? issue.edgeId ?? 'graph'}`, ...issue })

  /* — 1. there must be at least one node — */
  if (nodes.length === 0) {
    push({
      severity: 'error',
      rule: 'empty_workflow',
      title: 'Workflow is empty',
      detail: 'Add a trigger to describe when this workflow should run.',
    })
    return summarise(issues)
  }

  /* — 2. exactly one trigger is expected — */
  const triggers = nodes.filter((n) => isTrigger(n.type))
  if (triggers.length === 0) {
    push({
      severity: 'error',
      rule: 'missing_trigger',
      title: 'No trigger',
      detail: 'Every workflow needs a trigger node to start from.',
    })
  } else if (triggers.length > 1) {
    triggers.slice(1).forEach((t) =>
      push({
        severity: 'warning',
        rule: 'multiple_triggers',
        nodeId: t.id,
        title: `${t.data.label} is a second trigger`,
        detail: 'Multiple triggers run as independent entry points.',
      }),
    )
  }

  /* — 3. required configuration — */
  for (const node of nodes) {
    if (node.data.disabled) continue
    const missing = missingFields(node)
    if (missing.length) {
      push({
        severity: 'error',
        rule: 'missing_config',
        nodeId: node.id,
        title: `${node.data.label} is missing ${missing.length === 1 ? missing[0].label.toLowerCase() : `${missing.length} fields`}`,
        detail:
          missing.length === 1
            ? `Set “${missing[0].label}” before publishing.`
            : `Required: ${missing.map((f) => f.label).join(', ')}.`,
      })
    }
  }

  /* — 4. isolated nodes — */
  const connected = new Set<string>()
  for (const edge of edges) {
    connected.add(edge.source)
    connected.add(edge.target)
  }
  for (const node of nodes) {
    if (isTrigger(node.type) && nodes.length === 1) continue
    if (!connected.has(node.id)) {
      push({
        severity: 'warning',
        rule: 'isolated_node',
        nodeId: node.id,
        title: `${node.data.label} is not connected`,
        detail: 'This node will never run. Connect it or remove it.',
      })
    }
  }

  /* — 5. condition branches — */
  for (const node of nodes) {
    if (!isCondition(node.type)) continue
    const def = getNodeDefinition(node.type)
    const used = new Set(
      edges.filter((e) => e.source === node.id).map((e) => e.sourceHandle ?? 'out'),
    )
    const unused = def.outputHandles.filter((h) => !used.has(h.id))
    if (unused.length === def.outputHandles.length) {
      push({
        severity: 'error',
        rule: 'condition_no_branches',
        nodeId: node.id,
        title: `${node.data.label} has no outgoing branches`,
        detail: 'Connect at least one branch so the run can continue.',
      })
    } else if (unused.length) {
      push({
        severity: 'warning',
        rule: 'condition_missing_branch',
        nodeId: node.id,
        title: `${node.data.label} has no ${unused.map((h) => h.label ?? h.id).join(' / ')} branch`,
        detail: 'Runs taking that path will stop here.',
      })
    }
  }

  /* — 6. cycles — */
  const cycle = detectCycle(nodeIds, edges)
  if (cycle) {
    push({
      severity: 'error',
      rule: 'cycle',
      nodeId: cycle[0],
      title: 'Workflow contains a loop',
      detail: `${cycle.length} nodes form a cycle and would run forever.`,
    })
  }

  /* — 7. at least one executable path — */
  if (triggers.length && !cycle) {
    const reachable = new Set<string>()
    const queue = triggers.map((t) => t.id)
    while (queue.length) {
      const id = queue.shift()!
      if (reachable.has(id)) continue
      reachable.add(id)
      edges.filter((e) => e.source === id).forEach((e) => queue.push(e.target))
    }
    const enabled = nodes.filter((n) => !n.data.disabled)
    if (enabled.length > 1 && reachable.size < 2) {
      push({
        severity: 'error',
        rule: 'no_path',
        nodeId: triggers[0].id,
        title: 'Trigger leads nowhere',
        detail: 'Connect the trigger to at least one action.',
      })
    }
  }

  /* — 8. edges pointing at disabled nodes — */
  for (const edge of edges) {
    const target = nodes.find((n) => n.id === edge.target)
    if (target?.data.disabled) {
      push({
        severity: 'warning',
        rule: 'disabled_target',
        edgeId: edge.id,
        nodeId: target.id,
        title: `${target.data.label} is disabled`,
        detail: 'Runs reaching this node will skip it.',
      })
    }
  }

  return summarise(issues)
}

function summarise(issues: ValidationIssue[]): ValidationResult {
  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.length - errorCount
  return { valid: errorCount === 0, issues, errorCount, warningCount }
}

/* ------------------------------------------------------------------ *
 * Standalone schemas used by dialogs
 * ------------------------------------------------------------------ */

export const workflowMetaSchema = z.object({
  name: z
    .string()
    .min(2, 'Give the workflow a name of at least 2 characters')
    .max(60, 'Keep the name under 60 characters'),
  description: z.string().max(240, 'Keep the description under 240 characters'),
  tags: z.array(z.string()).optional(),
})

export const workspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace names need at least 2 characters')
    .max(40, 'Keep it under 40 characters'),
  plan: z.enum(['free', 'team', 'business', 'enterprise']),
})

export const inviteSchema = z.object({
  email: z.string().email('Enter a valid work email'),
  role: z.enum(['admin', 'editor', 'viewer']),
})

export const testInputSchema = z.object({
  payload: z.string().refine(
    (value) => {
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    },
    { message: 'Test input must be valid JSON' },
  ),
})

export type WorkflowMetaInput = z.infer<typeof workflowMetaSchema>
export type WorkspaceInput = z.infer<typeof workspaceSchema>
export type InviteInput = z.infer<typeof inviteSchema>
