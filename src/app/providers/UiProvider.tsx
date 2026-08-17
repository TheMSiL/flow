import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { StorageKeys } from '@/lib/storage'

interface UiContextValue {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (value: boolean) => void
  mobileNavOpen: boolean
  setMobileNavOpen: (value: boolean) => void
  commandOpen: boolean
  setCommandOpen: (value: boolean) => void
  toggleCommand: () => void
  shortcutsOpen: boolean
  setShortcutsOpen: (value: boolean) => void
}

const UiContext = createContext<UiContextValue | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(
    StorageKeys.sidebar,
    false,
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const toggleSidebar = useCallback(
    () => setSidebarCollapsed((v) => !v),
    [setSidebarCollapsed],
  )
  const toggleCommand = useCallback(() => setCommandOpen((v) => !v), [])

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
      mobileNavOpen,
      setMobileNavOpen,
      commandOpen,
      setCommandOpen,
      toggleCommand,
      shortcutsOpen,
      setShortcutsOpen,
    }),
    [sidebarCollapsed, toggleSidebar, setSidebarCollapsed, mobileNavOpen, commandOpen, toggleCommand, shortcutsOpen],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>')
  return ctx
}
