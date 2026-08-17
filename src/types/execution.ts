import type { NodeType } from './node'
import type { Environment } from './workflow'

export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'

export type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'

export type LogLevel = 'info' | 'success' | 'warn' | 'error'

export interface LogEntry {
  id: string
  ts: string
  level: LogLevel
  nodeId?: string
  nodeLabel?: string
  message: string
  data?: Record<string, unknown>
}

export interface ExecutionStep {
  id: string
  nodeId: string
  nodeLabel: string
  nodeType: NodeType
  status: StepStatus
  startedAt: string
  finishedAt: string | null
  durationMs: number
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: ExecutionError | null
  /** Which outgoing handle a condition node resolved to. */
  branch?: string
}

export interface ExecutionError {
  code: string
  title: string
  message: string
  nodeId?: string
  hint?: string
}

export type TriggerSource = 'webhook' | 'schedule' | 'manual' | 'test' | 'retry'

export interface Execution {
  id: string
  workflowId: string
  workflowName: string
  workspaceId: string
  environment: Environment
  status: ExecutionStatus
  startedAt: string
  finishedAt: string | null
  durationMs: number
  triggeredBy: string
  triggerSource: TriggerSource
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: ExecutionError | null
  steps: ExecutionStep[]
  logs: LogEntry[]
  /** Mock cost attribution in USD. */
  cost: number
  retryOf?: string
}

export type ExecutionSpeed = 'normal' | 'fast' | 'instant'

/** Live state pushed by the engine while a simulation runs. */
export interface RuntimeState {
  status: ExecutionStatus | 'idle'
  activeNodeIds: string[]
  activeEdgeIds: string[]
  nodeStatus: Record<string, StepStatus>
  edgeStatus: Record<string, 'active' | 'done' | 'skipped'>
  steps: ExecutionStep[]
  logs: LogEntry[]
  startedAt: string | null
  finishedAt: string | null
  error: ExecutionError | null
}
