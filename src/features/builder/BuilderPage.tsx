import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ReactFlowProvider,
  useReactFlow,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from '@xyflow/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight,
  Copy,
  MessageCircle,
  Play,
  Plus,
  Rocket,
  ShieldCheck,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { BuilderTopbar } from './BuilderTopbar'
import { BuilderToolbar } from './BuilderToolbar'
import { WorkflowCanvas } from './WorkflowCanvas'
import { NodePicker } from './NodePicker'
import { TestPanel, type TestConfig } from './TestPanel'
import { PublishDialog } from './PublishDialog'
import { MobileBuilder } from './MobileBuilder'
import { BuilderProvider } from './BuilderContext'
import { NodeConfigPanel } from './panels/NodeConfigPanel'
import { WorkflowOverviewPanel } from './panels/WorkflowOverviewPanel'
import { ValidationPanel } from './panels/ValidationPanel'
import { ExecutionPanel } from './panels/ExecutionPanel'
import { VersionHistoryPanel } from './panels/VersionHistoryPanel'
import { NodeCommentsSection } from './panels/NodeCommentsSection'
import { useWorkflowEditor } from './useWorkflowEditor'
import { useExecutionRuntime } from './useExecutionRuntime'
import { nextNodePosition } from './graph'
import { Button, ConfirmDialog, EmptyState, Skeleton } from '@/components/ui'
import { Menu } from '@/components/ui/Menu'
import { useDb } from '@/hooks/useDb'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useRegisterCommands } from '@/app/commandRegistry'
import { useToast } from '@/app/providers/ToastProvider'
import { useSettings, usePermissions } from '@/app/providers/SettingsProvider'
import { workflowService } from '@/services/workflow.service'
import { computeSeries, selectMetrics } from '@/services/analytics.service'
import { cn, modKey } from '@/lib/utils'
import type { DbState } from '@/services/db'
import type { NodeType } from '@/types/node'
import type { ExecutionStep } from '@/types/execution'
import type { Environment, Workflow } from '@/types/workflow'
import type { AppEdge, AppNode } from './graph'

export type PanelMode =
  | 'overview'
  | 'node'
  | 'validation'
  | 'execution'
  | 'versions'
  | 'comments'

export default function BuilderPage() {
  const { id = '' } = useParams()
  const workflow = useDb(
    useCallback((s: DbState) => s.workflows.find((w) => w.id === id) ?? null, [id]),
  )
  const isMobile = useIsMobile()

  if (!workflow) {
    return <BuilderMissing id={id} />
  }

  return (
    <ReactFlowProvider>
      {isMobile ? (
        <MobileBuilder workflow={workflow} />
      ) : (
        <BuilderShell key={workflow.id} workflowId={workflow.id} />
      )}
    </ReactFlowProvider>
  )
}

