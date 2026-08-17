import { Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'
import { ShortcutsDialog } from './ShortcutsDialog'
import { useUi } from '@/app/providers/UiProvider'
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts'

export function AppShell() {
  const { mobileNavOpen, setMobileNavOpen } = useUi()
  useGlobalShortcuts()

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-bg">
      {/* Desktop rail */}
      <div className="hidden shrink-0 md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-drawer md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="absolute inset-0 bg-[rgb(var(--scrim)/0.6)]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              className="absolute inset-y-0 left-0"
            >
              <Sidebar forceExpanded onNavigate={() => setMobileNavOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>

      <CommandPalette />
      <ShortcutsDialog />
    </div>
  )
}

/** Standard scrollable page body used by every route except the builder. */
export function PageBody({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <main className={`min-h-0 flex-1 overflow-y-auto ${className}`}>
      <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
        {children}
      </div>
    </main>
  )
}
