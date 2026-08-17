import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { LayoutGrid, ListFilter, Plus, Rows3, Workflow as WorkflowIcon } from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader } from '@/components/common/PageHeader'
import { WorkflowCard } from './WorkflowCard'
import { WorkflowTable } from './WorkflowTable'
import { CreateWorkflowDialog } from './CreateWorkflowDialog'
import {
  Button,
  CardSkeleton,
  EmptyState,
  SearchInput,
  Segmented,
  Select,
  Tabs,
} from '@/components/ui'
import { useDb } from '@/hooks/useDb'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { usePermissions } from '@/app/providers/SettingsProvider'
import { filterWorkflows, type WorkflowFilter } from '@/services/workflow.service'
import type { DbState } from '@/services/db'
import type { WorkflowStatus } from '@/types/workflow'

const selectWorkflows = (s: DbState) => s.workflows

type StatusTab = WorkflowStatus | 'all'

export default function WorkflowsPage() {
  const all = useDb(selectWorkflows)
  const { workspace } = useWorkspace()
  const { readOnly } = usePermissions()
  const [params, setParams] = useSearchParams()

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusTab>('all')
  const [sort, setSort] = useState<NonNullable<WorkflowFilter['sort']>>('updated')
  const [view, setView] = useLocalStorage<'grid' | 'list'>('flow.workflows.view', 'grid')
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 220)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (params.get('new') === '1') {
      setCreateOpen(true)
      params.delete('new')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  const scoped = useMemo(
    () => all.filter((w) => w.workspaceId === workspace.id),
    [all, workspace.id],
  )

  const counts = useMemo(
    () => ({
      all: scoped.length,
      published: scoped.filter((w) => w.status === 'published').length,
      draft: scoped.filter((w) => w.status === 'draft').length,
      paused: scoped.filter((w) => w.status === 'paused').length,
      archived: scoped.filter((w) => w.status === 'archived').length,
    }),
    [scoped],
  )

  const results = useMemo(
    () => filterWorkflows(scoped, { query, status, sort }),
    [scoped, query, status, sort],
  )

  return (
    <>
      <Topbar crumbs={[{ label: 'Workflows' }]} />
      <PageBody>
        <PageHeader
          title="Workflows"
          description="Every automation in this workspace, with live run health."
          actions={
            <Button
              variant="primary"
              icon={<Plus className="size-3.5" />}
              onClick={() => setCreateOpen(true)}
              disabled={readOnly}
            >
              New workflow
            </Button>
          }
        />

        <div className="mt-5 space-y-3">
          <Tabs
            items={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'published', label: 'Published', count: counts.published },
              { id: 'draft', label: 'Drafts', count: counts.draft },
              { id: 'paused', label: 'Paused', count: counts.paused },
              { id: 'archived', label: 'Archived', count: counts.archived },
            ]}
            value={status}
            onChange={(value) => setStatus(value as StatusTab)}
            ariaLabel="Filter by status"
            layoutId="workflow-status-tabs"
          />

          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search workflows, tags…"
              className="min-w-[12rem] flex-1 sm:max-w-xs"
            />
            <div className="flex items-center gap-1.5">
              <ListFilter className="size-3.5 text-ink-faint" aria-hidden />
              <Select
                sizeVariant="sm"
                aria-label="Sort workflows"
                value={sort}
                onChange={(e) =>
                  setSort(e.target.value as NonNullable<WorkflowFilter['sort']>)
                }
                className="w-[9.5rem]"
              >
                <option value="updated">Last updated</option>
                <option value="created">Newest</option>
                <option value="name">Name</option>
                <option value="runs">Most runs</option>
                <option value="success">Success rate</option>
              </Select>
            </div>
            <Segmented
              size="sm"
              ariaLabel="View mode"
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', label: '', icon: <LayoutGrid className="size-3.5" /> },
                { value: 'list', label: '', icon: <Rows3 className="size-3.5" /> },
              ]}
            />
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={<WorkflowIcon className="size-5" aria-hidden />}
              title={query ? 'No workflows match your search' : 'No workflows yet'}
              description={
                query
                  ? 'Try a different term, or clear the status filter.'
                  : 'Create your first automation from a blank canvas or a template.'
              }
              action={
                query ? (
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
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<Plus className="size-3.5" />}
                    onClick={() => setCreateOpen(true)}
                    disabled={readOnly}
                  >
                    New workflow
                  </Button>
                )
              }
            />
          ) : view === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((workflow, index) => (
                <WorkflowCard key={workflow.id} workflow={workflow} index={index} />
              ))}
            </div>
          ) : (
            <WorkflowTable workflows={results} />
          )}
        </div>
      </PageBody>

      <CreateWorkflowDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
