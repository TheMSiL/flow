import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Blocks,
  Braces,
  Command,
  GitBranch,
  Keyboard,
  LayoutTemplate,
  Play,
  Puzzle,
  Rocket,
  Zap,
} from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import { Button, Kbd } from '@/components/ui'
import { useUi } from '@/app/providers/UiProvider'
import { NODE_DEFINITIONS, CATEGORIES } from '@/nodes/catalog'
import { modKey } from '@/lib/utils'

const CONCEPTS = [
  {
    icon: Zap,
    title: 'Triggers start everything',
    body: 'A workflow runs when its trigger fires — an incoming webhook, a schedule, a new lead. Every workflow needs exactly one.',
  },
  {
    icon: Blocks,
    title: 'Nodes do the work',
    body: `${NODE_DEFINITIONS.length} node types across ${CATEGORIES.length} categories: actions, logic, AI reasoning, integrations and utilities.`,
  },
  {
    icon: GitBranch,
    title: 'Conditions split the path',
    body: 'If / Else, Filter and Switch nodes route each run down a different branch based on the data flowing through it.',
  },
  {
    icon: Braces,
    title: 'Variables carry data forward',
    body: 'Reference any upstream value with {{lead.email}} syntax. The picker shows exactly what is available at each step.',
  },
  {
    icon: Play,
    title: 'Test before you publish',
    body: 'Run against a JSON payload and watch the execution travel the canvas node by node, with a full log and per-node output.',
  },
  {
    icon: Rocket,
    title: 'Publishing creates a version',
    body: 'Validation runs first. Published workflows are versioned and can be paused, restored or rolled back at any time.',
  },
]

export default function HelpPage() {
  const { setShortcutsOpen, setCommandOpen } = useUi()
  const mod = modKey()

  return (
    <>
      <Topbar crumbs={[{ label: 'Help' }]} />
      <PageBody>
        <PageHeader
          title="How FLOW works"
          description="Six ideas cover the whole product. Everything else is detail."
          actions={
            <>
              <Button
                variant="secondary"
                icon={<Keyboard className="size-3.5" />}
                onClick={() => setShortcutsOpen(true)}
              >
                Shortcuts
              </Button>
              <Button
                variant="primary"
                icon={<Command className="size-3.5" />}
                onClick={() => setCommandOpen(true)}
              >
                Command palette
              </Button>
            </>
          }
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CONCEPTS.map((concept) => (
            <article key={concept.title} className="surface-card p-4">
              <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface-sunken text-accent">
                <concept.icon className="size-4" aria-hidden />
              </span>
              <h2 className="mt-3 text-[13px] font-semibold text-ink">{concept.title}</h2>
              <p className="mt-1 text-xs leading-6 text-ink-muted">{concept.body}</p>
            </article>
          ))}
        </div>

        <section className="mt-8">
          <SectionHeader
            title="Start here"
            description="Three paths into the product."
            className="mb-3"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <StartCard
              to="/templates"
              icon={<LayoutTemplate className="size-4" aria-hidden />}
              title="Fork a template"
              body="The fastest route — 20 production-ready workflows to adapt."
            />
            <StartCard
              to="/workflows/wf_01"
              icon={<GitBranch className="size-4" aria-hidden />}
              title="Open Lead qualification"
              body="A fully wired workflow with AI scoring and a branching path."
            />
            <StartCard
              to="/integrations"
              icon={<Puzzle className="size-4" aria-hidden />}
              title="Connect a tool"
              body="Ten integrations, each with a mock OAuth handshake."
            />
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title="Essential shortcuts" className="mb-3" />
          <div className="surface-card divide-y divide-line overflow-hidden">
            {[
              { keys: [mod, 'K'], label: 'Open the command palette from anywhere' },
              { keys: ['N'], label: 'Add a node while the builder is focused' },
              { keys: ['R'], label: 'Run a test on the open workflow' },
              { keys: ['F'], label: 'Fit the canvas to the whole graph' },
              { keys: [mod, 'S'], label: 'Save immediately (autosave handles the rest)' },
              { keys: ['?'], label: 'Show every shortcut' },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 px-4 py-2.5"
              >
                <span className="text-[13px] text-ink-muted">{row.label}</span>
                <span className="flex shrink-0 gap-1">
                  {row.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-line bg-surface-sunken p-4">
          <h2 className="text-[13px] font-semibold text-ink">About this build</h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-ink-muted">
            FLOW runs entirely in your browser. The execution engine, validation and
            analytics are real implementations operating on mock data; the service layer
            (<code className="font-mono text-[11px] text-ink">src/services</code>) is
            shaped like an API client, so swapping localStorage for a backend means
            changing one function rather than the UI.
          </p>
        </section>
      </PageBody>
    </>
  )
}

function StartCard({
  to,
  icon,
  title,
  body,
}: {
  to: string
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Link
      to={to}
      className="surface-card group flex flex-col p-4 transition-colors hover:border-line-strong"
    >
      <span className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors group-hover:text-accent">
        {icon}
      </span>
      <h3 className="mt-3 text-[13px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 flex-1 text-xs leading-5 text-ink-muted">{body}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs text-ink-faint transition-colors group-hover:text-accent">
        Open <ArrowRight className="size-3" aria-hidden />
      </span>
    </Link>
  )
}
