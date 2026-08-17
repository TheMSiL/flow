import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Bell,
  Building2,
  CreditCard,
  Ellipsis,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Settings as SettingsIcon,
  Shield,
  Sun,
  TriangleAlert,
  UserPlus,
  Users,
} from 'lucide-react'
import { PageBody } from '@/components/layout/AppShell'
import { Topbar } from '@/components/layout/Topbar'
import { PageHeader, SectionHeader } from '@/components/common/PageHeader'
import {
  Badge,
  Button,
  Callout,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  Segmented,
  Select,
  Switch,
  Tabs,
} from '@/components/ui'
import { Menu } from '@/components/ui/Menu'
import { useMenu } from '@/components/ui/useMenu'
import { Avatar } from '@/components/ui/Avatar'
import { useDb } from '@/hooks/useDb'
import { useSettings } from '@/app/providers/SettingsProvider'
import { useWorkspace } from '@/app/providers/WorkspaceProvider'
import { useToast } from '@/app/providers/ToastProvider'
import { userService, workspaceService } from '@/services/workspace.service'
import { db } from '@/services/db'
import { resetStorage } from '@/lib/storage'
import { inviteSchema, type InviteInput } from '@/lib/validation'
import { formatDate, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DbState } from '@/services/db'
import type { Role } from '@/types/workspace'

const TABS = [
  { id: 'general', label: 'General', icon: <SettingsIcon className="size-3.5" /> },
  { id: 'workspace', label: 'Workspace', icon: <Building2 className="size-3.5" /> },
  { id: 'members', label: 'Members', icon: <Users className="size-3.5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="size-3.5" /> },
  { id: 'appearance', label: 'Appearance', icon: <Palette className="size-3.5" /> },
  { id: 'security', label: 'Security', icon: <Shield className="size-3.5" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="size-3.5" /> },
] as const

type TabId = (typeof TABS)[number]['id']

export default function SettingsPage() {
  const { tab = 'general' } = useParams()
  const navigate = useNavigate()
  const active = (TABS.some((t) => t.id === tab) ? tab : 'general') as TabId

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Settings', to: '/settings/general' },
          { label: TABS.find((t) => t.id === active)!.label },
        ]}
      />
      <PageBody>
        <PageHeader
          title="Settings"
          description="Workspace configuration, members and preferences."
        />

        <div className="mt-5">
          <Tabs
            layoutId="settings-tabs"
            items={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
            value={active}
            onChange={(value) => navigate(`/settings/${value}`)}
            ariaLabel="Settings sections"
          />
        </div>

        <div className="mt-5 max-w-3xl">
          {active === 'general' && <GeneralTab />}
          {active === 'workspace' && <WorkspaceTab />}
          {active === 'members' && <MembersTab />}
          {active === 'notifications' && <NotificationsTab />}
          {active === 'appearance' && <AppearanceTab />}
          {active === 'security' && <SecurityTab />}
          {active === 'billing' && <BillingTab />}
        </div>
      </PageBody>
    </>
  )
}

/* --------------------------------- shared -------------------------------- */

function Card({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <section className="surface-card mb-4 overflow-hidden">
      <header className="border-b border-line px-4 py-3">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">{description}</p>
        )}
      </header>
      <div className="space-y-4 p-4">{children}</div>
      {footer && (
        <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-sunken/50 px-4 py-3">
          {footer}
        </footer>
      )}
    </section>
  )
}

/* -------------------------------- general -------------------------------- */

