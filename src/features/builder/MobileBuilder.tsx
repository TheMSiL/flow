import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowLeft,
  CircleCheck,
  CircleX,
  Ellipsis,
  LoaderCircle,
  Play,
  Plus,
  Rocket,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { BottomSheet } from '@/components/ui/Drawer'
import { Badge, Button, StatusBadge, Tabs } from '@/components/ui'
import { Menu } from '@/components/ui/Menu'
import { useMenu } from '@/components/ui/useMenu'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { NodePicker } from './NodePicker'
import { TestPanel, type TestConfig } from './TestPanel'
import { NodeConfigPanel } from './panels/NodeConfigPanel'
import { ValidationPanel } from './panels/ValidationPanel'
import { ExecutionPanel } from './panels/ExecutionPanel'
import { BuilderProvider } from './BuilderContext'
import { useWorkflowEditor } from './useWorkflowEditor'
import { useExecutionRuntime } from './useExecutionRuntime'
import { nextNodePosition } from './graph'
import { getNodeDefinition } from '@/nodes/catalog'
import { usePermissions, useSettings } from '@/app/providers/SettingsProvider'
import { useToast } from '@/app/providers/ToastProvider'
import { workflowService } from '@/services/workflow.service'
import { cn } from '@/lib/utils'
import type { Workflow } from '@/types/workflow'
import type { NodeType } from '@/types/node'

type MobileTab = 'flow' | 'runs' | 'issues'

/**
 * Mobile is a review-and-adjust surface, not a miniature canvas: the graph
 * is rendered as an ordered vertical list with the same node semantics,
 * and every detail opens in a bottom sheet.
 */
