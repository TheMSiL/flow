import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, LayoutTemplate, Star, Timer } from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { WorkflowMiniature } from '@/components/nodes/WorkflowMiniature'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { Badge, Button, EmptyState } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import { useDb } from '@/hooks/useDb'
import { useToast } from '@/app/providers/ToastProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { usePermissions } from '@/app/providers/SettingsProvider'
import { templateService } from '@/services/template.service'
import { getNodeDefinition } from '@/nodes/catalog'
import { getUser } from '@/data/users'
import { resolveIcon } from '@/lib/icons'
import { formatDate, formatNumber } from '@/lib/format'
import type { DbState } from '@/services/db'

export default function TemplateDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { workspace } = useWorkspace()
  const { readOnly } = usePermissions()
  const [busy, setBusy] = useState(false)

  const template = useDb(
    useCallback((s: DbState) => s.templates.find((t) => t.id === id) ?? null, [id]),
  )
  const integrations = useDb(useCallback((s: DbState) => s.integrations, []))

  const required = useMemo(
    () =>
      template
        ? integrations.filter((i) => template.integrations.includes(i.slug))
        : [],
    [integrations, template],
  )

  if (!template) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Templates', to: '/templates' }]} />
        <PageBody>
          <EmptyState
            icon={<LayoutTemplate className="size-5" aria-hidden />}
            title="Template not found"
            description={`No template with the id “${id}”.`}
            action={
              <Button variant="primary" onClick={() => navigate('/templates')}>
                Browse templates
              </Button>
            }
          />
        </PageBody>
      </>
    )
  }

  const author = getUser(template.authorId)
  const Icon = resolveIcon(template.icon)

  const use = async () => {
    setBusy(true)
    const workflow = await templateService.useTemplate(template.id, workspace.id)
    setBusy(false)
    if (workflow) {
      toast({
        tone: 'success',
        title: 'Workflow created from template',
        description: `${workflow.nodes.length} nodes copied into ${workspace.name}.`,
      })
      navigate(`/workflows/${workflow.id}`)
    }
  }

  return (
    <>
      <Topbar
        crumbs={[{ label: 'Templates', to: '/templates' }, { label: template.name }]}
      />
      <PageBody>
        <div className="mb-4">
          <Link
            to="/templates"
            className="inline-flex items-center gap-1.5 text-xs text-ink-faint transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All templates
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-sunken text-accent">
            <Icon className="size-6" strokeWidth={1.7} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <PageHeader
              title={template.name}
              description={template.description}
              meta={
                <Badge tone="muted" size="xs" className="capitalize">
                  {template.category}
                </Badge>
              }
              actions={
                <Button
                  variant="primary"
                  loading={busy}
                  disabled={readOnly}
                  iconRight={<ArrowRight className="size-3.5" />}
                  onClick={use}
                >
                  Use template
                </Button>
              }
            />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact
            label="Used by"
            value={`${formatNumber(template.usedBy)} teams`}
          />
          <Fact
            label="Rating"
            value={
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-current text-state-warning" aria-hidden />
                {template.rating} / 5
              </span>
            }
          />
          <Fact
            label="Setup"
            value={
              <span className="flex items-center gap-1">
                <Timer className="size-3.5 text-ink-faint" aria-hidden />~
                {template.estimatedSetupMin} min
              </span>
            }
          />
          <Fact label="Published" value={formatDate(template.createdAt)} />
        </dl>

        <section className="mt-6">
          <SectionHeader
            title="Workflow preview"
            description={`${template.nodes.length} nodes · ${template.edges.length} connections`}
            className="mb-3"
          />
          <div className="surface-card overflow-hidden bg-canvas p-2">
            <WorkflowMiniature
              nodes={template.nodes}
              edges={template.edges}
              height={280}
              showLabels
            />
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section>
            <SectionHeader title="How it works" className="mb-3" />
            <p className="text-[13px] leading-6 text-ink-muted">
              {template.longDescription}
            </p>

            <SectionHeader title="Steps" className="mb-3 mt-5" />
            <ol className="surface-card divide-y divide-line overflow-hidden">
              {template.nodes
                .filter((n) => !n.type.startsWith('canvas.'))
                .map((node, index) => {
                  const def = getNodeDefinition(node.type)
                  return (
                    <li key={node.id} className="flex items-center gap-3 px-3.5 py-2.5">
                      <span className="tabular w-4 shrink-0 text-[11px] text-ink-faint">
                        {index + 1}
                      </span>
                      <NodeIcon type={node.type} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">
                          {node.data.label}
                        </span>
                        <span className="block truncate text-[11px] text-ink-faint">
                          {def.description}
                        </span>
                      </span>
                      <Badge tone="muted" size="xs" className="capitalize">
                        {def.category}
                      </Badge>
                    </li>
                  )
                })}
            </ol>
          </section>

          <section className="space-y-4">
            <div>
              <SectionHeader title="Requires" className="mb-3" />
              {required.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-3 py-4 text-[12px] text-ink-faint">
                  No external integrations needed.
                </p>
              ) : (
                <ul className="surface-card divide-y divide-line overflow-hidden">
                  {required.map((integration) => {
                    const IntIcon = resolveIcon(integration.icon)
                    return (
                      <li key={integration.id}>
                        <Link
                          to={`/integrations/${integration.slug}`}
                          className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-raised/60"
                        >
                          <span
                            className="flex size-7 shrink-0 items-center justify-center rounded-md border"
                            style={{
                              background: `color-mix(in srgb, ${integration.brand} 14%, transparent)`,
                              borderColor: `color-mix(in srgb, ${integration.brand} 30%, transparent)`,
                              color: integration.brand,
                            }}
                            aria-hidden
                          >
                            <IntIcon className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                            {integration.name}
                          </span>
                          <Badge
                            tone={
                              integration.status === 'connected'
                                ? 'success'
                                : integration.status === 'error'
                                  ? 'danger'
                                  : 'neutral'
                            }
                            size="xs"
                          >
                            {integration.status === 'connected'
                              ? 'Ready'
                              : integration.status === 'error'
                                ? 'Error'
                                : 'Connect'}
                          </Badge>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="surface-card p-3.5">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Published by
              </h3>
              <div className="mt-2.5 flex items-center gap-2.5">
                <Avatar user={author} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-ink">{author.name}</p>
                  <p className="truncate text-[11px] text-ink-faint">{author.title}</p>
                </div>
              </div>
            </div>

            <Button full variant="primary" loading={busy} disabled={readOnly} onClick={use}>
              Use this template
            </Button>
          </section>
        </div>
      </PageBody>
    </>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="surface-card px-3 py-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium text-ink">{value}</dd>
    </div>
  )
}
