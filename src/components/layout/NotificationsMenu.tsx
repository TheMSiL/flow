import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CircleCheck,
  CircleX,
  Gauge,
  MessageCircle,
  Rocket,
  Unplug,
  UserPlus,
} from 'lucide-react'
import { Popover } from '@/components/ui/Popover'
import { EmptyState } from '@/components/ui/Feedback'
import { useDb } from '@/hooks/useDb'
import { notificationService } from '@/services/workspace.service'
import { formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DbState } from '@/services/db'
import type { AppNotification, NotificationKind } from '@/types/workspace'

const ICONS: Record<NotificationKind, typeof Bell> = {
  workflow_completed: CircleCheck,
  workflow_failed: CircleX,
  workflow_published: Rocket,
  integration_disconnected: Unplug,
  invite_received: UserPlus,
  api_limit: Gauge,
  comment: MessageCircle,
}

const LEVEL_COLOR: Record<AppNotification['level'], string> = {
  success: 'text-state-success',
  error: 'text-state-danger',
  warning: 'text-state-warning',
  info: 'text-state-running',
}

const selectNotifications = (s: DbState) => s.notifications

export function NotificationsMenu() {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const notifications = useDb(selectNotifications)
  const navigate = useNavigate()

  const unread = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const handleOpen = (item: AppNotification) => {
    void notificationService.markRead(item.id)
    setOpen(false)
    if (item.runId) navigate(`/runs/${item.runId}`)
    else if (item.workflowId) navigate(`/workflows/${item.workflowId}`)
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className={cn(
          'relative flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink',
          open && 'bg-surface-raised text-ink',
        )}
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex size-full rounded-full bg-accent" />
          </span>
        )}
      </button>

      <Popover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        placement="bottom-end"
        ariaLabel="Notifications"
      >
        <div className="flex max-h-[26rem] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-line bg-surface-overlay shadow-xl">
          <header className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <h2 className="text-[13px] font-semibold text-ink">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void notificationService.markAllRead()}
                className="text-xs text-accent transition-opacity hover:opacity-80"
              >
                Mark all read
              </button>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <EmptyState
                compact
                icon={<Bell className="size-4" aria-hidden />}
                title="You're all caught up"
                description="Run failures and mentions will show up here."
                className="m-3 border-0"
              />
            ) : (
              <ul>
                {notifications.slice(0, 24).map((item) => {
                  const Icon = ICONS[item.kind]
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => handleOpen(item)}
                        className={cn(
                          'flex w-full gap-2.5 border-b border-line px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-surface-raised',
                          !item.read && 'bg-accent/[0.04]',
                        )}
                      >
                        <Icon
                          className={cn('mt-0.5 size-4 shrink-0', LEVEL_COLOR[item.level])}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-2">
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                              {item.title}
                            </span>
                            {!item.read && (
                              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                            )}
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-[11px] leading-5 text-ink-muted">
                            {item.body}
                          </span>
                          <span className="mt-1 block text-[10px] text-ink-faint">
                            {formatRelative(item.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </Popover>
    </>
  )
}