export function MobileBuilder({ workflow }: { workflow: Workflow }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { settings } = useSettings()
  const { readOnly } = usePermissions()
  const editor = useWorkflowEditor(workflow)
  const runtime = useExecutionRuntime(editor, workflow)
  const menu = useMenu()

  const [tab, setTab] = useState<MobileTab>('flow')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [testOpen, setTestOpen] = useState(false)

  const ordered = useMemo(() => orderNodes(editor), [editor])
  const selected = editor.nodes.find((n) => n.id === selectedId) ?? null

  const runTest = useCallback(
    async (config: TestConfig) => {
      setTab('runs')
      const execution = await runtime.run({
        input: config.input,
        speed: config.speed,
        startNodeId: config.startNodeId,
        failAtNodeId: config.failAtNodeId,
        environment: workflow.environment,
      })
      toast({
        tone: execution.status === 'success' ? 'success' : 'error',
        title:
          execution.status === 'success' ? 'Execution completed' : 'Execution failed',
        description: execution.error?.message,
      })
    },
    [runtime, workflow.environment, toast],
  )

  const addNode = (type: NodeType) => {
    const id = editor.addNode(type, nextNodePosition(editor.nodes))
    setSelectedId(id)
  }

  const builderValue = useMemo(
    () => ({
      readOnly,
      commentCounts: {},
      isRunning: runtime.isRunning,
      openConfig: setSelectedId,
      duplicateNode: (id: string) => editor.duplicateNodes([id]),
      deleteNode: (id: string) => editor.deleteNodes([id]),
      toggleDisabled: (id: string) => editor.toggleDisabled([id]),
      runFrom: (id: string) =>
        void runTest({ input: {}, speed: settings.executionSpeed, startNodeId: id }),
      addFromHandle: () => setPickerOpen(true),
      openComments: setSelectedId,
      renameNode: setSelectedId,
      patchNode: (id: string, patch: Record<string, unknown>) =>
        editor.updateNodeData(id, patch),
    }),
    [readOnly, runtime.isRunning, editor, runTest, settings.executionSpeed],
  )

  return (
    <BuilderProvider value={builderValue}>
      <div className="flex h-full min-h-0 flex-col bg-bg">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-3">
          <Link
            to="/workflows"
            aria-label="Back to workflows"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-ink">{workflow.name}</h1>
            <p className="truncate text-[11px] text-ink-faint">
              {editor.stats.nodeCount} nodes ·{' '}
              {editor.saveState === 'saved' ? 'Saved' : 'Saving…'}
            </p>
          </div>
          <StatusBadge status={workflow.status} size="xs" />
          <button
            ref={menu.anchorRef}
            type="button"
            onClick={menu.toggle}
            aria-label="Workflow actions"
            className="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-raised"
          >
            <Ellipsis className="size-4" aria-hidden />
          </button>
          <Menu
            open={menu.open}
            anchorRef={menu.anchorRef}
            onClose={menu.close}
            ariaLabel="Workflow actions"
            items={[
              {
                id: 'publish',
                label: 'Publish',
                icon: <Rocket className="size-3.5" />,
                disabled: readOnly || !editor.validation.valid,
                onSelect: async () => {
                  await workflowService.publishWorkflow(workflow.id, 'production')
                  toast({ tone: 'success', title: 'Published to production' })
                },
              },
              {
                id: 'runs',
                label: 'Run history',
                onSelect: () => navigate(`/runs?workflow=${workflow.id}`),
              },
              {
                id: 'delete',
                label: 'Delete workflow',
                icon: <Trash2 className="size-3.5" />,
                tone: 'danger',
                separated: true,
                disabled: readOnly,
                onSelect: async () => {
                  await workflowService.deleteWorkflow(workflow.id)
                  navigate('/workflows')
                },
              },
            ]}
          />
        </header>

        <div className="shrink-0 border-b border-line px-3">
          <Tabs
            layoutId="mobile-builder-tabs"
            value={tab}
            onChange={(value) => setTab(value as MobileTab)}
            ariaLabel="Builder sections"
            items={[
              { id: 'flow', label: 'Flow', count: editor.stats.nodeCount },
              { id: 'runs', label: 'Execution', count: runtime.runtime.steps.length },
              {
                id: 'issues',
                label: 'Issues',
                count: editor.validation.issues.length,
              },
            ]}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'flow' && (
            <ol className="space-y-0 p-3">
              <AnimatePresence initial={false}>
                {ordered.map((entry, index) => {
                  const def = getNodeDefinition(entry.node.type ?? '')
                  const status = entry.node.data.status
                  return (
                    <motion.li
                      key={entry.node.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.2 }}
                    >
                      {index > 0 && (
                        <div className="flex items-center gap-2 py-1 pl-6">
                          <ArrowDown className="size-3 text-ink-faint" aria-hidden />
                          {entry.branch && (
                            <Badge
                              size="xs"
                              tone={
                                entry.branch === 'YES' || entry.branch === 'PASS'
                                  ? 'success'
                                  : entry.branch === 'NO' || entry.branch === 'DROP'
                                    ? 'danger'
                                    : 'neutral'
                              }
                            >
                              {entry.branch}
                            </Badge>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedId(entry.node.id)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border bg-surface p-3 text-left transition-colors',
                          status === 'running'
                            ? 'border-state-running/50'
                            : status === 'failed'
                              ? 'border-state-danger/50'
                              : status === 'success'
                                ? 'border-state-success/40'
                                : 'border-line',
                          entry.node.data.disabled && 'opacity-55',
                        )}
                      >
                        <NodeIcon type={entry.node.type ?? ''} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                            {def.category}
                          </span>
                          <span className="block truncate text-[13px] font-medium text-ink">
                            {entry.node.data.label}
                          </span>
                          <span className="block truncate text-[11px] text-ink-faint">
                            {def.description}
                          </span>
                        </span>
                        {status === 'running' && (
                          <LoaderCircle
                            className="size-4 shrink-0 animate-spin text-state-running"
                            aria-label="Running"
                          />
                        )}
                        {status === 'success' && (
                          <CircleCheck
                            className="size-4 shrink-0 text-state-success"
                            aria-label="Succeeded"
                          />
                        )}
                        {status === 'failed' && (
                          <CircleX
                            className="size-4 shrink-0 text-state-danger"
                            aria-label="Failed"
                          />
                        )}
                      </button>
                    </motion.li>
                  )
                })}
              </AnimatePresence>

              <li className="pt-3">
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  disabled={readOnly}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line py-3 text-[13px] text-ink-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-40"
                >
                  <Plus className="size-4" aria-hidden />
                  Add node
                </button>
              </li>
            </ol>
          )}

          {tab === 'runs' && (
            <div className="h-full">
              <ExecutionPanel
                runtime={runtime.runtime}
                execution={runtime.lastExecution}
                onFocusNode={setSelectedId}
                onRerun={() => setTestOpen(true)}
                onCancel={runtime.cancel}
                onOpenTest={() => setTestOpen(true)}
              />
            </div>
          )}

          {tab === 'issues' && (
            <ValidationPanel
              validation={editor.validation}
              onFocusNode={setSelectedId}
            />
          )}
        </div>

        <div
          className="flex shrink-0 gap-2 border-t border-line bg-surface p-3"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <Button
            full
            variant="secondary"
            icon={<Play className="size-3.5" />}
            onClick={() => setTestOpen(true)}
            loading={runtime.isRunning}
          >
            Test
          </Button>
          <Button
            full
            variant="primary"
            icon={<ShieldCheck className="size-3.5" />}
            disabled={readOnly || !editor.validation.valid}
            onClick={async () => {
              await workflowService.publishWorkflow(workflow.id, 'production')
              toast({ tone: 'success', title: 'Published to production' })
            }}
          >
            Publish
          </Button>
        </div>
      </div>

      <BottomSheet
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.data.label}
        subtitle={selected ? getNodeDefinition(selected.type ?? '').description : undefined}
      >
        {selected && (
          <div className="h-[70vh]">
            <NodeConfigPanel
              node={selected}
              workflow={editor.draftWorkflow}
              step={runtime.runtime.steps.find((s) => s.nodeId === selected.id)}
              readOnly={readOnly}
              isRunning={runtime.isRunning}
              onChange={(patch) => editor.updateNodeData(selected.id, patch)}
              onDelete={() => {
                editor.deleteNodes([selected.id])
                setSelectedId(null)
              }}
              onRunFrom={() =>
                void runTest({
                  input: {},
                  speed: settings.executionSpeed,
                  startNodeId: selected.id,
                })
              }
            />
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add node"
      >
        <div className="relative h-[70vh]">
          <NodePicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={addNode}
          />
        </div>
      </BottomSheet>

      <TestPanel
        open={testOpen}
        onClose={() => setTestOpen(false)}
        onRun={runTest}
        nodes={editor.nodes}
        selectedNodeId={selectedId ?? undefined}
        defaultSpeed={settings.executionSpeed}
      />
    </BuilderProvider>
  )
}

/** Depth-first ordering that mirrors the engine's traversal. */
function orderNodes(editor: ReturnType<typeof useWorkflowEditor>) {
  const nodes = editor.nodes.filter((n) => !(n.type ?? '').startsWith('canvas.'))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const entry =
    nodes.find((n) => (n.type ?? '').startsWith('trigger.')) ?? nodes[0]
  if (!entry) return []

  const out: { node: (typeof nodes)[number]; branch?: string }[] = []
  const seen = new Set<string>()
  const walk = (id: string, branch?: string) => {
    if (seen.has(id)) return
    const node = byId.get(id)
    if (!node) return
    seen.add(id)
    out.push({ node, branch })
    for (const edge of editor.edges.filter((e) => e.source === id)) {
      walk(edge.target, edge.data?.branchLabel)
    }
  }
  walk(entry.id)

  // Anything unreachable still needs to be listed and editable.
  for (const node of nodes) if (!seen.has(node.id)) out.push({ node })
  return out
}
