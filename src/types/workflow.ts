import type { WorkflowNode } from './node'

export type WorkflowStatus = 'draft' | 'published' | 'paused' | 'archived'

export type Environment = 'development' | 'staging' | 'production'

export type EdgeKind = 'default' | 'branch'

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  kind?: EdgeKind
  label?: string
  /** Transient execution highlight — never persisted. */
  active?: boolean
  animated?: boolean
}

export interface WorkflowVersion {
  id: string
  version: number
  createdAt: string
  authorId: string
  status: 'draft' | 'published'
  message: string
  changes: string[]
  nodeCount: number
  edgeCount: number
}

export interface Workflow {
  id: string
  workspaceId: string
  name: string
  description: string
  status: WorkflowStatus
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  ownerId: string
  environment: Environment
  version: number
  tags: string[]
  /** Denormalised run statistics — recomputed from executions. */
  stats: {
    runs: number
    successRate: number
    avgDurationMs: number
    lastRunAt: string | null
    lastRunStatus: 'success' | 'failed' | 'running' | null
  }
  versions: WorkflowVersion[]
  viewport?: { x: number; y: number; zoom: number }
  createdAt: string
  updatedAt: string
  templateId?: string
}

export interface WorkflowSummary
  extends Omit<Workflow, 'nodes' | 'edges' | 'versions'> {
  nodeCount: number
}

/** ── validation ─────────────────────────────────────────────── */

export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  id: string
  severity: IssueSeverity
  nodeId?: string
  edgeId?: string
  title: string
  detail: string
  /** Machine-readable rule id, useful once a real API validates too. */
  rule: string
}

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  errorCount: number
  warningCount: number
}

/** ── collaboration ──────────────────────────────────────────── */

export interface CommentReply {
  id: string
  authorId: string
  body: string
  createdAt: string
}

export interface Comment {
  id: string
  workflowId: string
  nodeId?: string
  authorId: string
  body: string
  createdAt: string
  resolved: boolean
  replies: CommentReply[]
}

export type SaveState = 'saved' | 'saving' | 'dirty' | 'error'
