import { CircleCheck, CircleX, TriangleAlert } from 'lucide-react'
import { EmptyState } from '@/components/ui/Feedback'
import { cn } from '@/lib/utils'
import type { ValidationResult } from '@/types/workflow'

interface Props {
  validation: ValidationResult
  onFocusNode: (nodeId: string) => void
}

export function ValidationPanel({ validation, onFocusNode }: Props) {
  const { issues, errorCount, warningCount } = validation

  return (
    <div className="p-4">
      <header className="mb-3">
        <h2 className="text-[13px] font-semibold text-ink">
          {issues.length === 0
            ? 'No issues found'
            : `${issues.length} issue${issues.length === 1 ? '' : 's'} found`}
        </h2>
        <p className="mt-0.5 text-[11px] text-ink-muted">
          {errorCount > 0
            ? `${errorCount} must be fixed before publishing${warningCount ? `, ${warningCount} warning${warningCount === 1 ? '' : 's'}` : ''}.`
            : warningCount > 0
              ? `${warningCount} warning${warningCount === 1 ? '' : 's'} — publishing is still allowed.`
              : 'This workflow is ready to publish.'}
        </p>
      </header>

      {issues.length === 0 ? (
        <EmptyState
          compact
          icon={<CircleCheck className="size-4 text-state-success" aria-hidden />}
          title="Everything checks out"
          description="Trigger, connections and required fields are all in place."
        />
      ) : (
        <ol className="space-y-1.5">
          {issues.map((issue, index) => {
            const isError = issue.severity === 'error'
            return (
              <li key={issue.id}>
                <button
                  type="button"
                  disabled={!issue.nodeId}
                  onClick={() => issue.nodeId && onFocusNode(issue.nodeId)}
                  className={cn(
                    'flex w-full gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                    isError
                      ? 'border-state-danger/25 bg-state-danger/[0.05] hover:border-state-danger/45'
                      : 'border-state-warning/25 bg-state-warning/[0.05] hover:border-state-warning/45',
                    !issue.nodeId && 'cursor-default',
                  )}
                >
                  <span className="mt-px shrink-0">
                    {isError ? (
                      <CircleX className="size-3.5 text-state-danger" aria-hidden />
                    ) : (
                      <TriangleAlert className="size-3.5 text-state-warning" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="tabular text-[10px] text-ink-faint">
                        {index + 1}.
                      </span>
                      <span className="text-[12px] font-medium text-ink">
                        {issue.title}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-5 text-ink-muted">
                      {issue.detail}
                    </span>
                    {issue.nodeId && (
                      <span className="mt-1 block text-[10px] text-ink-faint">
                        Click to focus the node
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
