import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Puzzle, Unplug } from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { ConnectDialog } from './ConnectDialog'
import {
  Badge,
  Button,
  Callout,
  ConfirmDialog,
  EmptyState,
  StatusBadge,
} from '@/components/ui'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { useDb } from '@/hooks/useDb'
import { useToast } from '@/app/providers/ToastProvider'
import { usePermissions } from '@/app/providers/SettingsProvider'
import { integrationService } from '@/services/integration.service'
import { resolveIcon } from '@/lib/icons'
import { formatCurrency, formatDate, formatRelative } from '@/lib/format'
import type { DbState } from '@/services/db'

export default function IntegrationDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = usePermissions()

  const integration = useDb(
    useCallback((s: DbState) => s.integrations.find((i) => i.slug === slug) ?? null, [slug]),
  )
  const workflows = useDb(useCallback((s: DbState) => s.workflows, []))
  const [connecting, setConnecting] = useState(false)
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  const used = useMemo(
    () =>
      integration
        ? workflows.filter((w) => integration.usedInWorkflowIds.includes(w.id))
        : [],
    [workflows, integration],
  )

  if (!integration) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Integrations', to: '/integrations' }]} />
        <PageBody>
          <EmptyState
            icon={<Puzzle className="size-5" aria-hidden />}
            title="Integration not found"
            description={`No integration named “${slug}”.`}
            action={
              <Button variant="primary" onClick={() => navigate('/integrations')}>
                Back to integrations
              </Button>
            }
          />
        </PageBody>
      </>
    )
  }

  const Icon = resolveIcon(integration.icon)
  const connected = integration.status === 'connected'

  const disconnect = async () => {
    await integrationService.disconnect(integration.slug)
    setDisconnectOpen(false)
    toast({
      tone: 'warning',
      title: `${integration.name} disconnected`,
      description: `${integration.usedInWorkflowIds.length} workflows will fail until it is reconnected.`,
    })
  }

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Integrations', to: '/integrations' },
          { label: integration.name },
        ]}
      />
      <PageBody>
        <div className="mb-4">
          <Link
            to="/integrations"
            className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All integrations
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-xl border"
            style={{
              background: `color-mix(in srgb, ${integration.brand} 14%, transparent)`,
              borderColor: `color-mix(in srgb, ${integration.brand} 30%, transparent)`,
              color: integration.brand,
            }}
            aria-hidden
          >
            <Icon className="size-7" strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <PageHeader
              title={integration.name}
              description={integration.description}
              meta={<StatusBadge status={integration.status} kind="integration" />}
              actions={
                connected ? (
                  <Button
                    variant="secondary"
                    icon={<Unplug className="size-3.5" />}
                    disabled={!can('manage')}
                    onClick={() => setDisconnectOpen(true)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    disabled={!can('manage')}
                    onClick={() => setConnecting(true)}
                  >
                    {integration.status === 'error' ? 'Reconnect' : 'Connect'}
                  </Button>
                )
              }
            />
          </div>
        </div>

        {integration.status === 'error' && integration.errorMessage && (
          <div className="mt-4">
            <Callout tone="danger" title="Connection error">
              {integration.errorMessage}
            </Callout>
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="Account" value={integration.account ?? 'Not connected'} />
          <Fact
            label="Connected"
            value={integration.connectedAt ? formatDate(integration.connectedAt) : '—'}
          />
          <Fact
            label="Last activity"
            value={
              integration.lastActivityAt
                ? formatRelative(integration.lastActivityAt)
                : '—'
            }
          />
          <Fact label="Monthly cost" value={formatCurrency(integration.monthlyCost)} />
        </dl>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section>
            <SectionHeader
              title="Available actions"
              description="Each one is available as a node in the builder."
              className="mb-3"
            />
            <ul className="surface-card divide-y divide-line overflow-hidden">
              {integration.actions.map((action) => (
                <li key={action.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  {action.nodeType ? (
                    <NodeIcon type={action.nodeType} size="sm" />
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-md border border-line bg-surface-sunken text-ink-faint">
                      <Puzzle className="size-3" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-ink">
                      {action.label}
                    </span>
                    <span className="block truncate text-[11px] text-ink-faint">
                      {action.description}
                    </span>
                  </span>
                  {action.nodeType && (
                    <Badge tone="muted" size="xs">
                      Node
                    </Badge>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-3">
              <a
                href={integration.docsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
              >
                Read the {integration.name} docs
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          </section>

          <section>
            <SectionHeader
              title="Used in workflows"
              description={`${used.length} workflow${used.length === 1 ? '' : 's'} depend on this connection.`}
              className="mb-3"
            />
            {used.length === 0 ? (
              <EmptyState
                compact
                icon={<Puzzle className="size-4" aria-hidden />}
                title="Not used yet"
                description="Add one of its nodes to a workflow to start using it."
              />
            ) : (
              <ul className="surface-card divide-y divide-line overflow-hidden">
                {used.map((workflow) => (
                  <li key={workflow.id}>
                    <Link
                      to={`/workflows/${workflow.id}`}
                      className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-raised/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">
                          {workflow.name}
                        </span>
                        <span className="block truncate text-[11px] text-ink-faint">
                          {workflow.stats.runs.toLocaleString()} runs ·{' '}
                          {workflow.stats.successRate}% success
                        </span>
                      </span>
                      <StatusBadge status={workflow.status} size="xs" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="surface-card mt-3 p-3.5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Granted scopes
              </h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {integration.scopes.map((scope) => (
                  <code
                    key={scope}
                    className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
                  >
                    {scope}
                  </code>
                ))}
              </div>
            </div>
          </section>
        </div>
      </PageBody>

      <ConnectDialog
        integration={connecting ? integration : null}
        onClose={() => setConnecting(false)}
      />

      <ConfirmDialog
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={disconnect}
        title={`Disconnect ${integration.name}?`}
        description={`${used.length} workflow${used.length === 1 ? '' : 's'} using it will start failing until it is reconnected.`}
        confirmLabel="Disconnect"
      />
    </>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card px-3 py-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 truncate text-[13px] font-medium text-ink">{value}</dd>
    </div>
  )
}
