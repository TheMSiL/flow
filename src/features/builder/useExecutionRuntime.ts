import { useCallback, useEffect, useRef, useState } from 'react'
import { executionService } from '@/services/execution.service'
import type { EngineEvent } from '@/engine/engine'
import type {
  Execution,
  ExecutionSpeed,
  ExecutionStep,
  LogEntry,
  RuntimeState,
  StepStatus,
} from '@/types/execution'
import type { Environment } from '@/types/workflow'
import type { WorkflowEditor } from './useWorkflowEditor'

const IDLE: RuntimeState = {
  status: 'idle',
  activeNodeIds: [],
  activeEdgeIds: [],
  nodeStatus: {},
  edgeStatus: {},
  steps: [],
  logs: [],
  startedAt: null,
  finishedAt: null,
  error: null,
}

export interface RunRequest {
  input: Record<string, unknown>
  speed: ExecutionSpeed
  startNodeId?: string
  failAtNodeId?: string
  environment: Environment
}

/**
 * Bridges the mock engine to the canvas: engine events become node/edge
 * status writes, a live step list and a streaming log.
 */
export function useExecutionRuntime(
  editor: WorkflowEditor,
  workflow: { id: string; name: string; workspaceId: string },
) {
  const [runtime, setRuntime] = useState<RuntimeState>(IDLE)
  const [lastExecution, setLastExecution] = useState<Execution | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const editorRef = useRef(editor)
  editorRef.current = editor

  useEffect(() => () => abortRef.current?.abort(), [])

  const reset = useCallback(() => {
    setRuntime(IDLE)
    setLastExecution(null)
    editorRef.current.resetRuntime()
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const run = useCallback(
    async (request: RunRequest) => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const ed = editorRef.current
      ed.resetRuntime()

      setRuntime({
        ...IDLE,
        status: 'running',
        startedAt: new Date().toISOString(),
      })

      const onEvent = (event: EngineEvent) => {
        switch (event.type) {
          case 'run:start': {
            const nodeStatus: Record<string, StepStatus> = {}
            for (const id of event.nodeIds) nodeStatus[id] = 'pending'
            setRuntime((r) => ({ ...r, nodeStatus, startedAt: event.startedAt }))
            break
          }
          case 'edge:active': {
            ed.setEdgeRuntimeState(event.edgeId, 'active')
            setRuntime((r) => ({
              ...r,
              activeEdgeIds: [...r.activeEdgeIds, event.edgeId],
              edgeStatus: { ...r.edgeStatus, [event.edgeId]: 'active' },
            }))
            break
          }
          case 'edge:done': {
            ed.setEdgeRuntimeState(event.edgeId, event.skipped ? 'skipped' : 'done')
            setRuntime((r) => ({
              ...r,
              activeEdgeIds: r.activeEdgeIds.filter((id) => id !== event.edgeId),
              edgeStatus: {
                ...r.edgeStatus,
                [event.edgeId]: event.skipped ? 'skipped' : 'done',
              },
            }))
            break
          }
          case 'node:start': {
            ed.setNodeRuntimeStatus(event.nodeId, 'running')
            setRuntime((r) => ({
              ...r,
              activeNodeIds: [...r.activeNodeIds, event.nodeId],
              nodeStatus: { ...r.nodeStatus, [event.nodeId]: 'running' },
              steps: [...r.steps, event.step],
            }))
            break
          }
          case 'node:finish': {
            const status = event.step.status
            ed.setNodeRuntimeStatus(
              event.nodeId,
              status === 'success'
                ? 'success'
                : status === 'failed'
                  ? 'failed'
                  : 'skipped',
            )
            setRuntime((r) => ({
              ...r,
              activeNodeIds: r.activeNodeIds.filter((id) => id !== event.nodeId),
              nodeStatus: { ...r.nodeStatus, [event.nodeId]: status },
              steps: replaceStep(r.steps, event.step),
            }))
            break
          }
          case 'log': {
            setRuntime((r) => ({ ...r, logs: [...r.logs, event.entry as LogEntry] }))
            break
          }
          case 'run:finish': {
            setRuntime((r) => ({
              ...r,
              status: event.execution.status,
              finishedAt: event.execution.finishedAt,
              error: event.execution.error,
              activeNodeIds: [],
              activeEdgeIds: [],
            }))
            break
          }
        }
      }

      const execution = await executionService.runWorkflow({
        workflow: {
          id: workflow.id,
          name: workflow.name,
          workspaceId: workflow.workspaceId,
          nodes: ed.draftWorkflow.nodes,
          edges: ed.draftWorkflow.edges,
        },
        input: request.input,
        speed: request.speed,
        startNodeId: request.startNodeId,
        failAtNodeId: request.failAtNodeId,
        environment: request.environment,
        triggerSource: 'test',
        signal: controller.signal,
        onEvent,
      })

      setLastExecution(execution)
      return execution
    },
    [workflow.id, workflow.name, workflow.workspaceId],
  )

  return { runtime, lastExecution, run, cancel, reset, isRunning: runtime.status === 'running' }
}

function replaceStep(steps: ExecutionStep[], next: ExecutionStep) {
  const index = steps.findIndex((s) => s.id === next.id)
  if (index === -1) return [...steps, next]
  const copy = [...steps]
  copy[index] = next
  return copy
}