function GeneralTab() {
  const { settings, update } = useSettings()
  const { currentUser } = useWorkspace()
  const { toast } = useToast()
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <>
      <Card title="Profile" description="How you appear to the rest of the workspace.">
        <div className="flex items-center gap-3">
          <Avatar user={currentUser} size="xl" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">{currentUser.name}</p>
            <p className="text-xs text-ink-muted">{currentUser.email}</p>
            <p className="mt-1 text-[11px] text-ink-faint">{currentUser.title}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Display name" htmlFor="profile-name">
            <Input id="profile-name" defaultValue={currentUser.name} />
          </Field>
          <Field label="Email" htmlFor="profile-email">
            <Input id="profile-email" defaultValue={currentUser.email} type="email" />
          </Field>
        </div>
      </Card>

      <Card
        title="Builder defaults"
        description="Applied to every workflow you open."
      >
        <Switch
          checked={settings.autoSave}
          onChange={(value) => update({ autoSave: value })}
          label="Autosave"
          description="Persist canvas changes shortly after you stop editing."
        />
        <Switch
          checked={settings.snapToGrid}
          onChange={(value) => update({ snapToGrid: value })}
          label="Snap to grid"
          description="Align nodes to a 16px grid while dragging."
        />
        <Switch
          checked={settings.showMinimap}
          onChange={(value) => update({ showMinimap: value })}
          label="Show minimap"
          description="Keep the canvas overview visible in the corner."
        />
        <Field
          label="Default execution speed"
          hint="Used when you press Test without changing the speed."
          htmlFor="exec-speed"
        >
          <Select
            id="exec-speed"
            value={settings.executionSpeed}
            onChange={(e) =>
              update({ executionSpeed: e.target.value as typeof settings.executionSpeed })
            }
          >
            <option value="normal">Normal — 300–700ms per node</option>
            <option value="fast">Fast — 100–200ms per node</option>
            <option value="instant">Instant — skip the animation</option>
          </Select>
        </Field>
      </Card>

      <Card
        title="Demo data"
        description="FLOW stores everything in this browser. Reset to return to the seeded dataset."
        footer={
          <Button
            variant="secondary"
            icon={<RotateCcw className="size-3.5" />}
            onClick={() => setResetOpen(true)}
          >
            Reset demo data
          </Button>
        }
      >
        <Callout tone="info" title="Local-first">
          Workflows, runs, integrations and comments live in localStorage. Nothing is sent
          to a server — the service layer is shaped so a real API can replace it without
          touching the UI.
        </Callout>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetStorage()
          db.reset()
          setResetOpen(false)
          toast({
            tone: 'success',
            title: 'Demo data reset',
            description: 'The seeded workspace has been restored.',
          })
        }}
        title="Reset all demo data?"
        description="Every workflow you created or edited in this browser will be replaced by the original dataset."
        confirmLabel="Reset everything"
      />
    </>
  )
}

/* ------------------------------- workspace ------------------------------- */

function WorkspaceTab() {
  const { workspace, workspaces } = useWorkspace()
  const { toast } = useToast()
  const [name, setName] = useState(workspace.name)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
      <Card
        title="Workspace"
        description="Names and identifiers for this workspace."
        footer={
          <Button
            variant="primary"
            onClick={async () => {
              await workspaceService.renameWorkspace(workspace.id, name)
              toast({ tone: 'success', title: 'Workspace updated' })
            }}
          >
            Save changes
          </Button>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="ws-name">
            <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Slug" htmlFor="ws-slug" hint="Used in URLs and webhook paths.">
            <Input id="ws-slug" value={workspace.slug} readOnly />
          </Field>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">Plan</dt>
            <dd className="mt-1 text-[13px] font-medium capitalize text-ink">
              {workspace.plan}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">Members</dt>
            <dd className="tabular mt-1 text-[13px] font-medium text-ink">
              {workspace.memberIds.length}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">Created</dt>
            <dd className="mt-1 text-[13px] font-medium text-ink">
              {formatDate(workspace.createdAt)}
            </dd>
          </div>
        </dl>
      </Card>

      <Card
        title="Danger zone"
        description="Deleting a workspace removes its workflows and run history."
        footer={
          <Button
            variant="danger"
            disabled={workspaces.length <= 1}
            onClick={() => setDeleteOpen(true)}
          >
            Delete workspace
          </Button>
        }
      >
        <Callout
          tone="danger"
          title="This cannot be undone"
          icon={<TriangleAlert className="size-4" aria-hidden />}
        >
          {workspaces.length <= 1
            ? 'You cannot delete your only workspace.'
            : `“${workspace.name}” and everything inside it will be removed.`}
        </Callout>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await workspaceService.deleteWorkspace(workspace.id)
          setDeleteOpen(false)
          toast({ tone: 'success', title: 'Workspace deleted' })
        }}
        title={`Delete “${workspace.name}”?`}
        description="All workflows, runs and comments in this workspace are permanently removed."
        confirmLabel="Delete workspace"
      />
    </>
  )
}

