import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Puzzle, TriangleAlert } from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader } from '@/components/common/PageHeader'
import { IntegrationCard } from './IntegrationCard'
import { ConnectDialog } from './ConnectDialog'
import { Callout, CardSkeleton, EmptyState, SearchInput, Tabs } from '@/components/ui'
import { useDb } from '@/hooks/useDb'
import type { DbState } from '@/services/db'
import type { Integration, IntegrationCategory } from '@/types/integration'

const selectIntegrations = (s: DbState) => s.integrations

const CATEGORIES: { id: IntegrationCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'communication', label: 'Communication' },
  { id: 'crm', label: 'CRM' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'payments', label: 'Payments' },
  { id: 'ai', label: 'AI' },
  { id: 'developer', label: 'Developer' },
]

export default function IntegrationsPage() {
  const integrations = useDb(selectIntegrations)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<IntegrationCategory | 'all'>('all')
  const [connecting, setConnecting] = useState<Integration | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 220)
    return () => clearTimeout(timer)
  }, [])

  const broken = integrations.filter((i) => i.status === 'error')
  const connected = integrations.filter((i) => i.status === 'connected')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return integrations.filter((i) => {
      if (category !== 'all' && i.category !== category) return false
      if (!q) return true
      return (
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.actions.some((a) => a.label.toLowerCase().includes(q))
      )
    })
  }, [integrations, query, category])

  return (
    <>
      <Topbar crumbs={[{ label: 'Integrations' }]} />
      <PageBody>
        <PageHeader
          title="Integrations"
          description={`${connected.length} of ${integrations.length} services connected to this workspace.`}
        />

        {broken.length > 0 && (
          <div className="mt-4">
            <Callout
              tone="danger"
              title={`${broken.length} integration${broken.length === 1 ? '' : 's'} need attention`}
              icon={<TriangleAlert className="size-4" aria-hidden />}
            >
              {broken.map((i) => (
                <p key={i.id}>
                  <Link
                    to={`/integrations/${i.slug}`}
                    className="text-ink underline-offset-2 hover:underline"
                  >
                    {i.name}
                  </Link>{' '}
                  — {i.errorMessage}
                </p>
              ))}
            </Callout>
          </div>
        )}

        <div className="mt-5 space-y-3">
          <Tabs
            variant="pill"
            layoutId="integration-category-tabs"
            items={CATEGORIES.map((c) => ({ id: c.id, label: c.label }))}
            value={category}
            onChange={(value) => setCategory(value as IntegrationCategory | 'all')}
            ariaLabel="Filter integrations by category"
          />
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search integrations and actions…"
            className="sm:max-w-sm"
          />
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={<Puzzle className="size-5" aria-hidden />}
              title="No integrations match"
              description="Try a different category or search term."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((integration, index) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  index={index}
                  onConnect={() => setConnecting(integration)}
                />
              ))}
            </div>
          )}
        </div>
      </PageBody>

      <ConnectDialog
        integration={connecting}
        onClose={() => setConnecting(null)}
      />
    </>
  )
}
