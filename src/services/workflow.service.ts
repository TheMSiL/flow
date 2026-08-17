import { db, request } from './db'
import { defaultConfigFor, getNodeDefinition } from '@/nodes/catalog'
import { uid } from '@/lib/utils'
import { CURRENT_USER_ID } from '@/data/users'
import type { NodeType, WorkflowNode } from '@/types/node'
import type {
  Comment,
  Environment,
  Workflow,
  WorkflowEdge,
  WorkflowStatus,
} from '@/types/workflow'
import type { Template } from '@/types/template'

export interface WorkflowFilter {
  workspaceId?: string
  query?: string
  status?: WorkflowStatus | 'all'
  tag?: string
  sort?: 'updated' | 'created' | 'name' | 'runs' | 'success'
}

function sortWorkflows(items: Workflow[], sort: WorkflowFilter['sort'] = 'updated') {
  const copy = [...items]
  switch (sort) {
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
    case 'created':
      return copy.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    case 'runs':
      return copy.sort((a, b) => b.stats.runs - a.stats.runs)
    case 'success':
      return copy.sort((a, b) => b.stats.successRate - a.stats.successRate)
    default:
      return copy.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
  }
}

export function filterWorkflows(items: Workflow[], filter: WorkflowFilter) {
  const q = filter.query?.trim().toLowerCase() ?? ''
  const filtered = items.filter((w) => {
    if (filter.workspaceId && w.workspaceId !== filter.workspaceId) return false
    if (filter.status && filter.status !== 'all' && w.status !== filter.status) return false
    if (filter.tag && !w.tags.includes(filter.tag)) return false
    if (!q) return true
    return (
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.tags.some((t) => t.includes(q))
    )
  })
  return sortWorkflows(filtered, filter.sort)
}

/* ------------------------------------------------------------------ *
 * Node factory
 * ------------------------------------------------------------------ */

export function createNode(
  type: NodeType,
  position: { x: number; y: number },
  overrides: Partial<WorkflowNode['data']> = {},
): WorkflowNode {
  const def = getNodeDefinition(type)
  const isNote = type === 'canvas.note'
  return {
    id: uid('n'),
    type,
    position,
    ...(isNote ? { width: 240, height: 128 } : {}),
    data: {
      label: overrides.label ?? def.label,
      description: overrides.description,
      config: { ...defaultConfigFor(type), ...(overrides.config ?? {}) },
      status: 'configured',
      ...(isNote ? { text: overrides.text ?? '' } : {}),
      ...overrides,
    },
  }
}

/* ------------------------------------------------------------------ *
 * Service
 * ------------------------------------------------------------------ */

