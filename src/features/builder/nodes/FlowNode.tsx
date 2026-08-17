import { memo, useRef } from 'react'
import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react'
import {
  Check,
  Copy,
  EyeOff,
  LoaderCircle,
  MessageCircle,
  Play,
  Plus,
  Settings2,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Menu } from '@/components/ui/Menu'
import { useMenu } from '@/components/ui/useMenu'
import { Tooltip } from '@/components/ui/Tooltip'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { CATEGORY_STYLES } from '@/components/nodes/nodeStyles'
import { useBuilder } from '../BuilderContext'
import { getNodeDefinition } from '@/nodes/catalog'
import { describeCondition, type OperatorId } from '@/engine/operators'
import { missingFields } from '@/lib/validation'
import { cn } from '@/lib/utils'
import type { AppNode } from '../graph'

const NODE_WIDTH = 252

function summarise(type: string, config: Record<string, unknown>) {
  const text = (key: string) => (typeof config[key] === 'string' ? (config[key] as string) : '')
  if (type.startsWith('condition.')) {
    return describeCondition(
      text('left') || text('field'),
      (text('operator') || 'equals') as OperatorId,
      text('right'),
    )
  }
  switch (type) {
    case 'trigger.webhook':
      return text('endpoint').replace(/^https?:\/\//, '') || 'No endpoint yet'
    case 'trigger.schedule':
      return `${text('frequency') || 'daily'} · ${text('timezone') || 'UTC'}`
    case 'action.send_email':
    case 'integration.gmail':
      return text('to') ? `To ${text('to')}` : ''
    case 'integration.slack':
      return text('channel')
    case 'integration.telegram':
      return text('chatId') ? `Chat ${text('chatId')}` : ''
    case 'action.http_request':
    case 'integration.webhook':
      return `${text('method') || 'POST'} ${text('url').replace(/^https?:\/\//, '')}`.trim()
    case 'action.wait':
      return config.mode === 'until'
        ? `Until ${text('until')}`
        : `${config.amount ?? ''} ${text('unit')}`.trim()
    case 'action.create_deal':
      return text('name')
    case 'action.create_task':
      return text('title')
    default:
      if (type.startsWith('ai.')) return text('model') || 'flow-reason-1'
      return ''
  }
}

export const FlowNode = memo(function FlowNode({
  id,
  type,
  data,
  selected,
}: NodeProps<AppNode>) {
  const builder = useBuilder()
  const menu = useMenu()
  const nodeRef = useRef<HTMLDivElement>(null)
  const def = getNodeDefinition(type ?? '')
  const styles = CATEGORY_STYLES[def.category]

  const runtime = data.status
  const isRunning = runtime === 'running'
  const isSuccess = runtime === 'success'
  const isFailed = runtime === 'failed'
  const isSkipped = runtime === 'skipped'
  const disabled = Boolean(data.disabled)

  const missing = missingFields({
    id,
    type: (type ?? 'utility.log') as never,
    position: { x: 0, y: 0 },
    data,
  })
  const needsConfig = missing.length > 0 && !disabled
  const summary = summarise(type ?? '', data.config)
  const comments = builder.commentCounts[id] ?? 0

  const outputs = def.outputHandles
  const inputs = def.inputs

  return (
    <div
      ref={nodeRef}
      className="group/node relative"
      style={{ width: NODE_WIDTH }}
      onContextMenu={(event) => {
        event.preventDefault()
        menu.show()
      }}
    >
      <NodeToolbar isVisible={selected && !builder.readOnly} position={Position.Top} offset={10}>
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-overlay p-1 shadow-lg">
          <ToolbarButton label="Configure" onClick={() => builder.openConfig(id)}>
            <Settings2 className="size-3.5" aria-hidden />
          </ToolbarButton>
          <ToolbarButton label="Run from here" onClick={() => builder.runFrom(id)}>
            <Play className="size-3.5" aria-hidden />
          </ToolbarButton>
          <ToolbarButton label="Duplicate" onClick={() => builder.duplicateNode(id)}>
            <Copy className="size-3.5" aria-hidden />
          </ToolbarButton>
          <ToolbarButton label="Comments" onClick={() => builder.openComments(id)}>
            <MessageCircle className="size-3.5" aria-hidden />
          </ToolbarButton>
          <span className="mx-0.5 h-4 w-px bg-line" />
          <ToolbarButton
            label={disabled ? 'Enable' : 'Disable'}
            onClick={() => builder.toggleDisabled(id)}
          >
            <EyeOff className="size-3.5" aria-hidden />
          </ToolbarButton>
          <ToolbarButton label="Delete" danger onClick={() => builder.deleteNode(id)}>
            <Trash2 className="size-3.5" aria-hidden />
          </ToolbarButton>
        </div>
      </NodeToolbar>

      {/* input handles */}
      {inputs.map((handle, index) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type="target"
          position={Position.Left}
          isConnectable={!builder.readOnly}
          style={
            inputs.length > 1
              ? { top: `${((index + 1) / (inputs.length + 1)) * 100}%` }
              : undefined
          }
        />
      ))}

      <div
        className={cn(
          'relative rounded-xl border bg-surface transition-[box-shadow,border-color,transform] duration-200',
          'shadow-node hover:shadow-node-hover',
          selected
            ? 'border-accent/70 ring-2 ring-accent/25'
            : needsConfig
              ? 'border-state-warning/45'
              : 'border-line hover:border-line-strong',
          isRunning && 'border-state-running/70 ring-2 ring-state-running/25',
          isSuccess && 'border-state-success/60',
          isFailed && 'border-state-danger/70 ring-2 ring-state-danger/20',
          disabled && 'border-dashed opacity-55',
          isSkipped && 'opacity-60',
        )}
      >
        {/* running sweep */}
        {isRunning && (
          <span
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
            aria-hidden
          >
            <span className="absolute inset-x-0 top-0 h-px animate-[shimmer_1.4s_linear_infinite] bg-gradient-to-r from-transparent via-state-running to-transparent" />
          </span>
        )}

        <header className="flex items-center gap-2 px-3 pt-2.5">
          <NodeIcon type={type ?? ''} size="sm" />
          <span
            className={cn(
              'flex-1 truncate text-[9px] font-semibold uppercase tracking-[0.09em]',
              styles.text,
            )}
          >
            {def.category === 'condition' ? 'Logic' : def.category}
          </span>

          {comments > 0 && (
            <Tooltip content={`${comments} open comment${comments > 1 ? 's' : ''}`}>
              <button
                type="button"
                onClick={() => builder.openComments(id)}
                className="flex items-center gap-0.5 rounded-full bg-surface-raised px-1.5 py-px text-[9px] text-ink-muted transition-colors hover:text-ink"
              >
                <MessageCircle className="size-2.5" aria-hidden />
                {comments}
              </button>
            </Tooltip>
          )}

          <StatusGlyph
            running={isRunning}
            success={isSuccess}
            failed={isFailed}
            needsConfig={needsConfig}
            disabled={disabled}
          />

          <button
            ref={menu.anchorRef}
            type="button"
            onClick={menu.toggle}
            aria-label={`${data.label} actions`}
            className="-mr-1 flex size-5 items-center justify-center rounded text-ink-faint opacity-0 transition-opacity hover:text-ink group-hover/node:opacity-100 focus-visible:opacity-100"
          >
            <span className="text-[13px] leading-none">⋯</span>
          </button>
        </header>

        <div className="px-3 pb-3 pt-1.5">
          <p className="truncate text-[13px] font-medium leading-5 text-ink">
            {data.label}
          </p>
          {(summary || data.description) && (
            <p className="mt-0.5 line-clamp-2 break-words text-[11px] leading-4 text-ink-faint">
              {summary || data.description}
            </p>
          )}
        </div>

        {needsConfig && (
          <div className="flex items-center gap-1.5 rounded-b-xl border-t border-state-warning/25 bg-state-warning/[0.07] px-3 py-1.5">
            <TriangleAlert className="size-3 shrink-0 text-state-warning" aria-hidden />
            <span className="truncate text-[10px] text-state-warning">
              Needs configuration
            </span>
          </div>
        )}
      </div>

      {/* output handles */}
      {outputs.map((handle, index) => {
        const top =
          outputs.length > 1 ? `${((index + 1) / (outputs.length + 1)) * 100}%` : '50%'
        return (
          <div key={handle.id}>
            <Handle
              id={handle.id}
              type="source"
              position={Position.Right}
              isConnectable={!builder.readOnly}
              style={{ top }}
              className={cn(
                handle.tone === 'positive' && '!bg-state-success',
                handle.tone === 'negative' && '!bg-state-danger',
              )}
            />
            {outputs.length > 1 && handle.label && (
              <span
                className={cn(
                  'pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded border px-1 text-[9px] font-semibold leading-4',
                  handle.tone === 'positive'
                    ? 'border-state-success/30 bg-state-success/10 text-state-success'
                    : handle.tone === 'negative'
                      ? 'border-state-danger/30 bg-state-danger/10 text-state-danger'
                      : 'border-line bg-surface text-ink-faint',
                )}
                style={{ top: `calc(${top} - 8px)` }}
              >
                {handle.label}
              </span>
            )}
            {!builder.readOnly && (
              <button
                type="button"
                onClick={() => builder.addFromHandle(id, handle.id)}
                aria-label={`Add node after ${data.label}${handle.label ? ` (${handle.label})` : ''}`}
                className="absolute left-full flex size-5 items-center justify-center rounded-full border border-line bg-surface text-ink-faint opacity-0 transition-all hover:border-accent hover:text-accent group-hover/node:opacity-100 focus-visible:opacity-100"
                style={{
                  top: `calc(${top} - 10px)`,
                  marginLeft: outputs.length > 1 && handle.label ? 44 : 10,
                }}
              >
                <Plus className="size-3" aria-hidden />
              </button>
            )}
          </div>
        )
      })}

      <Menu
        open={menu.open}
        anchorRef={menu.anchorRef}
        onClose={menu.close}
        placement="bottom-start"
        ariaLabel={`${data.label} actions`}
        items={[
          {
            id: 'configure',
            label: 'Configure',
            icon: <Settings2 className="size-3.5" />,
            onSelect: () => builder.openConfig(id),
          },
          {
            id: 'rename',
            label: 'Rename',
            icon: <Settings2 className="size-3.5" />,
            disabled: builder.readOnly,
            onSelect: () => builder.renameNode(id),
          },
          {
            id: 'duplicate',
            label: 'Duplicate',
            icon: <Copy className="size-3.5" />,
            shortcut: '⌘D',
            disabled: builder.readOnly,
            onSelect: () => builder.duplicateNode(id),
          },
          {
            id: 'run',
            label: 'Run from here',
            icon: <Play className="size-3.5" />,
            separated: true,
            disabled: builder.isRunning,
            onSelect: () => builder.runFrom(id),
          },
          {
            id: 'comment',
            label: 'Add comment',
            icon: <MessageCircle className="size-3.5" />,
            onSelect: () => builder.openComments(id),
          },
          {
            id: 'disable',
            label: disabled ? 'Enable node' : 'Disable node',
            icon: <EyeOff className="size-3.5" />,
            separated: true,
            disabled: builder.readOnly,
            onSelect: () => builder.toggleDisabled(id),
          },
          {
            id: 'delete',
            label: 'Delete',
            icon: <Trash2 className="size-3.5" />,
            tone: 'danger',
            shortcut: 'Del',
            disabled: builder.readOnly,
            onSelect: () => builder.deleteNode(id),
          },
        ]}
      />
    </div>
  )
})

