import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useDb } from '@/hooks/useDb'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { StorageKeys } from '@/lib/storage'
import { CURRENT_USER_ID } from '@/data/users'
import type { User, Workspace } from '@/types/workspace'

interface WorkspaceContextValue {
  workspaces: Workspace[]
  workspace: Workspace
  setWorkspaceId: (id: string) => void
  currentUser: User
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

const selectWorkspaces = (s: { workspaces: Workspace[] }) => s.workspaces
const selectUsers = (s: { users: User[] }) => s.users

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const workspaces = useDb(selectWorkspaces)
  const users = useDb(selectUsers)
  const [workspaceId, setWorkspaceId] = useLocalStorage(
    StorageKeys.activeWorkspace,
    'ws_acme',
  )

  const workspace = useMemo(
    () => workspaces.find((w) => w.id === workspaceId) ?? workspaces[0],
    [workspaces, workspaceId],
  )

  // A deleted workspace must not leave the app pointing at nothing.
  useEffect(() => {
    if (workspace && workspace.id !== workspaceId) setWorkspaceId(workspace.id)
  }, [workspace, workspaceId, setWorkspaceId])

  const currentUser = useMemo(
    () => users.find((u) => u.id === CURRENT_USER_ID) ?? users[0],
    [users],
  )

  const value = useMemo(
    () => ({ workspaces, workspace, setWorkspaceId, currentUser }),
    [workspaces, workspace, setWorkspaceId, currentUser],
  )

  if (!workspace) return null

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>')
  return ctx
}
