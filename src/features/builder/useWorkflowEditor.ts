import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { getNodeDefinition, isCanvasPrimitive } from '@/nodes/catalog'
import { createNode, workflowService } from '@/services/workflow.service'
import { validateWorkflow } from '@/lib/validation'
import { uid } from '@/lib/utils'
import {
  cloneSnapshot,
  fromCanvasEdges,
  fromCanvasNodes,
  isValidConnection,
  toCanvasEdges,
  toCanvasNodes,
  workflowSignature,
  type AppEdge,
  type AppEdgeData,
  type AppNode,
  type Snapshot,
} from './graph'
import type { NodeType, WorkflowNodeData } from '@/types/node'
import type { SaveState, Workflow } from '@/types/workflow'

const HISTORY_LIMIT = 60
const AUTOSAVE_MS = 700

export function useWorkflowEditor(workflow: Workflow) {
  const [nodes, setNodes] = useState<AppNode[]>(() => toCanvasNodes(workflow.nodes))
  const [edges, setEdges] = useState<AppEdge[]>(() => toCanvasEdges(workflow.edges))
  const [saveState, setSaveState] = useState<SaveState>('saved')

  const past = useRef<Snapshot[]>([])
  const future = useRef<Snapshot[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)

  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  const clipboard = useRef<Snapshot | null>(null)
  const savedSignature = useRef(workflowSignature(workflow))
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  /** Blocks autosave while the execution engine mutates node status. */
  const runtimeWrite = useRef(false)

  /* ---------------------------------------------------------------- *
   * History
   * ---------------------------------------------------------------- */

  const commit = useCallback(() => {
    past.current.push(
      cloneSnapshot({ nodes: nodesRef.current, edges: edgesRef.current }),
    )
    if (past.current.length > HISTORY_LIMIT) past.current.shift()
    future.current = []
    setHistoryVersion((v) => v + 1)
  }, [])

  const undo = useCallback(() => {
    const previous = past.current.pop()
    if (!previous) return
    future.current.push(
      cloneSnapshot({ nodes: nodesRef.current, edges: edgesRef.current }),
    )
    setNodes(previous.nodes)
    setEdges(previous.edges)
    setHistoryVersion((v) => v + 1)
  }, [])

  const redo = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    past.current.push(
      cloneSnapshot({ nodes: nodesRef.current, edges: edgesRef.current }),
    )
    setNodes(next.nodes)
    setEdges(next.edges)
    setHistoryVersion((v) => v + 1)
  }, [])

  const canUndo = past.current.length > 0
  const canRedo = future.current.length > 0

  /* ---------------------------------------------------------------- *
   * React Flow handlers
   * ---------------------------------------------------------------- */

  const onNodesChange = useCallback((changes: NodeChange<AppNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange<AppEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current))
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection, edgesRef.current, nodesRef.current)) return
      commit()
      const source = nodesRef.current.find((n) => n.id === connection.source)
      const def = source ? getNodeDefinition(source.type ?? '') : null
      const handle = def?.outputHandles.find(
        (h) => h.id === (connection.sourceHandle ?? 'out'),
      )
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            id: uid('e'),
            type: 'flow',
            data: {
              kind: (connection.sourceHandle ?? 'out') === 'out' ? 'default' : 'branch',
              branchLabel: handle?.label,
              state: 'idle',
            },
          },
          current,
        ),
      )
    },
    [commit],
  )

  /* ---------------------------------------------------------------- *
   * Mutations
   * ---------------------------------------------------------------- */

  const addNode = useCallback(
    (
      type: NodeType,
      position: { x: number; y: number },
      options: { connectFrom?: string; sourceHandle?: string; select?: boolean } = {},
    ) => {
      commit()
      const node = createNode(type, position)
      const canvasNode: AppNode = {
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        selected: options.select ?? true,
        ...(node.width ? { width: node.width } : {}),
        ...(node.height ? { height: node.height } : {}),
        ...(node.type === 'canvas.note' ? { zIndex: -1 } : {}),
      }
      setNodes((current) => [
        ...current.map((n) => (n.selected ? { ...n, selected: false } : n)),
        canvasNode,
      ])
      if (options.connectFrom) {
        setEdges((current) => [
          ...current,
          {
            id: uid('e'),
            source: options.connectFrom!,
            target: node.id,
            sourceHandle: options.sourceHandle ?? 'out',
            targetHandle: 'in',
            type: 'flow',
            data: {
              kind: (options.sourceHandle ?? 'out') === 'out' ? 'default' : 'branch',
              state: 'idle',
            },
          },
        ])
      }
      return node.id
    },
    [commit],
  )

  const updateNodeData = useCallback(
    (id: string, patch: Partial<WorkflowNodeData>, options: { history?: boolean } = {}) => {
      if (options.history !== false) commit()
      setNodes((current) =>
        current.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      )
    },
    [commit],
  )

  /** Runtime-only write: skips history and does not mark the doc dirty. */
  const setNodeRuntimeStatus = useCallback(
    (id: string, status: WorkflowNodeData['status']) => {
      runtimeWrite.current = true
      setNodes((current) =>
        current.map((n) => (n.id === id ? { ...n, data: { ...n.data, status } } : n)),
      )
    },
    [],
  )

  const setEdgeRuntimeState = useCallback(
    (id: string, state: NonNullable<AppEdgeData['state']>) => {
      runtimeWrite.current = true
      setEdges((current) =>
        current.map((e) => (e.id === id ? { ...e, data: { ...e.data, state } } : e)),
      )
    },
    [],
  )

  const resetRuntime = useCallback(() => {
    runtimeWrite.current = true
    setNodes((current) =>
      current.map((n) =>
        n.data.status && n.data.status !== 'configured'
          ? { ...n, data: { ...n.data, status: 'configured' } }
          : n,
      ),
    )
    setEdges((current) =>
      current.map((e) =>
        e.data?.state && e.data.state !== 'idle'
          ? { ...e, data: { ...e.data, state: 'idle' } }
          : e,
      ),
    )
  }, [])

  const deleteNodes = useCallback(
    (ids: string[]) => {
      if (!ids.length) return
      commit()
      const set = new Set(ids)
      setNodes((current) => current.filter((n) => !set.has(n.id)))
      setEdges((current) =>
        current.filter((e) => !set.has(e.source) && !set.has(e.target)),
      )
    },
    [commit],
  )

  const deleteEdges = useCallback(
    (ids: string[]) => {
      if (!ids.length) return
      commit()
      const set = new Set(ids)
      setEdges((current) => current.filter((e) => !set.has(e.id)))
    },
    [commit],
  )

  const duplicateNodes = useCallback(
    (ids: string[]) => {
      if (!ids.length) return []
      commit()
      const set = new Set(ids)
      const source = nodesRef.current.filter((n) => set.has(n.id))
      const idMap = new Map<string, string>()
      const copies = source.map((n) => {
        const id = uid('n')
        idMap.set(n.id, id)
        return {
          ...n,
          id,
          position: { x: n.position.x + 48, y: n.position.y + 48 },
          selected: true,
          data: { ...n.data, config: { ...n.data.config } },
        }
      })
      const innerEdges = edgesRef.current
        .filter((e) => set.has(e.source) && set.has(e.target))
        .map((e) => ({
          ...e,
          id: uid('e'),
          source: idMap.get(e.source)!,
          target: idMap.get(e.target)!,
        }))
      setNodes((current) => [
        ...current.map((n) => (n.selected ? { ...n, selected: false } : n)),
        ...copies,
      ])
      setEdges((current) => [...current, ...innerEdges])
      return copies.map((c) => c.id)
    },
    [commit],
  )

  const copySelection = useCallback(() => {
    const selected = nodesRef.current.filter((n) => n.selected)
    if (!selected.length) return 0
    const ids = new Set(selected.map((n) => n.id))
    clipboard.current = cloneSnapshot({
      nodes: selected,
      edges: edgesRef.current.filter((e) => ids.has(e.source) && ids.has(e.target)),
    })
    return selected.length
  }, [])

  const paste = useCallback(() => {
    const buffer = clipboard.current
    if (!buffer?.nodes.length) return 0
    commit()
    const idMap = new Map<string, string>()
    const copies = buffer.nodes.map((n) => {
      const id = uid('n')
      idMap.set(n.id, id)
      return {
        ...n,
        id,
        position: { x: n.position.x + 64, y: n.position.y + 64 },
        selected: true,
        data: { ...n.data, config: { ...n.data.config } },
      }
    })
    const copiedEdges = buffer.edges.map((e) => ({
      ...e,
      id: uid('e'),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }))
    setNodes((current) => [
      ...current.map((n) => (n.selected ? { ...n, selected: false } : n)),
      ...copies,
    ])
    setEdges((current) => [...current, ...copiedEdges])
    return copies.length
  }, [commit])

  const toggleDisabled = useCallback(
    (ids: string[]) => {
      if (!ids.length) return
      commit()
      const set = new Set(ids)
      setNodes((current) =>
        current.map((n) =>
          set.has(n.id) ? { ...n, data: { ...n.data, disabled: !n.data.disabled } } : n,
        ),
      )
    },
    [commit],
  )

  const selectNodes = useCallback((ids: string[], additive = false) => {
    const set = new Set(ids)
    setNodes((current) =>
      current.map((n) => ({
        ...n,
        selected: set.has(n.id) ? true : additive ? n.selected : false,
      })),
    )
  }, [])

  /* ---------------------------------------------------------------- *
   * Derived
   * ---------------------------------------------------------------- */

  const selectedNodes = useMemo(() => nodes.filter((n) => n.selected), [nodes])

  const draftWorkflow = useMemo(
    () => ({
      ...workflow,
      nodes: fromCanvasNodes(nodes),
      edges: fromCanvasEdges(edges),
    }),
    [workflow, nodes, edges],
  )

  const validation = useMemo(() => validateWorkflow(draftWorkflow), [draftWorkflow])

  const stats = useMemo(() => {
    const executable = nodes.filter((n) => !isCanvasPrimitive(n.type ?? ''))
    return {
      nodeCount: executable.length,
      edgeCount: edges.length,
      noteCount: nodes.length - executable.length,
      triggers: executable.filter((n) => (n.type ?? '').startsWith('trigger.')),
    }
  }, [nodes, edges])

  /* ---------------------------------------------------------------- *
   * Persistence
   * ---------------------------------------------------------------- */

  const save = useCallback(
    async (immediate = false) => {
      const payload = {
        nodes: fromCanvasNodes(nodesRef.current),
        edges: fromCanvasEdges(edgesRef.current),
      }
      const signature = workflowSignature(payload)
      if (!immediate && signature === savedSignature.current) return
      setSaveState('saving')
      await workflowService.updateWorkflow(workflow.id, payload)
      savedSignature.current = signature
      setSaveState('saved')
    },
    [workflow.id],
  )

  useEffect(() => {
    if (runtimeWrite.current) {
      runtimeWrite.current = false
      return
    }
    const signature = workflowSignature({
      nodes: fromCanvasNodes(nodes),
      edges: fromCanvasEdges(edges),
    })
    if (signature === savedSignature.current) return

    setSaveState('dirty')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void save(), AUTOSAVE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [nodes, edges, save])

  // Warn before losing unsaved work on a hard navigation.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (saveState === 'dirty' || saveState === 'saving') event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveState])

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
    historyVersion,
    addNode,
    updateNodeData,
    setNodeRuntimeStatus,
    setEdgeRuntimeState,
    resetRuntime,
    deleteNodes,
    deleteEdges,
    duplicateNodes,
    copySelection,
    paste,
    toggleDisabled,
    selectNodes,
    selectedNodes,
    draftWorkflow,
    validation,
    stats,
    saveState,
    save,
  }
}

export type WorkflowEditor = ReturnType<typeof useWorkflowEditor>
