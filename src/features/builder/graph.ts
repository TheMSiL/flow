import type { Edge, Node } from '@xyflow/react'
import { getNodeDefinition } from '@/nodes/catalog'
import type { NodeType, WorkflowNode, WorkflowNodeData } from '@/types/node'
import type { EdgeKind, Workflow, WorkflowEdge } from '@/types/workflow'

export type AppNode = Node<WorkflowNodeData, string>

export interface AppEdgeData extends Record<string, unknown> {
  kind?: EdgeKind
  branchLabel?: string
  /** Transient execution highlight. */
  state?: 'idle' | 'active' | 'done' | 'skipped'
}

export type AppEdge = Edge<AppEdgeData>

/* ------------------------- workflow → canvas ------------------------- */

export function toCanvasNodes(nodes: WorkflowNode[]): AppNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: { ...node.data },
    ...(node.width ? { width: node.width } : {}),
    ...(node.height ? { height: node.height } : {}),
    ...(node.parentId ? { parentId: node.parentId, extent: 'parent' as const } : {}),
    ...(node.type === 'canvas.note' ? { zIndex: -1 } : {}),
  }))
}

export function toCanvasEdges(edges: WorkflowEdge[]): AppEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? 'out',
    targetHandle: edge.targetHandle ?? 'in',
    type: 'flow',
    data: {
      kind: edge.kind ?? 'default',
      branchLabel: edge.label,
      state: 'idle',
    },
  }))
}

/* ------------------------- canvas → workflow ------------------------- */

export function fromCanvasNodes(nodes: AppNode[]): WorkflowNode[] {
  return nodes.map((node) => {
    const { status: _status, ...rest } = node.data
    return {
      id: node.id,
      type: (node.type ?? 'utility.log') as NodeType,
      position: { x: Math.round(node.position.x), y: Math.round(node.position.y) },
      data: rest as WorkflowNodeData,
      ...(node.width ? { width: node.width } : {}),
      ...(node.height ? { height: node.height } : {}),
      ...(node.parentId ? { parentId: node.parentId, extent: 'parent' as const } : {}),
    }
  })
}

export function fromCanvasEdges(edges: AppEdge[]): WorkflowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? 'out',
    targetHandle: edge.targetHandle ?? 'in',
    kind: edge.data?.kind ?? 'default',
    label: edge.data?.branchLabel,
  }))
}

/** Snapshot used by the editor's undo stack. */
export interface Snapshot {
  nodes: AppNode[]
  edges: AppEdge[]
}

export function cloneSnapshot(snapshot: Snapshot): Snapshot {
  return {
    nodes: snapshot.nodes.map((n) => ({ ...n, data: { ...n.data, config: { ...n.data.config } } })),
    edges: snapshot.edges.map((e) => ({ ...e, data: { ...e.data } })),
  }
}

/**
 * A connection is rejected when it would duplicate an existing link, feed a
 * node into itself, or point at a trigger (triggers have no input).
 */
export function isValidConnection(
  connection: { source?: string | null; target?: string | null; sourceHandle?: string | null },
  edges: AppEdge[],
  nodes: AppNode[],
): boolean {
  const { source, target } = connection
  if (!source || !target || source === target) return false
  const targetNode = nodes.find((n) => n.id === target)
  if (!targetNode) return false
  if (getNodeDefinition(targetNode.type ?? '').inputs.length === 0) return false
  if (targetNode.type === 'canvas.note') return false
  const handle = connection.sourceHandle ?? 'out'
  return !edges.some(
    (e) =>
      e.source === source && e.target === target && (e.sourceHandle ?? 'out') === handle,
  )
}

/** Bounding box of the executable graph, used to place new nodes sensibly. */
export function nextNodePosition(nodes: AppNode[]) {
  if (!nodes.length) return { x: 0, y: 0 }
  const right = nodes.reduce((max, n) => Math.max(max, n.position.x), -Infinity)
  const column = nodes.filter((n) => n.position.x === right)
  const bottom = column.reduce((max, n) => Math.max(max, n.position.y), 0)
  return { x: right + 340, y: bottom }
}

export function workflowSignature(workflow: Pick<Workflow, 'nodes' | 'edges'>) {
  return JSON.stringify({
    n: workflow.nodes.map((n) => [n.id, n.type, n.position.x, n.position.y, n.data.label, n.data.config, n.data.disabled, n.data.text]),
    e: workflow.edges.map((e) => [e.id, e.source, e.target, e.sourceHandle]),
  })
}
