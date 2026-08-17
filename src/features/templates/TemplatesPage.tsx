import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutTemplate, Sparkles, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { WorkflowMiniature } from '@/components/nodes/WorkflowMiniature'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import {
  Badge,
  CardSkeleton,
  EmptyState,
  SearchInput,
  Select,
  Tabs,
} from '@/components/ui'
import { useDb } from '@/hooks/useDb'
import { filterTemplates, type TemplateFilter } from '@/services/template.service'
import { TEMPLATE_CATEGORIES } from '@/data/templates'
import { formatNumber } from '@/lib/format'
import type { DbState } from '@/services/db'
import type { Template, TemplateCategory } from '@/types/template'

const selectTemplates = (s: DbState) => s.templates

const CATEGORY_TONE: Record<TemplateCategory, Parameters<typeof NodeIcon>[0]['category']> = {
  sales: 'trigger',
  marketing: 'action',
  operations: 'utility',
  support: 'condition',
  finance: 'integration',
  ai: 'ai',
}

export default function TemplatesPage() {
  const templates = useDb(selectTemplates)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all')
  const [sort, setSort] = useState<NonNullable<TemplateFilter['sort']>>('popular')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 220)
    return () => clearTimeout(timer)
  }, [])

  const results = useMemo(
    () => filterTemplates(templates, { query, category, sort }),
    [templates, query, category, sort],
  )

  const featured = useMemo(
    () => templates.filter((t) => t.featured).slice(0, 3),
    [templates],
  )

  const showFeatured = !query && category === 'all'

  return (
    <>
      <Topbar crumbs={[{ label: 'Templates' }]} />
      <PageBody>
        <PageHeader
          title="Templates"
          description="Production-ready automations you can fork and adapt. Everything stays editable."
        />

        {showFeatured && (
          <section className="mt-5">
            <SectionHeader
              title="Featured"
              description="The workflows teams reach for first."
              className="mb-3"
            />
            <div className="grid gap-3 lg:grid-cols-3">
              {featured.map((template, index) => (
                <FeaturedCard key={template.id} template={template} index={index} />
              ))}
            </div>
          </section>
        )}

        <div className="mt-6 space-y-3">
          <Tabs
            variant="pill"
            layoutId="template-category-tabs"
            items={[
              { id: 'all', label: 'All' },
              ...TEMPLATE_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
            ]}
            value={category}
            onChange={(value) => setCategory(value as TemplateCategory | 'all')}
            ariaLabel="Filter templates by category"
          />
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search templates…"
              className="min-w-[12rem] flex-1 sm:max-w-sm"
            />
            <Select
              sizeVariant="sm"
              aria-label="Sort templates"
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as NonNullable<TemplateFilter['sort']>)
              }
              className="w-[9.5rem]"
            >
              <option value="popular">Most used</option>
              <option value="rating">Highest rated</option>
              <option value="newest">Newest</option>
            </Select>
            <span className="tabular ml-auto text-xs text-ink-faint">
              {results.length} templates
            </span>
          </div>
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
              icon={<LayoutTemplate className="size-5" aria-hidden />}
              title="No templates match"
              description="Try another category, or start from a blank workflow instead."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((template, index) => (
                <TemplateCard key={template.id} template={template} index={index} />
              ))}
            </div>
          )}
        </div>
      </PageBody>
    </>
  )
}

function FeaturedCard({ template, index }: { template: Template; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/templates/${template.id}`}
        className="surface-card group block overflow-hidden transition-colors hover:border-line-strong"
      >
        <div className="relative overflow-hidden border-b border-line bg-canvas">
          <WorkflowMiniature
            nodes={template.nodes}
            edges={template.edges}
            height={132}
            className="opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute left-3 top-3">
            <Badge tone="accent" size="xs" icon={<Sparkles className="size-2.5" />}>
              Featured
            </Badge>
          </span>
        </div>
        <div className="p-4">
          <h3 className="text-[13px] font-semibold text-ink">{template.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
            {template.description}
          </p>
          <div className="mt-3 flex items-center gap-3 text-[11px] text-ink-faint">
            <span className="flex items-center gap-1">
              <Star className="size-3 fill-current text-state-warning" aria-hidden />
              {template.rating}
            </span>
            <span>{formatNumber(template.usedBy)} uses</span>
            <span className="ml-auto">{template.nodes.length} nodes</span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

function TemplateCard({ template, index }: { template: Template; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: Math.min(index, 8) * 0.03, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/templates/${template.id}`}
        className="surface-card flex h-full flex-col p-4 transition-colors hover:border-line-strong"
      >
        <div className="flex items-start gap-3">
          <NodeIcon
            type="trigger.webhook"
            icon={template.icon}
            category={CATEGORY_TONE[template.category]}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[13px] font-semibold text-ink">
              {template.name}
            </h3>
            <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-muted">
              {template.description}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {template.tags.map((tag) => (
            <Badge key={tag} tone="muted" size="xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="mt-auto flex items-center gap-3 border-t border-line pt-3 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1">
            <Star className="size-3 fill-current text-state-warning" aria-hidden />
            {template.rating}
          </span>
          <span>{formatNumber(template.usedBy)} uses</span>
          <span className="ml-auto">~{template.estimatedSetupMin} min setup</span>
        </div>
      </Link>
    </motion.article>
  )
}
