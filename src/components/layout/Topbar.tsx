import { Fragment, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Menu as MenuIcon, Moon, Search, Sun, SunMoon } from 'lucide-react'
import { Menu } from '@/components/ui/Menu'
import { useMenu } from '@/components/ui/useMenu'
import { Avatar } from '@/components/ui/Avatar'
import { Kbd } from '@/components/ui/Badge'
import { NotificationsMenu } from './NotificationsMenu'
import { useUi } from '@/app/providers/UiProvider'
import { useSettings } from '@/app/providers/SettingsProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { cn, modKey } from '@/lib/utils'

export interface Crumb {
  label: string
  to?: string
}

interface TopbarProps {
  crumbs?: Crumb[]
  actions?: ReactNode
  title?: string
}

export function Topbar({ crumbs = [], actions, title }: TopbarProps) {
  const { setMobileNavOpen, setCommandOpen } = useUi()
  const { workspace, currentUser } = useWorkspace()
  const { theme, setTheme } = useSettings()
  const navigate = useNavigate()
  const userMenu = useMenu()

  const trail: Crumb[] = [{ label: workspace.name, to: '/' }, ...crumbs]

  return (
    <header className="sticky top-0 z-header flex h-14 shrink-0 items-center gap-2 border-b border-line bg-bg/85 px-3 backdrop-blur-md sm:px-4">
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation"
        className="-ml-1 flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink md:hidden"
      >
        <MenuIcon className="size-4" aria-hidden />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        {title ? (
          <h1 className="truncate text-sm font-semibold tracking-tight text-ink">
            {title}
          </h1>
        ) : (
          <ol className="flex items-center gap-1 text-[13px]">
            {trail.map((crumb, index) => {
              const last = index === trail.length - 1
              return (
                <Fragment key={`${crumb.label}-${index}`}>
                  {index > 0 && (
                    <ChevronRight
                      className="size-3.5 shrink-0 text-ink-faint"
                      aria-hidden
                    />
                  )}
                  <li className="min-w-0">
                    {crumb.to && !last ? (
                      <Link
                        to={crumb.to}
                        className="block truncate text-ink-faint transition-colors hover:text-ink"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        aria-current={last ? 'page' : undefined}
                        className={cn(
                          'block truncate',
                          last ? 'font-medium text-ink' : 'text-ink-faint',
                        )}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                </Fragment>
              )
            })}
          </ol>
        )}
      </nav>

      <div className="flex items-center gap-1">
        {actions}

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="hidden h-8 items-center gap-2 rounded-md border border-line bg-surface-sunken px-2.5 text-xs text-ink-faint transition-colors hover:border-line-strong hover:text-ink-muted lg:flex"
        >
          <Search className="size-3.5" aria-hidden />
          <span>Search…</span>
          <Kbd className="ml-2">{modKey()}K</Kbd>
        </button>

        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Search"
          className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink lg:hidden"
        >
          <Search className="size-4" aria-hidden />
        </button>

        <NotificationsMenu />

        <button
          ref={userMenu.anchorRef}
          type="button"
          onClick={userMenu.toggle}
          aria-label="Account menu"
          aria-expanded={userMenu.open}
          className="ml-0.5 rounded-full transition-transform hover:scale-105 active:scale-95"
        >
          <Avatar user={currentUser} size="sm" />
        </button>
        <Menu
          open={userMenu.open}
          anchorRef={userMenu.anchorRef}
          onClose={userMenu.close}
          width={216}
          ariaLabel="Account"
          header={
            <div className="flex items-center gap-2.5 pt-1">
              <Avatar user={currentUser} size="md" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">
                  {currentUser.name}
                </p>
                <p className="truncate text-[11px] text-ink-faint">
                  {currentUser.email}
                </p>
              </div>
            </div>
          }
          items={[
            {
              id: 'settings',
              label: 'Settings',
              onSelect: () => navigate('/settings'),
              shortcut: `${modKey()} ,`,
            },
            {
              id: 'members',
              label: 'Members',
              onSelect: () => navigate('/settings/members'),
            },
            {
              id: 'theme',
              label:
                theme === 'dark'
                  ? 'Switch to light'
                  : theme === 'light'
                    ? 'Follow system'
                    : 'Switch to dark',
              icon:
                theme === 'dark' ? (
                  <Sun className="size-3.5" aria-hidden />
                ) : theme === 'light' ? (
                  <SunMoon className="size-3.5" aria-hidden />
                ) : (
                  <Moon className="size-3.5" aria-hidden />
                ),
              onSelect: () =>
                setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'),
              separated: true,
            },
            {
              id: 'help',
              label: 'Help & docs',
              onSelect: () => navigate('/help'),
            },
          ]}
        />
      </div>
    </header>
  )
}
