import { memo, useState } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { useBuilder } from '../BuilderContext'
import { cn } from '@/lib/utils'
import type { AppNode } from '../graph'

const TINTS: Record<string, string> = {
  violet: 'border-cat-trigger/35 bg-cat-trigger/[0.05]',
  cyan: 'border-cat-action/35 bg-cat-action/[0.05]',
  amber: 'border-cat-condition/35 bg-cat-condition/[0.05]',
  pink: 'border-cat-ai/35 bg-cat-ai/[0.05]',
  green: 'border-cat-integration/35 bg-cat-integration/[0.05]',
}

const LABEL_TINTS: Record<string, string> = {
  violet: 'text-cat-trigger',
  cyan: 'text-cat-action',
  amber: 'text-cat-condition',
  pink: 'text-cat-ai',
  green: 'text-cat-integration',
}

/**
 * Visual grouping container. Collapsing hides the members via the editor,
 * leaving a compact summary bar in place.
 */
export const GroupNode = memo(function GroupNode({ id, data, selected }: NodeProps<AppNode>) {
  const builder = useBuilder()
  const [editing, setEditing] = useState(false)
  const tint = String(data.color ?? 'violet')
  const collapsed = Boolean(data.collapsed)

  return (
    <>
      <NodeResizer
        isVisible={selected && !builder.readOnly && !collapsed}
        minWidth={280}
        minHeight={180}
        lineClassName="!border-accent/50"
        handleClassName="!size-2 !rounded-[2px] !border-accent !bg-surface"
      />
      <div
        className={cn(
          'group/group h-full w-full rounded-xl border-2 border-dashed transition-colors',
          TINTS[tint] ?? TINTS.violet,
          selected && 'ring-2 ring-accent/25',
          collapsed && 'h-auto border-solid bg-surface',
        )}
      >
        <div className="flex items-center gap-1.5 px-2.5 py-1.5">
          <button
            type="button"
            onClick={() => builder.patchNode(id, { collapsed: !collapsed })}
            aria-label={collapsed ? 'Expand group' : 'Collapse group'}
            aria-expanded={!collapsed}
            className="text-ink-faint transition-colors hover:text-ink"
          >
            {collapsed ? (
              <ChevronRight className="size-3.5" aria-hidden />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden />
            )}
          </button>
          {editing ? (
            <input
              autoFocus
              defaultValue={data.label}
              onBlur={(e) => {
                setEditing(false)
                builder.patchNode(id, { label: e.currentTarget.value })
              }}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="nodrag flex-1 bg-transparent text-[11px] font-semibold uppercase tracking-[0.09em] outline-none"
            />
          ) : (
            <span
              onDoubleClick={() => setEditing(true)}
              className={cn(
                'flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.09em]',
                LABEL_TINTS[tint] ?? LABEL_TINTS.violet,
              )}
            >
              {data.label}
            </span>
          )}
          {!builder.readOnly && (
            <button
              type="button"
              onClick={() => builder.deleteNode(id)}
              aria-label="Delete group"
              className="opacity-0 transition-opacity group-hover/group:opacity-100"
            >
              <Trash2 className="size-3 text-ink-faint hover:text-state-danger" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </>
  )
})