function ToolbarButton({
  label,
  onClick,
  children,
  danger,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <Tooltip content={label} delay={200}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          'flex size-6 items-center justify-center rounded-md transition-colors',
          danger
            ? 'text-ink-faint hover:bg-state-danger/10 hover:text-state-danger'
            : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
        )}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function StatusGlyph({
  running,
  success,
  failed,
  needsConfig,
  disabled,
}: {
  running: boolean
  success: boolean
  failed: boolean
  needsConfig: boolean
  disabled: boolean
}) {
  if (running) {
    return (
      <LoaderCircle
        className="size-3.5 shrink-0 animate-spin text-state-running"
        aria-label="Running"
      />
    )
  }
  if (success) {
    return (
      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-state-success/15">
        <Check className="size-2.5 text-state-success" aria-label="Succeeded" />
      </span>
    )
  }
  if (failed) {
    return (
      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-state-danger/15">
        <X className="size-2.5 text-state-danger" aria-label="Failed" />
      </span>
    )
  }
  if (disabled) {
    return <EyeOff className="size-3.5 shrink-0 text-ink-faint" aria-label="Disabled" />
  }
  if (needsConfig) {
    return (
      <TriangleAlert
        className="size-3.5 shrink-0 text-state-warning"
        aria-label="Needs configuration"
      />
    )
  }
  return null
}