/* -------------------------------- members -------------------------------- */

const ROLE_COPY: Record<Role, { label: string; description: string }> = {
  admin: { label: 'Admin', description: 'Full access, including billing and members' },
  editor: { label: 'Editor', description: 'Create, edit and publish workflows' },
  viewer: { label: 'Viewer', description: 'Read-only access to workflows and runs' },
}

function MembersTab() {
  const { workspace } = useWorkspace()
  const users = useDb((s: DbState) => s.users)
  const { toast } = useToast()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)

  const members = useMemo(
    () => users.filter((u) => workspace.memberIds.includes(u.id)),
    [users, workspace.memberIds],
  )

  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'editor' },
  })

  const submit = form.handleSubmit(async (values) => {
    const user = await userService.inviteMember({ ...values, workspaceId: workspace.id })
    setInviteOpen(false)
    form.reset()
    toast({
      tone: 'success',
      title: 'Invitation sent',
      description: `${user.email} was invited as ${ROLE_COPY[values.role].label.toLowerCase()}.`,
    })
  })

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <SectionHeader
          title={`${members.length} members`}
          description="Roles control what each person can do in this workspace."
        />
        <Button
          variant="primary"
          size="sm"
          icon={<UserPlus className="size-3.5" />}
          onClick={() => setInviteOpen(true)}
        >
          Invite member
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-wider text-ink-faint">
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Member
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Role
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-3 py-2.5 font-medium">
                  Last active
                </th>
                <th scope="col" className="w-10 px-2 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onRemove={() => setRemoving(member.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(Object.keys(ROLE_COPY) as Role[]).map((role) => (
          <div key={role} className="surface-card p-3.5">
            <div className="flex items-center gap-2">
              <Shield className="size-3.5 text-ink-faint" aria-hidden />
              <h3 className="text-[13px] font-medium text-ink">{ROLE_COPY[role].label}</h3>
            </div>
            <p className="mt-1 text-[11px] leading-5 text-ink-muted">
              {ROLE_COPY[role].description}
            </p>
          </div>
        ))}
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a member"
        description="They will get access to every workflow in this workspace."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={form.formState.isSubmitting}>
              Send invitation
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field
            label="Work email"
            required
            htmlFor="invite-email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="invite-email"
              type="email"
              placeholder="teammate@acmelabs.co"
              invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
          </Field>
          <Field label="Role" htmlFor="invite-role">
            <Select id="invite-role" {...form.register('role')}>
              {(Object.keys(ROLE_COPY) as Role[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_COPY[role].label} — {ROLE_COPY[role].description}
                </option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (removing) await userService.removeMember(removing)
          setRemoving(null)
          toast({ tone: 'success', title: 'Member removed' })
        }}
        title="Remove this member?"
        description="They immediately lose access to this workspace."
        confirmLabel="Remove member"
      />
    </>
  )
}

function MemberRow({
  member,
  onRemove,
}: {
  member: DbState['users'][number]
  onRemove: () => void
}) {
  const menu = useMenu()
  return (
    <tr className="group transition-colors hover:bg-surface-raised/60">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Avatar user={member} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">{member.name}</p>
            <p className="truncate text-[11px] text-ink-faint">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <Select
          sizeVariant="sm"
          aria-label={`Role for ${member.name}`}
          value={member.role}
          onChange={(e) => userService.updateRole(member.id, e.target.value as Role)}
          className="w-[6.5rem]"
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </Select>
      </td>
      <td className="px-3 py-2.5">
        <Badge
          size="xs"
          tone={
            member.status === 'active'
              ? 'success'
              : member.status === 'invited'
                ? 'warning'
                : 'muted'
          }
        >
          {member.status === 'active'
            ? 'Active'
            : member.status === 'invited'
              ? 'Invited'
              : 'Suspended'}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-[13px] text-ink-muted">
        {formatRelative(member.lastActiveAt)}
      </td>
      <td className="px-2 py-2.5">
        <button
          ref={menu.anchorRef}
          type="button"
          onClick={menu.toggle}
          aria-label={`Actions for ${member.name}`}
          className="flex size-7 items-center justify-center rounded-md text-ink-faint opacity-0 transition-all hover:bg-surface-raised hover:text-ink group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Ellipsis className="size-4" aria-hidden />
        </button>
        <Menu
          open={menu.open}
          anchorRef={menu.anchorRef}
          onClose={menu.close}
          ariaLabel={`${member.name} actions`}
          items={[
            { id: 'resend', label: 'Resend invitation', disabled: member.status !== 'invited' },
            { id: 'remove', label: 'Remove from workspace', tone: 'danger', onSelect: onRemove },
          ]}
        />
      </td>
    </tr>
  )
}