function BuilderMissing({ id }: { id: string }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setChecking(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (checking) {
    return (
      <div className="flex h-full flex-col">
        <div className="h-14 border-b border-line px-3 py-4">
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex-1 bg-canvas p-6">
          <Skeleton className="h-full w-full rounded-xl opacity-40" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        icon={<ShieldCheck className="size-5" aria-hidden />}
        title="Workflow not found"
        description={`No workflow with the id “${id}” exists in this workspace. It may have been deleted.`}
        action={
          <Button variant="primary" onClick={() => navigate('/workflows')}>
            Back to workflows
          </Button>
        }
      />
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Desktop builder
 * ------------------------------------------------------------------ */

function BuilderShell({ workflowId }: { workflowId: string }) {
  const workflow = useDb(
    useCallback(
      (s: DbState) => s.workflows.find((w) => w.id === workflowId)!,
      [workflowId],
    ),
  )
  const comments = useDb(
    useCallback(
      (s: DbState) => s.comments.filter((c) => c.workflowId === workflowId),
      [workflowId],
    ),
  )
  const metrics = useDb(useCallback((s: DbState) => s.metrics, []))

  const navigate = useNavigate()
  const { toast } = useToast()
  const { settings, update } = useSettings()
  const { readOnly, can } = usePermissions()
  const { fitView, setCenter, getNode } = useReactFlow()

  /**
   * Fitting a wide graph into a 1000px canvas lands around 40% zoom, where
   * node labels stop being readable. When that happens we anchor near the
   * start of the flow at a legible zoom instead — the user can still press F.
   */
  const handleInit = useCallback(
    (instance: ReactFlowInstance<AppNode, AppEdge>) => {
      requestAnimationFrame(() => {
        instance.fitView({ padding: 0.14, maxZoom: 1 })
        window.setTimeout(() => {
          if (instance.getZoom() >= 0.62) return
          const canvasNodes = instance
            .getNodes()
            .filter((n) => !(n.type ?? '').startsWith('canvas.'))
          const anchor = canvasNodes[1] ?? canvasNodes[0]
          if (!anchor) return
          instance.setCenter(anchor.position.x + 126, anchor.position.y + 45, {
            zoom: 0.75,
            duration: 360,
          })
        }, 50)
      })
    },
    [],
  )

  const editor = useWorkflowEditor(workflow)
  const runtime = useExecutionRuntime(editor, workflow)

  const [panel, setPanel] = useState<PanelMode>('overview')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerContext, setPickerContext] = useState<{
    nodeId?: string
    handleId?: string
    position?: { x: number; y: number }
  }>({})
  const [testOpen, setTestOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [paneMenu, setPaneMenu] = useState<{ x: number; y: number; flow: { x: number; y: number } } | null>(null)
  const paneAnchor = useRef<HTMLSpanElement>(null)
  const lastTest = useRef<TestConfig | null>(null)

  /* -------------------- derived -------------------- */

  const selectedNode = useMemo(
    () => editor.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [editor.nodes, selectedNodeId],
  )

  const commentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const comment of comments) {
      if (comment.nodeId && !comment.resolved) {
        counts[comment.nodeId] = (counts[comment.nodeId] ?? 0) + 1
      }
    }
    return counts
  }, [comments])

  const sparkline = useMemo(() => {
    const own = selectMetrics(metrics, { workflowId, days: 14 })
    return computeSeries(own, 14).map((p) => p.total)
  }, [metrics, workflowId])

  const stepForSelected = useMemo(
    () => runtime.runtime.steps.find((s) => s.nodeId === selectedNodeId),
    [runtime.runtime.steps, selectedNodeId],
  )

  /* -------------------- actions -------------------- */

  const focusNode = useCallback(
    (nodeId: string) => {
      const node = getNode(nodeId)
      if (node) {
        setCenter(
          node.position.x + (node.measured?.width ?? 252) / 2,
          node.position.y + (node.measured?.height ?? 90) / 2,
          { zoom: 1.05, duration: 420 },
        )
      }
      editor.selectNodes([nodeId])
      setSelectedNodeId(nodeId)
      setPanel('node')
    },
    [editor, getNode, setCenter],
  )

  const openPicker = useCallback(
    (context: typeof pickerContext = {}) => {
      if (readOnly) return
      setPickerContext(context)
      setPickerOpen(true)
    },
    [readOnly],
  )

  const handlePick = useCallback(
    (type: NodeType) => {
      const base =
        pickerContext.position ??
        (pickerContext.nodeId
          ? (() => {
              const source = editor.nodes.find((n) => n.id === pickerContext.nodeId)
              return source
                ? { x: source.position.x + 340, y: source.position.y }
                : nextNodePosition(editor.nodes)
            })()
          : nextNodePosition(editor.nodes))

      const id = editor.addNode(type, base, {
        connectFrom: pickerContext.nodeId,
        sourceHandle: pickerContext.handleId,
      })
      setSelectedNodeId(id)
      setPanel('node')
      setPickerContext({})
    },
    [editor, pickerContext],
  )

  const addNote = useCallback(() => {
    if (readOnly) return
    const position = nextNodePosition(editor.nodes)
    editor.addNode('canvas.note', { x: position.x, y: position.y + 200 })
  }, [editor, readOnly])

  const runTest = useCallback(
    async (config: TestConfig) => {
      lastTest.current = config
      setPanel('execution')
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
          execution.status === 'success'
            ? 'Execution completed'
            : execution.status === 'cancelled'
              ? 'Execution cancelled'
              : 'Execution failed',
        description:
          execution.status === 'success'
            ? `${execution.steps.length} steps finished cleanly.`
            : (execution.error?.message ?? 'The run stopped early.'),
        action: {
          label: 'Open run',
          onClick: () => navigate(`/runs/${execution.id}`),
        },
      })
    },
    [runtime, workflow.environment, toast, navigate],
  )

  const rerun = useCallback(() => {
    if (lastTest.current) void runTest(lastTest.current)
    else setTestOpen(true)
  }, [runTest])

  const runFrom = useCallback(
    (nodeId: string) => {
      void runTest({
        input: lastTest.current?.input ?? {},
        speed: settings.executionSpeed,
        startNodeId: nodeId,
      })
    },
    [runTest, settings.executionSpeed],
  )

  const publish = useCallback(
    async (environment: Environment, message: string) => {
      await editor.save(true)
      await workflowService.publishWorkflow(workflow.id, environment)
      toast({
        tone: 'success',
        title: `Published to ${environment}`,
        description: message,
      })
    },
    [editor, workflow.id, toast],
  )

  const deleteWorkflow = useCallback(async () => {
    await workflowService.deleteWorkflow(workflow.id)
    toast({ tone: 'success', title: 'Workflow deleted' })
    navigate('/workflows')
  }, [workflow.id, toast, navigate])

  const onSelectionChange = useCallback(
    ({ nodes }: OnSelectionChangeParams<AppNode, AppEdge>) => {
      const first = nodes[0]
      setSelectedNodeId(first?.id ?? null)
      setPanel((current) => {
        if (first && current !== 'execution') return 'node'
        if (!first && current === 'node') return 'overview'
        return current
      })
    },
    [],
  )

  /* -------------------- shortcuts -------------------- */

  const selectedIds = useMemo(
    () => editor.selectedNodes.map((n) => n.id),
    [editor.selectedNodes],
  )

  useShortcuts([
    {
      key: 's',
      mod: true,
      allowInInput: true,
      handler: () => {
        void editor.save(true)
        toast({ tone: 'success', title: 'Workflow saved' })
      },
    },
    { key: 'z', mod: true, handler: editor.undo },
    { key: 'z', mod: true, shift: true, handler: editor.redo },
    {
      key: 'c',
      mod: true,
      handler: () => {
        const count = editor.copySelection()
        if (count) toast({ tone: 'info', title: `${count} node${count > 1 ? 's' : ''} copied` })
      },
    },
    {
      key: 'v',
      mod: true,
      handler: () => {
        const count = editor.paste()
        if (count) toast({ tone: 'success', title: `${count} node${count > 1 ? 's' : ''} pasted` })
      },
    },
    { key: 'd', mod: true, handler: () => editor.duplicateNodes(selectedIds) },
    { key: 'delete', handler: () => editor.deleteNodes(selectedIds) },
    { key: 'backspace', handler: () => editor.deleteNodes(selectedIds) },
    { key: 'n', handler: () => openPicker() },
    { key: 'r', handler: () => setTestOpen(true) },
    { key: 'f', handler: () => fitView({ padding: 0.28, duration: 320 }) },
    { key: 'm', handler: () => update({ showMinimap: !settings.showMinimap }) },
    {
      key: 'escape',
      preventDefault: false,
      handler: () => {
        setPickerOpen(false)
        setPaneMenu(null)
      },
    },
  ], !readOnly)

  useRegisterCommands(
    () => [
      {
        id: 'builder-add-node',
        label: 'Add node',
        group: 'Canvas',
        icon: <Plus className="size-3.5" />,
        shortcut: 'N',
        run: () => openPicker(),
      },
      {
        id: 'builder-run',
        label: 'Run a test',
        group: 'Canvas',
        icon: <Play className="size-3.5" />,
        shortcut: 'R',
        run: () => setTestOpen(true),
      },
      {
        id: 'builder-publish',
        label: 'Publish workflow',
        group: 'Canvas',
        icon: <Rocket className="size-3.5" />,
        run: () => setPublishOpen(true),
      },
      {
        id: 'builder-fit',
        label: 'Fit canvas',
        group: 'Canvas',
        shortcut: 'F',
        run: () => fitView({ padding: 0.28, duration: 320 }),
      },
      {
        id: 'builder-note',
        label: 'Add sticky note',
        group: 'Canvas',
        icon: <StickyNote className="size-3.5" />,
        run: addNote,
      },
      {
        id: 'builder-validate',
        label: 'Validate workflow',
        group: 'Canvas',
        icon: <ShieldCheck className="size-3.5" />,
        run: () => setPanel('validation'),
      },
    ],
    [openPicker, fitView, addNote],
  )

  /* -------------------- render -------------------- */

  const builderValue = useMemo(
    () => ({
      readOnly,
      commentCounts,
      isRunning: runtime.isRunning,
      openConfig: (nodeId: string) => {
        editor.selectNodes([nodeId])
        setSelectedNodeId(nodeId)
        setPanel('node')
      },
      duplicateNode: (nodeId: string) => editor.duplicateNodes([nodeId]),
      deleteNode: (nodeId: string) => editor.deleteNodes([nodeId]),
      toggleDisabled: (nodeId: string) => editor.toggleDisabled([nodeId]),
      runFrom,
      addFromHandle: (nodeId: string, handleId: string) =>
        openPicker({ nodeId, handleId }),
      openComments: (nodeId: string) => {
        editor.selectNodes([nodeId])
        setSelectedNodeId(nodeId)
        setPanel('node')
      },
      renameNode: (nodeId: string) => {
        editor.selectNodes([nodeId])
        setSelectedNodeId(nodeId)
        setPanel('node')
      },
      patchNode: (nodeId: string, patch: Record<string, unknown>) =>
        editor.updateNodeData(nodeId, patch),
    }),
    [readOnly, commentCounts, runtime.isRunning, editor, runFrom, openPicker],
  )

  return (
    <BuilderProvider value={builderValue}>
      <div className="flex h-full min-h-0 flex-col">
        <BuilderTopbar
          workflow={workflow}
          saveState={editor.saveState}
          readOnly={readOnly}
          canPublish={can('publish')}
          isRunning={runtime.isRunning}
          errorCount={editor.validation.errorCount}
          onRename={(name) => workflowService.updateWorkflow(workflow.id, { name })}
          onTest={() => setTestOpen(true)}
          onPublish={() => setPublishOpen(true)}
          onTogglePause={() =>
            workflowService.setStatus(
              workflow.id,
              workflow.status === 'paused' ? 'published' : 'paused',
            )
          }
          onDuplicate={async () => {
            const copy = await workflowService.duplicateWorkflow(workflow.id)
            if (copy) navigate(`/workflows/${copy.id}`)
          }}
          onDelete={() => setDeleteOpen(true)}
          onOpenVersions={() => setPanel('versions')}
          onEnvironmentChange={(environment) =>
            workflowService.updateWorkflow(workflow.id, { environment })
          }
        />

        <BuilderToolbar
          onAddNode={() => openPicker()}
          onAddNote={addNote}
          canUndo={editor.canUndo}
          canRedo={editor.canRedo}
          onUndo={editor.undo}
          onRedo={editor.redo}
          showMinimap={settings.showMinimap}
          onToggleMinimap={() => update({ showMinimap: !settings.showMinimap })}
          validation={editor.validation}
          panel={panel}
          onPanelChange={setPanel}
          readOnly={readOnly}
          commentCount={comments.filter((c) => !c.resolved).length}
        />

        <div className="relative flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1">
            <WorkflowCanvas
              editor={editor}
              readOnly={readOnly}
              showMinimap={settings.showMinimap}
              onSelectionChange={onSelectionChange}
              onInit={handleInit}
              onPaneContextMenu={(event, flow) =>
                setPaneMenu({ x: event.clientX, y: event.clientY, flow })
              }
            />

            <NodePicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              onPick={handlePick}
              contextLabel={
                pickerContext.nodeId
                  ? editor.nodes.find((n) => n.id === pickerContext.nodeId)?.data.label
                  : undefined
              }
            />

            {editor.stats.nodeCount === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="pointer-events-auto max-w-xs">
                  <EmptyState
                    icon={<Plus className="size-5" aria-hidden />}
                    title="Start with a trigger"
                    description="Every workflow begins with an event. Add one to get going."
                    action={
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => openPicker()}
                        disabled={readOnly}
                      >
                        Add node
                      </Button>
                    }
                    className="border-line bg-surface/90 backdrop-blur"
                  />
                </div>
              </div>
            )}
          </div>

          {/* right panel */}
          <AnimatePresence initial={false}>
            <motion.aside
              key="right-panel"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 348, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              className="relative hidden shrink-0 overflow-hidden border-l border-line bg-surface lg:block"
              aria-label="Context panel"
            >
              <div className="absolute inset-0 flex w-[348px] flex-col overflow-hidden">
                <PanelBody
                  panel={panel}
                  workflow={workflow}
                  editor={editor}
                  runtime={runtime}
                  selectedNode={selectedNode}
                  stepForSelected={stepForSelected}
                  sparkline={sparkline}
                  readOnly={readOnly}
                  onFocusNode={focusNode}
                  onOpenTest={() => setTestOpen(true)}
                  onRerun={rerun}
                  onRunFrom={runFrom}
                  onPanelChange={setPanel}
                />
              </div>
            </motion.aside>
          </AnimatePresence>
        </div>
      </div>

      {/* pane context menu */}
      <span
        ref={paneAnchor}
        style={{
          position: 'fixed',
          left: paneMenu?.x ?? -1000,
          top: paneMenu?.y ?? -1000,
          width: 1,
          height: 1,
        }}
        aria-hidden
      />
      <Menu
        open={Boolean(paneMenu)}
        anchorRef={paneAnchor}
        onClose={() => setPaneMenu(null)}
        placement="bottom-start"
        ariaLabel="Canvas actions"
        items={[
          {
            id: 'add',
            label: 'Add node here',
            icon: <Plus className="size-3.5" />,
            disabled: readOnly,
            onSelect: () => openPicker({ position: paneMenu?.flow }),
          },
          {
            id: 'note',
            label: 'Add sticky note',
            icon: <StickyNote className="size-3.5" />,
            disabled: readOnly,
            onSelect: () => {
              if (paneMenu) editor.addNode('canvas.note', paneMenu.flow)
            },
          },
          {
            id: 'paste',
            label: 'Paste',
            icon: <Copy className="size-3.5" />,
            shortcut: `${modKey()} V`,
            disabled: readOnly,
            separated: true,
            onSelect: () => editor.paste(),
          },
          {
            id: 'fit',
            label: 'Fit view',
            shortcut: 'F',
            onSelect: () => fitView({ padding: 0.28, duration: 320 }),
          },
          {
            id: 'comments',
            label: 'Workflow comments',
            icon: <MessageCircle className="size-3.5" />,
            onSelect: () => setPanel('comments'),
          },
          {
            id: 'clear',
            label: 'Delete selection',
            icon: <Trash2 className="size-3.5" />,
            tone: 'danger',
            separated: true,
            disabled: readOnly || selectedIds.length === 0,
            onSelect: () => editor.deleteNodes(selectedIds),
          },
        ]}
      />

      <TestPanel
        open={testOpen}
        onClose={() => setTestOpen(false)}
        onRun={runTest}
        nodes={editor.nodes}
        selectedNodeId={selectedNodeId ?? undefined}
        defaultSpeed={settings.executionSpeed}
      />

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublish={publish}
        workflow={editor.draftWorkflow}
        validation={editor.validation}
        onFocusIssue={focusNode}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteWorkflow}
        title={`Delete “${workflow.name}”?`}
        description="The workflow and its run history are removed permanently."
        confirmLabel="Delete workflow"
      />
    </BuilderProvider>
  )
}

