import { memo, useEffect, useRef, useState } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import { Trash2 } from 'lucide-react'
import { useBuilder } from '../BuilderContext'
import { cn } from '@/lib/utils'
import type { AppNode } from '../graph'

/** Sticky note — plain text, movable, editable in place. */
export const NoteNode = memo(function NoteNode({ id, data, selected }: NodeProps<AppNode>) {
  const builder = useBuilder()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(data.text ?? ''))
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => setDraft(String(data.text ?? '')), [data.text])
  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  const commit = () => {
    setEditing(false)
    if (draft !== data.text) builder.patchNode(id, { text: draft })
  }

  return (
    <>
      <NodeResizer
        isVisible={selected && !builder.readOnly}
        minWidth={180}
        minHeight={96}
        lineClassName="!border-accent/50"
        handleClassName="!size-2 !rounded-[2px] !border-accent !bg-surface"
      />
      <div
        className={cn(
          'group/note relative flex h-full w-full flex-col rounded-lg border p-2.5 transition-colors',
          'border-state-warning/30 bg-state-warning/[0.08]',
          selected && 'ring-2 ring-accent/30',
        )}
        onDoubleClick={() => !builder.readOnly && setEditing(true)}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-[0.09em] text-state-warning">
            Note
          </span>
          {!builder.readOnly && (
            <button
              type="button"
              onClick={() => builder.deleteNode(id)}
              aria-label="Delete note"
              className="opacity-0 transition-opacity hover:text-state-danger group-hover/note:opacity-100"
            >
              <Trash2 className="size-3 text-ink-faint" aria-hidden />
            </button>
          )}
        </div>
        {editing ? (
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setDraft(String(data.text ?? ''))
                setEditing(false)
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
            }}
            className="nodrag flex-1 resize-none bg-transparent text-[11px] leading-5 text-ink outline-none"
            placeholder="Write a note…"
          />
        ) : (
          <p className="flex-1 overflow-hidden whitespace-pre-wrap break-words text-[11px] leading-5 text-ink">
            {data.text || (
              <span className="text-ink-faint">Double-click to write a note…</span>
            )}
          </p>
        )}
      </div>
    </>
  )
})