export const workflowService = {
  getWorkflows(filter: WorkflowFilter = {}) {
    return request(() => filterWorkflows(db.get().workflows, filter))
  },

  getWorkflow(id: string) {
    return request(() => db.get().workflows.find((w) => w.id === id) ?? null, 60)
  },

  createWorkflow(input: {
    name: string
    description?: string
    workspaceId: string
    template?: Template
  }) {
    return request(() => {
      const now = new Date().toISOString()
      const id = uid('wf')
      const nodes: WorkflowNode[] = input.template
        ? input.template.nodes.map((n) => ({
            ...n,
            id: `${id}_${n.id}`,
            data: { ...n.data, config: { ...n.data.config } },
          }))
        : [
            createNode('trigger.manual', { x: 0, y: 0 }, { label: 'Manual trigger' }),
          ]
      const edges: WorkflowEdge[] = input.template
        ? input.template.edges.map((e) => ({
            ...e,
            id: `${id}_${e.id}`,
            source: `${id}_${e.source}`,
            target: `${id}_${e.target}`,
          }))
        : []

      const workflow: Workflow = {
        id,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? '',
        status: 'draft',
        nodes,
        edges,
        ownerId: CURRENT_USER_ID,
        environment: 'development',
        version: 1,
        tags: input.template ? [input.template.category] : [],
        stats: { runs: 0, successRate: 100, avgDurationMs: 0, lastRunAt: null, lastRunStatus: null },
        versions: [
          {
            id: `${id}_v1`,
            version: 1,
            createdAt: now,
            authorId: CURRENT_USER_ID,
            status: 'draft',
            message: input.template ? `Created from ${input.template.name}` : 'Created',
            changes: [],
            nodeCount: nodes.length,
            edgeCount: edges.length,
          },
        ],
        createdAt: now,
        updatedAt: now,
        templateId: input.template?.id,
      }

      db.set((s) => ({ workflows: [workflow, ...s.workflows] }))
      return workflow
    }, 220)
  },

  /** Partial update — used by autosave and by inline renames. */
  updateWorkflow(id: string, patch: Partial<Workflow>) {
    return request(() => {
      let updated: Workflow | null = null
      db.set((s) => ({
        workflows: s.workflows.map((w) => {
          if (w.id !== id) return w
          updated = { ...w, ...patch, updatedAt: new Date().toISOString() }
          return updated
        }),
      }))
      return updated
    }, 40)
  },

  duplicateWorkflow(id: string) {
    return request(() => {
      const source = db.get().workflows.find((w) => w.id === id)
      if (!source) return null
      const newId = uid('wf')
      const idMap = new Map(source.nodes.map((n) => [n.id, `${newId}_${n.id}`]))
      const now = new Date().toISOString()
      const copy: Workflow = {
        ...source,
        id: newId,
        name: `${source.name} (copy)`,
        status: 'draft',
        version: 1,
        createdAt: now,
        updatedAt: now,
        ownerId: CURRENT_USER_ID,
        stats: { runs: 0, successRate: 100, avgDurationMs: 0, lastRunAt: null, lastRunStatus: null },
        nodes: source.nodes.map((n) => ({
          ...n,
          id: idMap.get(n.id)!,
          data: { ...n.data, config: { ...n.data.config } },
        })),
        edges: source.edges.map((e) => ({
          ...e,
          id: `${newId}_${e.id}`,
          source: idMap.get(e.source) ?? e.source,
          target: idMap.get(e.target) ?? e.target,
        })),
        versions: [
          {
            id: `${newId}_v1`,
            version: 1,
            createdAt: now,
            authorId: CURRENT_USER_ID,
            status: 'draft',
            message: `Duplicated from ${source.name}`,
            changes: [],
            nodeCount: source.nodes.length,
            edgeCount: source.edges.length,
          },
        ],
      }
      db.set((s) => ({ workflows: [copy, ...s.workflows] }))
      return copy
    }, 260)
  },

  publishWorkflow(id: string, environment: Environment = 'production') {
    return request(() => {
      let published: Workflow | null = null
      db.set((s) => ({
        workflows: s.workflows.map((w) => {
          if (w.id !== id) return w
          const version = w.version + 1
          published = {
            ...w,
            status: 'published',
            environment,
            version,
            updatedAt: new Date().toISOString(),
            versions: [
              {
                id: `${w.id}_v${version}`,
                version,
                createdAt: new Date().toISOString(),
                authorId: CURRENT_USER_ID,
                status: 'published',
                message: `Published to ${environment}`,
                changes: ['Published from the builder'],
                nodeCount: w.nodes.length,
                edgeCount: w.edges.length,
              },
              ...w.versions,
            ],
          }
          return published
        }),
      }))
      return published
    }, 480)
  },

  setStatus(id: string, status: WorkflowStatus) {
    return workflowService.updateWorkflow(id, { status })
  },

  deleteWorkflow(id: string) {
    return request(() => {
      db.set((s) => ({
        workflows: s.workflows.filter((w) => w.id !== id),
        executions: s.executions.filter((e) => e.workflowId !== id),
      }))
      return true
    }, 200)
  },

  restoreVersion(id: string, version: number) {
    return request(() => {
      let restored: Workflow | null = null
      db.set((s) => ({
        workflows: s.workflows.map((w) => {
          if (w.id !== id) return w
          const next = w.version + 1
          restored = {
            ...w,
            version: next,
            updatedAt: new Date().toISOString(),
            versions: [
              {
                id: `${w.id}_v${next}`,
                version: next,
                createdAt: new Date().toISOString(),
                authorId: CURRENT_USER_ID,
                status: 'draft',
                message: `Restored version ${version}`,
                changes: [`Reverted to the state of version ${version}`],
                nodeCount: w.nodes.length,
                edgeCount: w.edges.length,
              },
              ...w.versions,
            ],
          }
          return restored
        }),
      }))
      return restored
    }, 380)
  },

  /* ---- comments ---- */

  getComments(workflowId: string) {
    return request(() => db.get().comments.filter((c) => c.workflowId === workflowId), 60)
  },

  addComment(input: { workflowId: string; nodeId?: string; body: string }) {
    return request(() => {
      const comment: Comment = {
        id: uid('cmt'),
        workflowId: input.workflowId,
        nodeId: input.nodeId,
        authorId: CURRENT_USER_ID,
        body: input.body,
        createdAt: new Date().toISOString(),
        resolved: false,
        replies: [],
      }
      db.set((s) => ({ comments: [...s.comments, comment] }))
      return comment
    }, 140)
  },

  replyToComment(commentId: string, body: string) {
    return request(() => {
      db.set((s) => ({
        comments: s.comments.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: [
                  ...c.replies,
                  {
                    id: uid('rep'),
                    authorId: CURRENT_USER_ID,
                    body,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : c,
        ),
      }))
      return true
    }, 140)
  },

  toggleCommentResolved(commentId: string) {
    return request(() => {
      db.set((s) => ({
        comments: s.comments.map((c) =>
          c.id === commentId ? { ...c, resolved: !c.resolved } : c,
        ),
      }))
      return true
    }, 90)
  },

  deleteComment(commentId: string) {
    return request(() => {
      db.set((s) => ({ comments: s.comments.filter((c) => c.id !== commentId) }))
      return true
    }, 90)
  },
}

