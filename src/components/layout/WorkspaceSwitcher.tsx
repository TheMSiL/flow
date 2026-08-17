import { useRef, useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Popover } from '@/components/ui/Popover'
import { Button, Field, Input, Modal, Select } from '@/components/ui'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { useToast } from '@/app/providers/ToastProvider'
import { workspaceService } from '@/services/workspace.service'
import { workspaceSchema, type WorkspaceInput } from '@/lib/validation'
import { cn } from '@/lib/utils'

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  team: 'Team',
  business: 'Business',
  enterprise: 'Enterprise',
}

export function WorkspaceSwitcher({ collapsed }: { collapsed?: boolean }) {
  const { workspaces, workspace, setWorkspaceId } = useWorkspace()
  const { toast } = useToast()
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const form = useForm<WorkspaceInput>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: '', plan: 'team' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const created = await workspaceService.createWorkspace(values)
    setWorkspaceId(created.id)
    setCreateOpen(false)
    form.reset()
    toast({
      tone: 'success',
      title: 'Workspace created',
      description: `${created.name} is ready to use.`,
    })
  })

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Workspace: ${workspace.name}`}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left transition-colors',
          'hover:border-line hover:bg-surface-raised',
          open && 'border-line bg-surface-raised',
          collapsed && 'justify-center px-0',
        )}
      >
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold uppercase"
          style={{
            background: `hsl(${workspace.hue} 60% 20%)`,
            color: `hsl(${workspace.hue} 90% 72%)`,
          }}
        >
          {workspace.name.slice(0, 2)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">
                {workspace.name}
              </span>
              <span className="block truncate text-[10px] text-ink-faint">
                {PLAN_LABEL[workspace.plan]} plan
              </span>
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
          </>
        )}
      </button>

      <Popover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        placement={collapsed ? 'right' : 'bottom-start'}
        ariaLabel="Switch workspace"
      >
        <div
          role="listbox"
          className="w-64 overflow-hidden rounded-lg border border-line bg-surface-overlay p-1 shadow-xl"
        >
          <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Workspaces
          </p>
          {workspaces.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === workspace.id}
              onClick={() => {
                setWorkspaceId(item.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-raised"
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold uppercase"
                style={{
                  background: `hsl(${item.hue} 60% 20%)`,
                  color: `hsl(${item.hue} 90% 72%)`,
                }}
              >
                {item.name.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-ink">{item.name}</span>
                <span className="block text-[10px] text-ink-faint">
                  {item.memberIds.length} members
                </span>
              </span>
              {item.id === workspace.id && (
                <Check className="size-3.5 shrink-0 text-accent" aria-hidden />
              )}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setCreateOpen(true)
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <span className="flex size-6 items-center justify-center rounded-md border border-dashed border-line">
              <Plus className="size-3" aria-hidden />
            </span>
            New workspace
          </button>
        </div>
      </Popover>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New workspace"
        description="Workspaces keep workflows, integrations and members separate."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              loading={form.formState.isSubmitting}
            >
              Create workspace
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            label="Name"
            required
            error={form.formState.errors.name?.message}
            htmlFor="ws-name"
          >
            <Input
              id="ws-name"
              placeholder="Growth Team"
              invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
          </Field>
          <Field label="Plan" htmlFor="ws-plan" hint="Plans can be changed later in billing.">
            <Select id="ws-plan" {...form.register('plan')}>
              <option value="free">Free</option>
              <option value="team">Team</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </>
  )
}
