import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { History, ListFilter, X } from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader } from '@/components/common/PageHeader'
import { RunTable } from './RunTable'
import {
  Badge,
  Button,
  EmptyState,
  SearchInput,
  Select,
  TableSkeleton,
  Tabs,
} from '@/components/ui'
import { useDb } from '@/hooks/useDb'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { filterRuns } from '@/services/execution.service'
import { formatNumber } from '@/lib/format'
import type { DbState } from '@/services/db'
import type { ExecutionStatus } from '@/types/execution'

const selectState = (s: DbState) => s

const PAGE_SIZE = 25

export default function RunsPage() {
  const state = useDb(selectState)
  const { workspace } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const workflowFilter = params.get('workflow') ?? ''

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ExecutionStatus | 'all'>('all')
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 220)
    return () => clearTimeout(timer)
  }, [])

  const scoped = useMemo(
    () => state.executions.filter((e) => e.workspaceId === workspace.id),
    [state.executions, workspace.id],
  )

  const counts = useMemo(
    () => ({
      all: scoped.length,
      success: scoped.filter((e) => e.status === 'success').length,
      failed: scoped.filter((e) => e.status === 'failed').length,
      running: scoped.filter((e) => e.status === 'running').length,
      cancelled: scoped.filter((e) => e.status === 'cancelled').length,
    }),
    [scoped],
  )

  const results = useMemo(
    () =>
      filterRuns(scoped, {
        query,
        status,
        workflowId: workflowFilter || undefined,
      }),
    [scoped, query, status, workflowFilter],
  )

  const workflow = state.workflows.find((w) => w.id === workflowFilter)

  return (
    <>
      <Topbar crumbs={[{ label: 'Runs' }]} />
      <PageBody>
        <PageHeader
          title="Runs"
          description="Every execution across this workspace, newest first."
          meta={
            counts.running > 0 ? (
              <Badge tone="running" size="xs">
                {counts.running} live
              </Badge>
            ) : undefined
          }
        />

        <div className="mt-5 space-y-3">
          <Tabs
            layoutId="runs-status-tabs"
            items={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'success', label: 'Success', count: counts.success },
              { id: 'failed', label: 'Failed', count: counts.failed },
              { id: 'running', label: 'Running', count: counts.running },
              { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
            ]}
            value={status}
            onChange={(value) => setStatus(value as ExecutionStatus | 'all')}
            ariaLabel="Filter runs by status"
          />

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search by run id or workflow…"
              className="min-w-[12rem] flex-1 sm:max-w-sm"
            />
            <div className="flex items-center gap-1.5">
              <ListFilter className="size-3.5 text-ink-faint" aria-hidden />
              <Select
                sizeVariant="sm"
                aria-label="Filter by workflow"
                value={workflowFilter}
                onChange={(e) => {
                  const next = new URLSearchParams(params)
                  if (e.target.value) next.set('workflow', e.target.value)
                  else next.delete('workflow')
                  setParams(next, { replace: true })
                }}
                className="w-[12rem]"
              >
                <option value="">All workflows</option>
                {state.workflows
                  .filter((w) => w.workspaceId === workspace.id)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </Select>
            </div>
            {workflow && (
              <button
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(params)
                  next.delete('workflow')
                  setParams(next, { replace: true })
                }}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-raised px-2 py-1 text-[11px] text-ink-muted transition-colors hover:text-ink"
              >
                {workflow.name}
                <X className="size-3" aria-hidden />
              </button>
            )}
            <span className="tabular ml-auto text-xs text-ink-faint">
              {formatNumber(results.length)} runs
            </span>
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <TableSkeleton rows={8} />
          ) : results.length === 0 ? (
            <EmptyState
              icon={<History className="size-5" aria-hidden />}
              title={query || status !== 'all' ? 'No runs match these filters' : 'No runs yet'}
              description={
                query || status !== 'all'
                  ? 'Try a different status or clear the search.'
                  : 'Publish a workflow, or run a test from the builder, to see executions here.'
              }
              action={
                (query || status !== 'all') && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setQuery('')
                      setStatus('all')
                    }}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <>
              <RunTable runs={results.slice(0, visible)} showWorkflow={!workflowFilter} />
              {visible < results.length && (
                <div className="mt-3 flex justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    Load {Math.min(PAGE_SIZE, results.length - visible)} more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </PageBody>
    </>
  )
}