/* ------------------------------ notifications ---------------------------- */

function NotificationsTab() {
  const { settings, update } = useSettings()
  return (
    <Card
      title="Notifications"
      description="Choose what FLOW tells you about, and where."
    >
      <Switch
        checked={settings.notifyOnFailure}
        onChange={(value) => update({ notifyOnFailure: value })}
        label="Workflow failures"
        description="Get notified the moment a run errors out."
      />
      <Switch
        checked={settings.notifyOnPublish}
        onChange={(value) => update({ notifyOnPublish: value })}
        label="Publishes"
        description="When a teammate ships a new version to production."
      />
      <Switch
        checked={settings.notifyOnComment}
        onChange={(value) => update({ notifyOnComment: value })}
        label="Comments and mentions"
        description="Replies on nodes you own or follow."
      />
      <Switch
        checked={settings.emailDigest}
        onChange={(value) => update({ emailDigest: value })}
        label="Weekly email digest"
        description="A Monday summary of volume, failures and time saved."
      />
    </Card>
  )
}

/* ------------------------------- appearance ------------------------------ */

function AppearanceTab() {
  const { theme, setTheme, settings, update } = useSettings()

  return (
    <>
      <Card title="Theme" description="FLOW is dark-first, with a full light mode.">
        <Segmented
          ariaLabel="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'dark', label: 'Dark', icon: <Moon className="size-3.5" /> },
            { value: 'light', label: 'Light', icon: <Sun className="size-3.5" /> },
            { value: 'system', label: 'System', icon: <Monitor className="size-3.5" /> },
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <ThemePreview mode="dark" active={theme === 'dark'} onClick={() => setTheme('dark')} />
          <ThemePreview mode="light" active={theme === 'light'} onClick={() => setTheme('light')} />
        </div>
      </Card>

      <Card title="Motion" description="Execution animation is the loudest thing in FLOW.">
        <Switch
          checked={settings.reduceMotion}
          onChange={(value) => update({ reduceMotion: value })}
          label="Reduce motion"
          description="Disables flow particles and node transitions. Your OS setting is respected automatically."
        />
      </Card>
    </>
  )
}

function ThemePreview({
  mode,
  active,
  onClick,
}: {
  mode: 'dark' | 'light'
  active: boolean
  onClick: () => void
}) {
  const dark = mode === 'dark'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'overflow-hidden rounded-lg border p-2 text-left transition-colors',
        active ? 'border-accent/60 ring-2 ring-accent/20' : 'border-line hover:border-line-strong',
      )}
    >
      <div
        className="rounded-md p-2"
        style={{ background: dark ? '#0D0F12' : '#F5F6F8' }}
      >
        <div className="flex gap-1.5">
          <div
            className="h-14 w-8 rounded"
            style={{ background: dark ? '#121418' : '#FFFFFF' }}
          />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-3 w-full rounded"
              style={{ background: dark ? '#181B20' : '#FFFFFF' }}
            />
            <div className="flex gap-1.5">
              <div
                className="h-8 flex-1 rounded"
                style={{ background: dark ? '#181B20' : '#FFFFFF' }}
              />
              <div
                className="h-8 w-6 rounded"
                style={{ background: dark ? '#C7F53D' : '#6A9E06' }}
              />
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 px-1 text-[12px] font-medium text-ink">
        {dark ? 'Dark' : 'Light'}
      </p>
    </button>
  )
}

