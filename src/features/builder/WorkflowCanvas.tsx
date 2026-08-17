import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from '@xyflow/react'
import { NODE_DEFINITIONS } from '@/nodes/catalog'
import { CATEGORY_CSS_VAR } from '@/components/nodes/nodeStyles'
import { FlowNode } from './nodes/FlowNode'
import { NoteNode } from './nodes/NoteNode'
import { GroupNode } from './nodes/GroupNode'
import { FlowEdge } from './edges/FlowEdge'
import { CanvasControls } from './CanvasControls'
import { isValidConnection } from './graph'
import { useSettings } from '@/app/providers/SettingsProvider'
import { cn } from '@/lib/utils'
import type { NodeType } from '@/types/node'
import type { AppEdge, AppNode } from './graph'
import type { WorkflowEditor } from './useWorkflowEditor'

/** Every executable kind renders through the same component. */
const nodeTypes = {
  ...Object.fromEntries(NODE_DEFINITIONS.map((def) => [def.type, FlowNode])),
  'canvas.note': NoteNode,
  'canvas.group': GroupNode,
} as const

const edgeTypes = { flow: FlowEdge } as const

const PRO_OPTIONS = { hideAttribution: true }

interface Props {
  editor: WorkflowEditor
  showMinimap: boolean
  readOnly: boolean
  onPaneContextMenu: (event: React.MouseEvent, position: { x: number; y: number }) => void
  onSelectionChange: (params: OnSelectionChangeParams<AppNode, AppEdge>) => void
  onInit?: (instance: ReactFlowInstance<AppNode, AppEdge>) => void
  className?: string
}

export function WorkflowCanvas({
  editor,
  showMinimap,
  readOnly,
  onPaneContextMenu,
  onSelectionChange,
  onInit,
  className,
}: Props) {
  const { settings } = useSettings()
  const { screenToFlowPosition } = useReactFlow()
  const wrapper = useRef<HTMLDivElement>(null)
  const [isDropTarget, setIsDropTarget] = useState(false)

  const validConnection = useCallback(
    (connection: { source?: string | null; target?: string | null; sourceHandle?: string | null }) =>
      isValidConnection(connection, editor.edges, editor.nodes),
    [editor.edges, editor.nodes],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    if (!event.dataTransfer.types.includes('application/flow-node')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDropTarget(true)
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDropTarget(false)
      const type = event.dataTransfer.getData('application/flow-node') as NodeType
      if (!type) return
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      // Drop point is the pointer; offset so the node centres under it.
      editor.addNode(type, { x: position.x - 126, y: position.y - 40 })
    },
    [editor, screenToFlowPosition],
  )

  const minimapNodeColor = useCallback((node: AppNode) => {
    if (node.type === 'canvas.note') return 'rgb(var(--c-warning) / 0.5)'
    const def = NODE_DEFINITIONS.find((d) => d.type === node.type)
    return def ? CATEGORY_CSS_VAR[def.category] : 'rgb(var(--c-line-strong))'
  }, [])

  const defaultEdgeOptions = useMemo(
    () => ({ type: 'flow' as const, data: { state: 'idle' as const } }),
    [],
  )

  return (
    <div
      ref={wrapper}
      className={cn('relative h-full w-full', className)}
      onDragOver={onDragOver}
      onDragLeave={() => setIsDropTarget(false)}
      onDrop={onDrop}
    >
      <ReactFlow<AppNode, AppEdge>
        nodes={editor.nodes}
        edges={editor.edges}
        onNodesChange={editor.onNodesChange}
        onEdgesChange={editor.onEdgesChange}
        onConnect={editor.onConnect}
        onNodeDragStart={editor.commit}
        onSelectionChange={onSelectionChange}
        onPaneContextMenu={(event) => {
          const mouseEvent = event as React.MouseEvent
          mouseEvent.preventDefault()
          onPaneContextMenu(
            mouseEvent,
            screenToFlowPosition({ x: mouseEvent.clientX, y: mouseEvent.clientY }),
          )
        }}
        onInit={onInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        isValidConnection={validConnection}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        // Deletion is handled by our own shortcut so it can push history.
        deleteKeyCode={null}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        selectionKeyCode={null}
        panOnDrag={[1, 2]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        minZoom={0.15}
        maxZoom={2.5}
        snapToGrid={settings.snapToGrid}
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ padding: 0.28, maxZoom: 1 }}
        proOptions={PRO_OPTIONS}
        className="bg-canvas"
        aria-label="Workflow canvas"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.4}
          color="rgb(var(--canvas-dot))"
        />

        {showMinimap && (
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            ariaLabel="Workflow minimap"
            nodeColor={minimapNodeColor}
            nodeStrokeWidth={2}
            nodeBorderRadius={3}
            className="!bottom-4 !right-4 !m-0 overflow-hidden rounded-lg border border-line !bg-surface/90 shadow-lg backdrop-blur-sm"
            style={{ width: 180, height: 118 }}
          />
        )}

        <CanvasControls />
      </ReactFlow>

      {isDropTarget && (
        <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-dashed border-accent/50 bg-accent/[0.03]" />
      )}
    </div>
  )
}