/* ------------------------------------------------------------------ *
 * Right panel router
 * ------------------------------------------------------------------ */

function PanelBody({
  panel,
  workflow,
  editor,
  runtime,
  selectedNode,
  stepForSelected,
  sparkline,
  readOnly,
  onFocusNode,
  onOpenTest,
  onRerun,
  onRunFrom,
  onPanelChange,
}: {
  panel: PanelMode
  workflow: Workflow
  editor: ReturnType<typeof useWorkflowEditor>
  runtime: ReturnType<typeof useExecutionRuntime>
  selectedNode: AppNode | null
  stepForSelected: ExecutionStep | undefined
  sparkline: number[]
  readOnly: boolean
  onFocusNode: (id: string) => void
  onOpenTest: () => void
  onRerun: () => void
  onRunFrom: (nodeId: string) => void
  onPanelChange: (panel: PanelMode) => void
}) {
  if (panel === 'node' && selectedNode) {
    return (
      <>
        <PanelBackButton label="Workflow overview" onClick={() => onPanelChange('overview')} />
        <div className="min-h-0 flex-1 overflow-hidden">
          <NodeConfigPanel
            node={selectedNode}
            workflow={editor.draftWorkflow}
            step={stepForSelected}
            readOnly={readOnly}
            isRunning={runtime.isRunning}
            onChange={(patch) => editor.updateNodeData(selectedNode.id, patch)}
            onDelete={() => {
              editor.deleteNodes([selectedNode.id])
              onPanelChange('overview')
            }}
            onRunFrom={() => onRunFrom(selectedNode.id)}
          />
        </div>
      </>
    )
  }

  if (panel === 'execution') {
    return (
      <>
        <PanelBackButton label="Workflow overview" onClick={() => onPanelChange('overview')} />
        <div className="min-h-0 flex-1 overflow-hidden">
          <ExecutionPanel
            runtime={runtime.runtime}
            execution={runtime.lastExecution}
            onFocusNode={onFocusNode}
            onRerun={onRerun}
            onCancel={runtime.cancel}
            onOpenTest={onOpenTest}
          />
        </div>
      </>
    )
  }

  if (panel === 'validation') {
    return (
      <>
        <PanelBackButton label="Workflow overview" onClick={() => onPanelChange('overview')} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ValidationPanel validation={editor.validation} onFocusNode={onFocusNode} />
        </div>
      </>
    )
  }

  if (panel === 'versions') {
    return (
      <>
        <PanelBackButton label="Workflow overview" onClick={() => onPanelChange('overview')} />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <VersionHistoryPanel workflow={workflow} readOnly={readOnly} />
        </div>
      </>
    )
  }

  if (panel === 'comments') {
    return (
      <>
        <PanelBackButton label="Workflow overview" onClick={() => onPanelChange('overview')} />
        <div className="min-h-0 flex-1 overflow-hidden">
          <NodeCommentsSection workflowId={workflow.id} />
        </div>
      </>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <WorkflowOverviewPanel
        workflow={workflow}
        nodes={editor.nodes}
        edgeCount={editor.stats.edgeCount}
        noteCount={editor.stats.noteCount}
        sparkline={sparkline}
        onSelectNode={onFocusNode}
      />
    </div>
  )
}

function PanelBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1 border-b border-line px-3 py-1.5 text-[11px] text-ink-faint transition-colors hover:text-ink',
      )}
    >
      <ChevronRight className="size-3 rotate-180" aria-hidden />
      {label}
    </button>
  )
}