/* -------------------------------- security ------------------------------- */

function SecurityTab() {
  const { settings, update, role } = useSettings()

  return (
    <>
      <Card
        title="Simulated role"
        description="Preview how FLOW looks to teammates with fewer permissions."
      >
        <Segmented
          ariaLabel="Simulated role"
          value={settings.simulatedRole ?? 'admin'}
          onChange={(value) =>
            update({ simulatedRole: value === 'admin' ? null : (value as Role) })
          }
          options={[
            { value: 'admin', label: 'Admin' },
            { value: 'editor', label: 'Editor' },
            { value: 'viewer', label: 'Viewer' },
          ]}
        />
        <Callout
          tone={role === 'viewer' ? 'warning' : 'info'}
          title={`Currently browsing as ${ROLE_COPY[role].label}`}
        >
          {role === 'admin'
            ? 'Everything is available, including billing and member management.'
            : role === 'editor'
              ? 'You can build and publish workflows, but not manage members or billing.'
              : 'Editing is hidden — the builder is read-only and destructive actions are disabled.'}
        </Callout>
      </Card>

      <Card title="Sessions" description="Devices currently signed in to your account.">
        <ul className="divide-y divide-line">
          {[
            { device: 'MacBook Pro · Chrome', location: 'Kyiv, UA', current: true },
            { device: 'iPhone 15 · Safari', location: 'Kyiv, UA', current: false },
          ].map((session) => (
            <li key={session.device} className="flex items-center gap-3 py-2.5 first:pt-0">
              <Monitor className="size-4 shrink-0 text-ink-faint" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-ink">{session.device}</p>
                <p className="text-[11px] text-ink-faint">{session.location}</p>
              </div>
              {session.current ? (
                <Badge tone="success" size="xs">
                  This device
                </Badge>
              ) : (
                <Button size="xs" variant="ghost">
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

/* -------------------------------- billing -------------------------------- */

function BillingTab() {
  const { workspace } = useWorkspace()
  const executions = useDb((s: DbState) => s.executions.length)

  return (
    <>
      <Card
        title="Plan"
        description="Mock billing — no payment method is ever collected."
        footer={<Button variant="secondary">Change plan</Button>}
      >
        <div className="flex items-center justify-between gap-4 rounded-lg border border-accent/30 bg-accent/[0.05] p-3.5">
          <div>
            <p className="text-[13px] font-semibold capitalize text-ink">
              {workspace.plan} plan
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Unlimited workflows · 50,000 executions per month · priority support
            </p>
          </div>
          <Badge tone="accent">Active</Badge>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">
              Executions
            </dt>
            <dd className="tabular mt-1 text-[13px] font-medium text-ink">
              {executions.toLocaleString()} logged
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">Seats</dt>
            <dd className="tabular mt-1 text-[13px] font-medium text-ink">
              {workspace.memberIds.length}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-ink-faint">
              Renews
            </dt>
            <dd className="mt-1 text-[13px] font-medium text-ink">1 Sep 2026</dd>
          </div>
        </dl>
      </Card>

      <Card title="Invoices" description="The last three billing periods.">
        <ul className="divide-y divide-line">
          {[
            { id: 'INV-2026-08', amount: '$84.20', date: 'Aug 1, 2026' },
            { id: 'INV-2026-07', amount: '$79.10', date: 'Jul 1, 2026' },
            { id: 'INV-2026-06', amount: '$71.85', date: 'Jun 1, 2026' },
          ].map((invoice) => (
            <li key={invoice.id} className="flex items-center gap-3 py-2.5 first:pt-0">
              <CreditCard className="size-4 shrink-0 text-ink-faint" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[12px] text-ink">{invoice.id}</p>
                <p className="text-[11px] text-ink-faint">{invoice.date}</p>
              </div>
              <span className="tabular text-[13px] font-medium text-ink">
                {invoice.amount}
              </span>
              <Badge tone="success" size="xs">
                Paid
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
