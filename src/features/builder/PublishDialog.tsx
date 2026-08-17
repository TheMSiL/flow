import { useState } from 'react'
import { CircleCheck, CircleX, Rocket, TriangleAlert } from 'lucide-react'
import { Badge, Button, Field, Modal, Select, Textarea } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { Environment, ValidationResult, Workflow } from '@/types/workflow'

interface Props {
  open: boolean
  onClose: () => void
  onPublish: (environment: Environment, message: string) => Promise<void>
  workflow: Workflow
  validation: ValidationResult
  onFocusIssue: (nodeId: string) => void
}

const ENVIRONMENTS: { id: Environment; label: string; hint: string }[] = [
  { id: 'development', label: 'Development', hint: 'Safe sandbox — no real deliveries' },
  { id: 'staging', label: 'Staging', hint: 'Mirrors production with test credentials' },
  { id: 'production', label: 'Production', hint: 'Live traffic and real integrations' },
]

export function PublishDialog({
  open,
  onClose,
  onPublish,
  workflow,
  validation,
  onFocusIssue,
}: Props) {
  const [environment, setEnvironment] = useState<Environment>('production')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const blocked = !validation.valid

  const submit = async () => {
    setBusy(true)
    await onPublish(environment, message.trim() || `Published to ${environment}`)
    setBusy(false)
    setMessage('')
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      icon={<Rocket className="size-4" aria-hidden />}
      title={blocked ? 'Fix issues before publishing' : 'Publish workflow?'}
      description={
        blocked
          ? `${validation.errorCount} error${validation.errorCount === 1 ? '' : 's'} must be resolved first.`
          : 'A new immutable version is created and starts handling live triggers.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Rocket className="size-3.5" />}
            disabled={blocked}
            loading={busy}
            onClick={submit}
          >
            Publish v{workflow.version + 1}
          </Button>
        </>
      }
    >
      {blocked ? (
        <ul className="space-y-1.5">
          {validation.issues
            .filter((issue) => issue.severity === 'error')
            .map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  disabled={!issue.nodeId}
                  onClick={() => {
                    if (issue.nodeId) {
                      onFocusIssue(issue.nodeId)
                      onClose()
                    }
                  }}
                  className={cn(
                    'flex w-full gap-2.5 rounded-lg border border-state-danger/25 bg-state-danger/[0.05] p-2.5 text-left transition-colors',
                    issue.nodeId && 'hover:border-state-danger/45',
                  )}
                >
                  <CircleX className="mt-px size-3.5 shrink-0 text-state-danger" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-medium text-ink">
                      {issue.title}
                    </span>
                    <span className="block text-[11px] leading-5 text-ink-muted">
                      {issue.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
        </ul>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-surface-sunken p-3">
            <div>
              <dt className="text-[10px] text-ink-faint">Version</dt>
              <dd className="tabular text-[13px] font-medium text-ink">
                v{workflow.version + 1}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-ink-faint">Nodes</dt>
              <dd className="tabular text-[13px] font-medium text-ink">
                {workflow.nodes.length}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] text-ink-faint">Checks</dt>
              <dd className="flex items-center gap-1 text-[13px] font-medium text-state-success">
                <CircleCheck className="size-3.5" aria-hidden />
                Passed
              </dd>
            </div>
          </dl>

          {validation.warningCount > 0 && (
            <div className="flex gap-2 rounded-md border border-state-warning/25 bg-state-warning/[0.07] p-2.5">
              <TriangleAlert
                className="mt-px size-3.5 shrink-0 text-state-warning"
                aria-hidden
              />
              <p className="text-[11px] leading-5 text-state-warning">
                {validation.warningCount} warning
                {validation.warningCount === 1 ? '' : 's'} will be published as-is.
              </p>
            </div>
          )}

          <Field label="Environment" htmlFor="publish-env">
            <Select
              id="publish-env"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as Environment)}
            >
              {ENVIRONMENTS.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.label} — {env.hint}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Release note"
            htmlFor="publish-message"
            hint="Shows up in the version history for your team."
            action={<Badge tone="muted" size="xs">Optional</Badge>}
          >
            <Textarea
              id="publish-message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Raised the qualification threshold to 70"
            />
          </Field>
        </div>
      )}
    </Modal>
  )
}
