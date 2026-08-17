import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChartColumn,
  CircleHelp,
  History,
  LayoutDashboard,
  LayoutTemplate,
  PanelLeft,
  Puzzle,
  Settings,
  Workflow,
} from 'lucide-react'
import { LogoMark, Wordmark } from './Logo'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { Tooltip } from '@/components/ui/Tooltip'
import { Avatar } from '@/components/ui/Avatar'
import { useUi } from '@/app/providers/UiProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { usePermissions } from '@/app/providers/SettingsProvider'
import { useDb } from '@/hooks/useDb'
import { cn, modKey } from '@/lib/utils'
import type { DbState } from '@/services/db'

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/workflows', label: 'Workflows', icon: Workflow },
  { to: '/runs', label: 'Runs', icon: History },
  { to: '/integrations', label: 'Integrations', icon: Puzzle },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
]

const selectCounts = (s: DbState) => ({
  runningRuns: s.executions.filter((e) => e.status === 'running').length,
  brokenIntegrations: s.integrations.filter((i) => i.status === 'error').length,
})

interface SidebarProps {
  onNavigate?: () => void
  forceExpanded?: boolean
}

export function Sidebar({ onNavigate, forceExpanded }: SidebarProps) {
  const { sidebarCollapsed, toggleSidebar } = useUi()
  const collapsed = forceExpanded ? false : sidebarCollapsed
  const { currentUser } = useWorkspace()
  const { role } = usePermissions()
  const counts = useDb(selectCounts)
  const location = useLocation()

  const badgeFor = (to: string) => {
    if (to === '/runs' && counts.runningRuns) return counts.runningRuns
    if (to === '/integrations' && counts.brokenIntegrations)
      return counts.brokenIntegrations
    return null
  }

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full flex-col border-r border-line bg-surface',
        collapsed ? 'w-[60px]' : 'w-[236px]',
        'transition-[width] duration-200 ease-out',
      )}
    >
      {/* ── brand ── */}
      <div
        className={cn(
          'flex h-14 shrink-0 items-center gap-2 px-3',
          collapsed && 'justify-center px-0',
        )}
      >
        <LogoMark className="size-7 shrink-0" />
        {!collapsed && (
          <>
            <Wordmark className="text-sm" />
            <span className="ml-auto mr-1 hidden lg:block">
              <Tooltip content="Collapse sidebar" shortcut={`${modKey()} B`}>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Collapse sidebar"
                  className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink"
                >
                  <PanelLeft className="size-4" aria-hidden />
                </button>
              </Tooltip>
            </span>
          </>
        )}
      </div>

      {/* ── workspace ── */}
      <div className={cn('px-2 pb-2', collapsed && 'px-1.5')}>
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      {/* ── navigation ── */}
      <ul className={cn('flex-1 space-y-0.5 overflow-y-auto px-2', collapsed && 'px-1.5')}>
        {NAV.map((item) => {
          const badge = badgeFor(item.to)
          const active = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to)
          const link = (
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[13px] transition-colors',
                collapsed && 'justify-center px-0',
                active
                  ? 'text-ink'
                  : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-md bg-surface-raised"
                  transition={{ type: 'spring', stiffness: 480, damping: 40 }}
                />
              )}
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <item.icon
                className={cn(
                  'relative size-4 shrink-0 transition-colors',
                  active ? 'text-accent' : 'text-ink-faint group-hover:text-ink-muted',
                )}
                aria-hidden
              />
              {!collapsed && <span className="relative flex-1 truncate">{item.label}</span>}
              {badge !== null && (
                <span
                  className={cn(
                    'relative flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium tabular',
                    collapsed
                      ? 'absolute -right-0.5 -top-0.5 size-1.5 min-w-0 p-0'
                      : 'bg-accent/15 text-accent',
                  )}
                >
                  {collapsed ? (
                    <span className="size-1.5 rounded-full bg-accent" />
                  ) : (
                    badge
                  )}
                </span>
              )}
            </NavLink>
          )

          return (
            <li key={item.to}>
              {collapsed ? (
                <Tooltip content={item.label} placement="right" delay={120}>
                  {link}
                </Tooltip>
              ) : (
                link
              )}
            </li>
          )
        })}
      </ul>

      {/* ── footer ── */}
      <div className={cn('space-y-0.5 border-t border-line p-2', collapsed && 'px-1.5')}>
        {collapsed && (
          <Tooltip content="Expand sidebar" placement="right" delay={120}>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              className="flex w-full items-center justify-center rounded-md py-[7px] text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink"
            >
              <PanelLeft className="size-4 rotate-180" aria-hidden />
            </button>
          </Tooltip>
        )}

        <FooterLink
          to="/settings"
          label="Settings"
          icon={Settings}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />
        <FooterLink
          to="/help"
          label="Help"
          icon={CircleHelp}
          collapsed={collapsed}
          onNavigate={onNavigate}
        />

        <NavLink
          to="/settings/general"
          onClick={onNavigate}
          className={cn(
            'mt-1 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-surface-raised',
            collapsed && 'justify-center px-0',
          )}
        >
          <Avatar user={currentUser} size="sm" />
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-ink">
                {currentUser.name}
              </span>
              <span className="block truncate text-[10px] capitalize text-ink-faint">
                {role}
              </span>
            </span>
          )}
        </NavLink>
      </div>
    </nav>
  )
}

function FooterLink({
  to,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
}: {
  to: string
  label: string
  icon: typeof Settings
  collapsed: boolean
  onNavigate?: () => void
}) {
  const link = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-2 py-[7px] text-[13px] transition-colors',
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-surface-raised text-ink'
            : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
        )
      }
    >
      <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
  return collapsed ? (
    <Tooltip content={label} placement="right" delay={120}>
      {link}
    </Tooltip>
  ) : (
    link
  )
}
