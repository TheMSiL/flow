import { useMemo } from 'react'
import { getNodeDefinition, isCanvasPrimitive } from '@/nodes/catalog'
import { CATEGORY_CSS_VAR } from './nodeStyles'
import { cn } from '@/lib/utils'
import type { WorkflowNode } from '@/types/node'
import type { WorkflowEdge } from '@/types/workflow'

const NODE_W = 252
const NODE_H = 84

/**
 * Static, dependency-free preview of a graph. Used on template cards and in
 * the template preview — mounting React Flow for a thumbnail would be a
 * heavy price for something that never needs interaction.
 */
export function WorkflowMiniature({
  nodes,
  edges,
  className,
  height = 160,
  showLabels = false,
}: {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  className?: string
  height?: number
  showLabels?: boolean
}) {
  const layout = useMemo(() => {
    const executable = nodes.filter((n) => !isCanvasPrimitive(n.type))
    if (!executable.length) return null

    const minX = Math.min(...executable.map((n) => n.position.x))
    const maxX = Math.max(...executable.map((n) => n.position.x)) + NODE_W
    const minY = Math.min(...executable.map((n) => n.position.y))
    const maxY = Math.max(...executable.map((n) => n.position.y)) + NODE_H
    const padding = 28

    return {
      nodes: executable,
      viewBox: `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`,
      positions: new Map(executable.map((n) => [n.id, n.position])),
    }
  }, [nodes])

  if (!layout) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-dashed border-line text-[11px] text-ink-faint',
          className,
        )}
        style={{ height }}
      >
        Empty workflow
      </div>
    )
  }

  return (
    <svg
      viewBox={layout.viewBox}
      className={cn('w-full', className)}
      style={{ height }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Preview of a workflow with ${layout.nodes.length} nodes`}
    >
      {edges.map((edge) => {
        const from = layout.positions.get(edge.source)
        const to = layout.positions.get(edge.target)
        if (!from || !to) return null
        const x1 = from.x + NODE_W
        const y1 = from.y + NODE_H / 2
        const x2 = to.x
        const y2 = to.y + NODE_H / 2
        const dx = Math.max(60, Math.abs(x2 - x1) * 0.4)
        return (
          <path
            key={edge.id}
            d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="rgb(var(--c-line-strong))"
            strokeWidth={3}
          />
        )
      })}

      {layout.nodes.map((node) => {
        const def = getNodeDefinition(node.type)
        const colour = CATEGORY_CSS_VAR[def.category]
        return (
          <g key={node.id}>
            <rect
              x={node.position.x}
              y={node.position.y}
              width={NODE_W}
              height={NODE_H}
              rx={14}
              fill="rgb(var(--c-surface))"
              stroke="rgb(var(--c-line))"
              strokeWidth={2}
            />
            <rect
              x={node.position.x + 16}
              y={node.position.y + 18}
              width={30}
              height={30}
              rx={8}
              fill={colour}
              fillOpacity={0.18}
              stroke={colour}
              strokeOpacity={0.4}
              strokeWidth={2}
            />
            <circle
              cx={node.position.x + 31}
              cy={node.position.y + 33}
              r={5}
              fill={colour}
            />
            {showLabels ? (
              <text
                x={node.position.x + 58}
                y={node.position.y + 38}
                fill="rgb(var(--c-ink))"
                fontSize={16}
                fontFamily="inherit"
                fontWeight={500}
              >
                {node.data.label.length > 22
                  ? `${node.data.label.slice(0, 21)}…`
                  : node.data.label}
              </text>
            ) : (
              <>
                <rect
                  x={node.position.x + 58}
                  y={node.position.y + 24}
                  width={120}
                  height={9}
                  rx={4}
                  fill="rgb(var(--c-ink-muted))"
                  fillOpacity={0.5}
                />
                <rect
                  x={node.position.x + 58}
                  y={node.position.y + 41}
                  width={80}
                  height={7}
                  rx={3}
                  fill="rgb(var(--c-ink-faint))"
                  fillOpacity={0.4}
                />
              </>
            )}
          </g>
        )
      })}
    </svg>
  )
}
