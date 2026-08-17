import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FilePlus2, LayoutTemplate, Star } from 'lucide-react'
import { Button, Field, Input, Modal, SearchInput, Textarea } from '@/components/ui'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { useToast } from '@/app/providers/ToastProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { useDb } from '@/hooks/useDb'
import { workflowService } from '@/services/workflow.service'
import { filterTemplates } from '@/services/template.service'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DbState } from '@/services/db'

const selectTemplates = (s: DbState) => s.templates

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateWorkflowDialog({ open, onClose }: Props) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { workspace } = useWorkspace()
  const templates = useDb(selectTemplates)

  const [mode, setMode] = useState<'choose' | 'blank'>('choose')
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const results = useMemo(
    () => filterTemplates(templates, { query, sort: 'popular' }).slice(0, 8),
    [templates, query],
  )

  const reset = () => {
    setMode('choose')
    setQuery('')
    setName('')
    setDescription('')
  }

  const close = () => {
    onClose()
    // Delay so the exit animation is not interrupted by the state reset.
    setTimeout(reset, 220)
  }

  const createBlank = async () => {
    setBusy(true)
    const workflow = await workflowService.createWorkflow({
      name: name.trim() || 'Untitled workflow',
      description: description.trim(),
      workspaceId: workspace.id,
    })
    setBusy(false)
    close()
    toast({ tone: 'success', title: 'Workflow created', description: workflow.name })
    navigate(`/workflows/${workflow.id}`)
  }

  const createFromTemplate = async (templateId: string) => {
    setBusy(true)
    const template = templates.find((t) => t.id === templateId)
    const workflow = await workflowService.createWorkflow({
      name: template?.name ?? 'Untitled workflow',
      description: template?.description ?? '',
      workspaceId: workspace.id,
      template,
    })
    setBusy(false)
    close()
    toast({
      tone: 'success',
      title: 'Workflow created from template',
      description: `${workflow.nodes.length} nodes ready to configure.`,
    })
    navigate(`/workflows/${workflow.id}`)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title="New workflow"
      description="Start from scratch, or fork a template and adjust it."
      footer={
        mode === 'blank' ? (
          <>
            <Button variant="ghost" onClick={() => setMode('choose')}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={createBlank}
              loading={busy}
              iconRight={<ArrowRight className="size-3.5" />}
            >
              Create & open builder
            </Button>
          </>
        ) : undefined
      }
    >
      {mode === 'choose' ? (
        <div className="space-y-5">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode('blank')}
              className="group flex items-start gap-3 rounded-lg border border-line bg-surface-sunken p-3.5 text-left transition-colors hover:border-accent/50 hover:bg-accent/[0.04]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted transition-colors group-hover:border-accent/40 group-hover:text-accent">
                <FilePlus2 className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">
                  Blank workflow
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                  An empty canvas with a manual trigger.
                </span>
              </span>
            </button>

            <div className="flex items-start gap-3 rounded-lg border border-dashed border-line p-3.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-muted">
                <LayoutTemplate className="size-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">
                  Use a template
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-ink-muted">
                  Pick one below — everything stays editable.
                </span>
              </span>
            </div>
          </div>

          <div className="space-y-2.5">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search templates…"
            />
            <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {results.map((template) => (
                <li key={template.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => createFromTemplate(template.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border border-line bg-surface p-2.5 text-left transition-colors',
                      'hover:border-line-strong hover:bg-surface-raised disabled:opacity-50',
                    )}
                  >
                    <NodeIcon
                      type="trigger.webhook"
                      icon={template.icon}
                      category={
                        template.category === 'ai'
                          ? 'ai'
                          : template.category === 'sales'
                            ? 'trigger'
                            : 'integration'
                      }
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {template.name}
                      </span>
                      <span className="block truncate text-[11px] text-ink-muted">
                        {template.description}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[10px] text-ink-faint">
                      <Star className="size-3 fill-current" aria-hidden />
                      {template.rating} · {formatNumber(template.usedBy)}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-xs text-ink-faint">
                  No templates match “{query}”.
                </li>
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Name" required htmlFor="new-wf-name">
            <Input
              id="new-wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lead qualification"
            />
          </Field>
          <Field
            label="Description"
            htmlFor="new-wf-desc"
            hint="Shown on the workflow card and in search results."
          >
            <Textarea
              id="new-wf-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should this automation do?"
            />
          </Field>
        </div>
      )}
    </Modal>
  )
}
