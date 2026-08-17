import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  Copy,
  Ellipsis,
  ExternalLink,
  Pause,
  PenLine,
  Play,
  Rocket,
  Trash2,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Menu } from '@/components/ui/Menu'
import { useMenu } from '@/components/ui/useMenu'
import { Button, ConfirmDialog, Field, Input, Modal, Textarea } from '@/components/ui'
import { useToast } from '@/app/providers/ToastProvider'
import { usePermissions } from '@/app/providers/SettingsProvider'
import { workflowService } from '@/services/workflow.service'
import { workflowMetaSchema, type WorkflowMetaInput } from '@/lib/validation'
import { cn } from '@/lib/utils'
import type { Workflow } from '@/types/workflow'

interface Props {
  workflow: Workflow
  className?: string
  onDeleted?: () => void
}

export function WorkflowActionsMenu({ workflow, className, onDeleted }: Props) {
  const menu = useMenu()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can, readOnly } = usePermissions()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const form = useForm<WorkflowMetaInput>({
    resolver: zodResolver(workflowMetaSchema),
    defaultValues: { name: workflow.name, description: workflow.description },
  })

  const submitRename = form.handleSubmit(async (values) => {
    await workflowService.updateWorkflow(workflow.id, {
      name: values.name,
      description: values.description,
    })
    setRenameOpen(false)
    toast({ tone: 'success', title: 'Workflow updated' })
  })

  const duplicate = async () => {
    const copy = await workflowService.duplicateWorkflow(workflow.id)
    if (copy) {
      toast({
        tone: 'success',
        title: 'Workflow duplicated',
        description: copy.name,
        action: { label: 'Open', onClick: () => navigate(`/workflows/${copy.id}`) },
      })
    }
  }

  const togglePause = async () => {
    const next = workflow.status === 'paused' ? 'published' : 'paused'
    await workflowService.setStatus(workflow.id, next)
    toast({
      tone: next === 'paused' ? 'warning' : 'success',
      title: next === 'paused' ? 'Workflow paused' : 'Workflow resumed',
      description:
        next === 'paused'
          ? 'New triggers will be ignored until you resume it.'
          : 'Triggers are live again.',
    })
  }

  const publish = async () => {
    await workflowService.publishWorkflow(workflow.id, 'production')
    toast({
      tone: 'success',
      title: 'Published to production',
      description: `${workflow.name} · version ${workflow.version + 1}`,
    })
  }

  const remove = async () => {
    setBusy(true)
    await workflowService.deleteWorkflow(workflow.id)
    setBusy(false)
    setDeleteOpen(false)
    toast({ tone: 'success', title: 'Workflow deleted' })
    onDeleted?.()
  }

  return (
    <>
      <button
        ref={menu.anchorRef}
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          menu.toggle()
        }}
        aria-label={`Actions for ${workflow.name}`}
        aria-expanded={menu.open}
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface-raised hover:text-ink',
          menu.open && 'bg-surface-raised text-ink',
          className,
        )}
      >
        <Ellipsis className="size-4" aria-hidden />
      </button>

      <Menu
        open={menu.open}
        anchorRef={menu.anchorRef}
        onClose={menu.close}
        ariaLabel={`${workflow.name} actions`}
        items={[
          {
            id: 'open',
            label: 'Open in builder',
            icon: <ExternalLink className="size-3.5" />,
            onSelect: () => navigate(`/workflows/${workflow.id}`),
          },
          {
            id: 'runs',
            label: 'View runs',
            icon: <Play className="size-3.5" />,
            onSelect: () => navigate(`/runs?workflow=${workflow.id}`),
          },
          {
            id: 'rename',
            label: 'Rename',
            icon: <PenLine className="size-3.5" />,
            disabled: readOnly,
            separated: true,
            onSelect: () => {
              form.reset({ name: workflow.name, description: workflow.description })
              setRenameOpen(true)
            },
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: <Copy className="size-3.5" />,
            disabled: readOnly,
            onSelect: duplicate,
          },
          {
            id: 'publish',
            label: workflow.status === 'published' ? 'Publish new version' : 'Publish',
            icon: <Rocket className="size-3.5" />,
            disabled: !can('publish'),
            onSelect: publish,
          },
          {
            id: 'pause',
            label: workflow.status === 'paused' ? 'Resume' : 'Pause',
            icon:
              workflow.status === 'paused' ? (
                <Play className="size-3.5" />
              ) : (
                <Pause className="size-3.5" />
              ),
            disabled: readOnly || workflow.status === 'draft',
            onSelect: togglePause,
          },
          {
            id: 'archive',
            label: workflow.status === 'archived' ? 'Restore' : 'Archive',
            icon: <Archive className="size-3.5" />,
            disabled: readOnly,
            separated: true,
            onSelect: () =>
              workflowService.setStatus(
                workflow.id,
                workflow.status === 'archived' ? 'draft' : 'archived',
              ),
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 className="size-3.5" />,
            tone: 'danger',
            disabled: !can('manage'),
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename workflow"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submitRename}
              loading={form.formState.isSubmitting}
            >
              Save changes
            </Button>
          </>
        }
      >
        <form onSubmit={submitRename} className="space-y-4">
          <Field
            label="Name"
            required
            htmlFor="wf-rename"
            error={form.formState.errors.name?.message}
          >
            <Input
              id="wf-rename"
              invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
          </Field>
          <Field
            label="Description"
            htmlFor="wf-desc"
            error={form.formState.errors.description?.message}
          >
            <Textarea id="wf-desc" rows={3} {...form.register('description')} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={remove}
        loading={busy}
        title={`Delete “${workflow.name}”?`}
        description="This removes the workflow and its run history. This cannot be undone."
        confirmLabel="Delete workflow"
      />
    </>
  )
}
