import { defaultConfigFor } from '@/nodes/catalog'
import type { NodeConfig, NodeType, WorkflowNode } from '@/types/node'
import type { WorkflowEdge } from '@/types/workflow'

/** Master seed — every generator derives from it. */
export const SEED = 20260817

/**
 * All fixtures are anchored to 21:12 of the current day so relative
 * timestamps ("2 hours ago") stay sensible while the *shape* of the
 * dataset remains identical on every load.
 */
export const NOW = (() => {
  const d = new Date()
  d.setHours(21, 12, 0, 0)
  return d.getTime()
})()

export const iso = (ms: number) => new Date(ms).toISOString()
export const minutesAgo = (n: number) => iso(NOW - n * 60_000)
export const hoursAgo = (n: number) => iso(NOW - n * 3_600_000)
export const daysAgo = (n: number) => iso(NOW - n * 86_400_000)
export const daysAhead = (n: number) => iso(NOW + n * 86_400_000)

/* ------------------------------------------------------------------ *
 * Graph construction helpers
 * ------------------------------------------------------------------ */

export const COL = 340
export const ROW = 180

export function node(
  id: string,
  type: NodeType,
  label: string,
  col: number,
  row: number,
  config: NodeConfig = {},
  description?: string,
): WorkflowNode {
  return {
    id,
    type,
    position: { x: col * COL, y: row * ROW },
    data: {
      label,
      description,
      config: { ...defaultConfigFor(type), ...config },
      status: 'configured',
    },
  }
}

export function note(
  id: string,
  text: string,
  col: number,
  row: number,
): WorkflowNode {
  return {
    id,
    type: 'canvas.note',
    position: { x: col * COL, y: row * ROW },
    width: 240,
    height: 128,
    data: { label: 'Note', config: {}, text },
  }
}

export function edge(
  source: string,
  target: string,
  sourceHandle: string | null = null,
  label?: string,
): WorkflowEdge {
  const handle = sourceHandle ?? 'out'
  return {
    id: `e_${source}_${handle}_${target}`,
    source,
    target,
    sourceHandle: handle,
    targetHandle: 'in',
    kind: handle === 'out' ? 'default' : 'branch',
    label,
  }
}

export const chain = (...ids: string[]): WorkflowEdge[] =>
  ids.slice(1).map((id, i) => edge(ids[i], id))
