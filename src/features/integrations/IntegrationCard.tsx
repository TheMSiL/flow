import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Unplug } from 'lucide-react'
import { Badge, Button, StatusBadge } from '@/components/ui'
import { resolveIcon } from '@/lib/icons'
import { formatRelative } from '@/lib/format'
import { usePermissions } from '@/app/providers/SettingsProvider'
import { cn } from '@/lib/utils'
import type { Integration } from '@/types/integration'

export function IntegrationCard({
  integration,
  index = 0,
  onConnect,
}: {
  integration: Integration
  index?: number
  onConnect: () => void
}) {
  const Icon = resolveIcon(integration.icon)
  const { can } = usePermissions()
  const connected = integration.status === 'connected'

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: Math.min(index, 8) * 0.03, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'surface-card flex h-full flex-col p-4 transition-colors hover:border-line-strong',
        integration.status === 'error' && 'border-state-danger/30',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border"
          style={{
            background: `color-mix(in srgb, ${integration.brand} 14%, transparent)`,
            borderColor: `color-mix(in srgb, ${integration.brand} 30%, transparent)`,
            color: integration.brand,
          }}
          aria-hidden
        >
          <Icon className="size-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[13px] font-semibold text-ink">
              {integration.name}
            </h3>
            <StatusBadge status={integration.status} kind="integration" size="xs" />
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
            {integration.description}
          </p>
        </div>
      </div>

      {integration.status === 'error' && integration.errorMessage && (
        <p className="mt-3 rounded-md border border-state-danger/20 bg-state-danger/[0.06] px-2.5 py-1.5 text-[11px] leading-5 text-state-danger">
          {integration.errorMessage}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {integration.actions.slice(0, 3).map((action) => (
          <Badge key={action.id} tone="muted" size="xs">
            {action.label}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="min-w-0 text-[11px] text-ink-faint">
          {connected ? (
            <>
              <span className="block truncate text-ink-muted">{integration.account}</span>
              {integration.lastActivityAt && (
                <span className="block">
                  Active {formatRelative(integration.lastActivityAt)}
                </span>
              )}
            </>
          ) : integration.status === 'error' ? (
            'Reconnect to resume runs'
          ) : (
            'Not connected'
          )}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {connected ? (
            <Link
              to={`/integrations/${integration.slug}`}
              className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              Manage
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          ) : (
            <Button
              size="sm"
              variant={integration.status === 'error' ? 'secondary' : 'primary'}
              icon={
                integration.status === 'error' ? (
                  <Unplug className="size-3.5" />
                ) : undefined
              }
              disabled={!can('manage')}
              onClick={onConnect}
            >
              {integration.status === 'error' ? 'Reconnect' : 'Connect'}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  )
}
