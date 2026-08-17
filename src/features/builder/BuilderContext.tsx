import { createContext, useContext, type ReactNode } from 'react'

export interface BuilderContextValue {
  readOnly: boolean
  /** Unresolved comment count keyed by node id. */
  commentCounts: Record<string, number>
  openConfig: (nodeId: string) => void
  duplicateNode: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  toggleDisabled: (nodeId: string) => void
  runFrom: (nodeId: string) => void
  addFromHandle: (nodeId: string, handleId: string) => void
  openComments: (nodeId: string) => void
  renameNode: (nodeId: string) => void
  /** Generic in-canvas data write (note text, group collapse, label). */
  patchNode: (nodeId: string, patch: Record<string, unknown>) => void
  isRunning: boolean
}

const BuilderContext = createContext<BuilderContextValue | null>(null)

export function BuilderProvider({
  value,
  children,
}: {
  value: BuilderContextValue
  children: ReactNode
}) {
  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBuilder() {
  const ctx = useContext(BuilderContext)
  if (!ctx) throw new Error('useBuilder must be used inside <BuilderProvider>')
  return ctx
}
