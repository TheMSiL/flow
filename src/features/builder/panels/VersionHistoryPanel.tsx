import { useState } from 'react'
import { GitBranch, History, RotateCcw } from 'lucide-react'
import { Badge, Button, ConfirmDialog } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/app/providers/ToastProvider'
import { workflowService } from '@/services/workflow.service'
import { getUser } from '@/data/users'
import { formatDateTime, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Workflow } from '@/types/workflow'

export function VersionHistoryPanel({
  workflow,
  readOnly,
}: {
  workflow: Workflow
  readOnly: boolean
}) {
  const { toast } = useToast()
  const [restoring, setRestoring] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const restore = async () => {
    if (restoring === null) return
    setBusy(true)
    await workflowService.restoreVersion(workflow.id, restoring)
    setBusy(false)
    setRestoring(null)
    toast({
      tone: 'success',
      title: `Restored version ${restoring}`,
      description: 'A new draft version was created from that snapshot.',
    })
  }

  return (
    <div className="p-4">
      <header className="mb-3 flex items-center gap-2">
        <History className="size-4 text-ink-faint" aria-hidden />
        <div>
          <h2 className="text-[13px] font-semibold text-ink">Version history</h2>
          <p className="text-[11px] text-ink-faint">
            {workflow.versions.length} versions · currently on v{workflow.version}
          </p>
        </div>
      </header>

      <ol className="relative space-y-1">
        <span
          className="absolute bottom-3 left-[13px] top-3 w-px bg-line"
          aria-hidden
        />
        {workflow.versions.map((version) => {
          const author = getUser(version.authorId)
          const current = version.version === workflow.version
          return (
            <li key={version.id} className="relative pl-8">
              <span
                className={cn(
                  'absolute left-[7px] top-3 size-3 rounded-full border-2 border-surface',
                  version.status === 'published' ? 'bg-state-success' : 'bg-state-idle',
                )}
                aria-hidden
              />
              <div
                className={cn(
                  'rounded-lg border p-2.5 transition-colors',
                  current
                    ? 'border-accent/40 bg-accent/[0.04]'
                    : 'border-line bg-surface-sunken',
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-ink">
                    Version {version.version}
                  </span>
                  <Badge
                    tone={version.status === 'published' ? 'success' : 'neutral'}
                    size="xs"
                  >
                    {version.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                  {current && (
                    <Badge tone="accent" size="xs">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">{version.message}</p>
                {version.changes.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {version.changes.map((change, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-[10px] text-ink-faint"
                      >
                        <GitBranch className="mt-0.5 size-2.5 shrink-0" aria-hidden />
                        {change}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Avatar user={author} size="xs" />
                    <span className="truncate text-[10px] text-ink-faint">
                      {author.name.split(' ')[0]} ·{' '}
                      <span title={formatDateTime(version.createdAt)}>
                        {formatRelative(version.createdAt)}
                      </span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular shrink-0 text-[10px] text-ink-faint">
                      {version.nodeCount} nodes · {version.edgeCount} links
                    </span>
                    {!current && !readOnly && (
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={<RotateCcw className="size-3" />}
                        onClick={() => setRestoring(version.version)}
                      >
                        Restore
                      </Button>
                    )}
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      <ConfirmDialog
        open={restoring !== null}
        onClose={() => setRestoring(null)}
        onConfirm={restore}
        loading={busy}
        tone="primary"
        title={`Restore version ${restoring}?`}
        description="A new draft version is created from that snapshot. Nothing is deleted."
        confirmLabel="Restore version"
      />
    </div>
  )
}
