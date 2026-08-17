import { db, request } from './db'
import { runWorkflow, type RunOptions } from '@/engine/engine'
import { applyStats } from '@/data/executions'
import type { Execution, ExecutionStatus } from '@/types/execution'

export interface RunFilter {
  workspaceId?: string
  workflowId?: string
  status?: ExecutionStatus | 'all'
  query?: string
  limit?: number
}

export function filterRuns(items: Execution[], filter: RunFilter) {
  const q = filter.query?.trim().toLowerCase() ?? ''
  const filtered = items.filter((e) => {
    if (filter.workspaceId && e.workspaceId !== filter.workspaceId) return false
    if (filter.workflowId && e.workflowId !== filter.workflowId) return false
    if (filter.status && filter.status !== 'all' && e.status !== filter.status) return false
    if (!q) return true
    return (
      e.id.toLowerCase().includes(q) ||
      e.workflowName.toLowerCase().includes(q) ||
      e.triggerSource.includes(q)
    )
  })
  return filter.limit ? filtered.slice(0, filter.limit) : filtered
}

function persistExecution(execution: Execution) {
  db.set((s) => {
    const executions = [execution, ...s.executions]
    return { executions, workflows: applyStats(s.workflows, executions, s.metrics) }
  })
}

export const executionService = {
  getRuns(filter: RunFilter = {}) {
    return request(() => filterRuns(db.get().executions, filter))
  },

  getRun(id: string) {
    return request(() => db.get().executions.find((e) => e.id === id) ?? null, 60)
  },

  /**
   * Drives the mock engine. The caller receives streamed events for the
   * canvas animation; the finished run is written to the history.
   */
  async runWorkflow(options: RunOptions) {
    const execution = await runWorkflow(options)
    // Test runs land in the history too — that is what the product does.
    persistExecution(execution)
    return execution
  },

  /** Re-runs a historical execution with its original input. */
  async retryRun(runId: string, onEvent?: RunOptions['onEvent']) {
    const state = db.get()
    const original = state.executions.find((e) => e.id === runId)
    if (!original) return null
    const workflow = state.workflows.find((w) => w.id === original.workflowId)
    if (!workflow) return null

    return executionService.runWorkflow({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        workspaceId: workflow.workspaceId,
        nodes: workflow.nodes,
        edges: workflow.edges,
      },
      input: original.input,
      speed: 'fast',
      environment: original.environment,
      triggerSource: 'retry',
      retryOf: original.id,
      onEvent,
    })
  },

  cancelRun(id: string) {
    return request(() => {
      db.set((s) => ({
        executions: s.executions.map((e) =>
          e.id === id
            ? { ...e, status: 'cancelled' as const, finishedAt: new Date().toISOString() }
            : e,
        ),
      }))
      return true
    }, 160)
  },
}
