import { memo, useId } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppEdge } from '../graph'

const BRANCH_TONE: Record<string, string> = {
  YES: 'text-state-success border-state-success/30 bg-state-success/10',
  PASS: 'text-state-success border-state-success/30 bg-state-success/10',
  NO: 'text-state-danger border-state-danger/30 bg-state-danger/10',
  DROP: 'text-state-danger border-state-danger/30 bg-state-danger/10',
  ELSE: 'text-ink-faint border-line bg-surface',
}

/**
 * Connection between two nodes.
 *
 * Idle it is a hairline; while the run passes through it, a dashed overlay
 * plus two travelling dots make the direction of data obvious — this is the
 * execution animation's most-repeated element, so it stays cheap: two SVG
 * elements and a CSS keyframe, no per-frame React work.
 */
export const FlowEdge = memo(function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<AppEdge>) {
  const { setEdges } = useReactFlow()
  const pathId = useId()
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.32,
  })

  const state = data?.state ?? 'idle'
  const active = state === 'active'
  const done = state === 'done'
  const skipped = state === 'skipped'
  const label = data?.branchLabel

  const stroke = selected
    ? 'rgb(var(--c-accent))'
    : active
      ? 'rgb(var(--c-running))'
      : done
        ? 'rgb(var(--c-success) / 0.75)'
        : skipped
          ? 'rgb(var(--c-line))'
          : 'rgb(var(--c-line-strong))'

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth: active || selected ? 2 : 1.5,
          strokeDasharray: skipped ? '4 4' : undefined,
          opacity: skipped ? 0.45 : 1,
          transition: 'stroke 180ms var(--ease-out), stroke-width 180ms var(--ease-out)',
        }}
      />

      {active && (
        <>
          <path
            id={pathId}
            d={path}
            fill="none"
            stroke="rgb(var(--c-running))"
            strokeWidth={2}
            strokeDasharray="6 10"
            className="animate-dash-flow"
            opacity={0.9}
          />
          <circle r="3" fill="rgb(var(--c-running))">
            <animateMotion dur="1s" repeatCount="indefinite" path={path} />
          </circle>
          <circle r="2" fill="rgb(var(--c-running))" opacity="0.5">
            <animateMotion dur="1s" begin="0.35s" repeatCount="indefinite" path={path} />
          </circle>
        </>
      )}

      {(label || selected) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan flex items-center gap-1"
          >
            {label && (
              <span
                className={cn(
                  'rounded border px-1.5 py-px text-[9px] font-semibold tracking-wide',
                  BRANCH_TONE[label] ?? 'border-line bg-surface text-ink-faint',
                )}
              >
                {label}
              </span>
            )}
            {selected && (
              <button
                type="button"
                onClick={() => setEdges((edges) => edges.filter((e) => e.id !== id))}
                aria-label="Delete connection"
                className="flex size-4 items-center justify-center rounded-full border border-line bg-surface text-ink-faint shadow-sm transition-colors hover:border-state-danger hover:text-state-danger"
              >
                <X className="size-2.5" aria-hidden />
              </button>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
