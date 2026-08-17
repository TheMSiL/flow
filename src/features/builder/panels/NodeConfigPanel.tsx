import { useMemo, useState } from 'react'
import { CircleAlert, Play, RotateCcw, Trash2 } from 'lucide-react'
import { Badge, Button, Field, Tabs, Textarea } from '@/components/ui'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { FieldRenderer } from '../fields/FieldRenderer'
import { JsonViewer } from './JsonViewer'
import { NodeCommentsSection } from './NodeCommentsSection'
import { defaultConfigFor, getNodeDefinition } from '@/nodes/catalog'
import { buildVariableCatalog } from '@/lib/variables'
import { isFieldVisible, missingFields } from '@/lib/validation'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NodeConfig, WorkflowNodeData } from '@/types/node'
import type { ExecutionStep } from '@/types/execution'
import type { AppNode } from '../graph'
import type { Workflow } from '@/types/workflow'

interface Props {
  node: AppNode
  workflow: Pick<Workflow, 'id' | 'nodes' | 'edges'>
  step?: ExecutionStep
  readOnly: boolean
  isRunning: boolean
  onChange: (patch: Partial<WorkflowNodeData>) => void
  onDelete: () => void
  onRunFrom: () => void
}

type Tab = 'config' | 'data' | 'comments'

export function NodeConfigPanel({
  node,
  workflow,
  step,
  readOnly,
  isRunning,
  onChange,
  onDelete,
  onRunFrom,
}: Props) {
  const [tab, setTab] = useState<Tab>('config')
  const def = getNodeDefinition(node.type ?? '')
  const config = node.data.config

  const variables = useMemo(
    () => buildVariableCatalog(workflow, node.id),
    [workflow, node.id],
  )

  const visible = useMemo(
    () => def.fields.filter((field) => isFieldVisible(field, config)),
    [def.fields, config],
  )

  const missing = useMemo(
    () =>
      new Set(
        missingFields({
          id: node.id,
          type: (node.type ?? 'utility.log') as never,
          position: { x: 0, y: 0 },
          data: node.data,
        }).map((f) => f.key),
      ),
    [node.id, node.type, node.data],
  )

  const patchConfig = (patch: NodeConfig) =>
    onChange({ config: { ...config, ...patch } })

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line px-4 pb-3 pt-3.5">
        <div className="flex items-start gap-2.5">
          <NodeIcon type={node.type ?? ''} size="md" />
          <div className="min-w-0 flex-1">
            <input
              value={node.data.label}
              disabled={readOnly}
              onChange={(e) => onChange({ label: e.target.value })}
              aria-label="Node name"
              className="w-full truncate bg-transparent text-[13px] font-semibold text-ink outline-none focus:underline focus:decoration-accent/60 focus:underline-offset-4 disabled:opacity-70"
            />
            <p className="truncate text-[11px] text-ink-faint">{def.description}</p>
          </div>
          {node.data.disabled && (
            <Badge tone="muted" size="xs">
              Disabled
            </Badge>
          )}
        </div>

        <div className="mt-3">
          <Tabs
            variant="pill"
            layoutId="node-config-tabs"
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            ariaLabel="Node panel sections"
            items={[
              { id: 'config', label: 'Configure' },
              { id: 'data', label: 'Data', count: step ? 1 : undefined },
              { id: 'comments', label: 'Comments' },
            ]}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'config' && (
          <div className="space-y-4 p-4">
            {missing.size > 0 && (
              <div className="flex gap-2 rounded-md border border-state-warning/25 bg-state-warning/[0.07] p-2.5">
                <CircleAlert
                  className="mt-px size-3.5 shrink-0 text-state-warning"
                  aria-hidden
                />
                <p className="text-[11px] leading-5 text-state-warning">
                  {missing.size} required {missing.size === 1 ? 'field' : 'fields'} still
                  empty. The workflow cannot be published until they are set.
                </p>
              </div>
            )}

            {visible.length === 0 && (
              <p className="text-xs text-ink-faint">
                This node has no configuration.
              </p>
            )}

            {visible.map((field) => (
              <FieldRenderer
                key={field.key}
                field={field}
                config={config}
                variables={variables}
                disabled={readOnly}
                error={missing.has(field.key) ? `${field.label} is required` : undefined}
                onChange={patchConfig}
              />
            ))}

            <Field
              label="Node description"
              hint="Shown on the canvas card and in the run log."
              htmlFor="node-description"
            >
              <Textarea
                id="node-description"
                rows={2}
                disabled={readOnly}
                value={node.data.description ?? ''}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Optional note for your team"
              />
            </Field>

            <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw className="size-3.5" />}
                disabled={readOnly}
                onClick={() =>
                  onChange({ config: defaultConfigFor(node.type ?? 'utility.log') })
                }
              >
                Reset
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="size-3.5" />}
                  disabled={readOnly}
                  onClick={onDelete}
                  className="text-state-danger hover:bg-state-danger/10"
                >
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Play className="size-3.5" />}
                  disabled={isRunning}
                  onClick={onRunFrom}
                >
                  Test from here
                </Button>
              </div>
            </div>
          </div>
        )}

        {tab === 'data' && <DataTab node={node} step={step} />}

        {tab === 'comments' && (
          <NodeCommentsSection workflowId={workflow.id} nodeId={node.id} />
        )}
      </div>
    </div>
  )
}

function DataTab({ node, step }: { node: AppNode; step?: ExecutionStep }) {
  const def = getNodeDefinition(node.type ?? '')

  return (
    <div className="space-y-4 p-4">
      {step ? (
        <>
          <div className="flex items-center justify-between rounded-md border border-line bg-surface-sunken px-3 py-2">
            <span className="text-[11px] text-ink-muted">Last execution</span>
            <span
              className={cn(
                'tabular text-[11px] font-medium',
                step.status === 'failed' ? 'text-state-danger' : 'text-ink',
              )}
            >
              {step.status} · {formatDuration(step.durationMs)}
            </span>
          </div>

          {step.error && (
            <div className="rounded-md border border-state-danger/25 bg-state-danger/[0.07] p-3">
              <p className="text-[11px] font-medium text-state-danger">
                {step.error.title}
              </p>
              <p className="mt-1 text-[11px] leading-5 text-ink-muted">
                {step.error.message}
              </p>
              {step.error.hint && (
                <p className="mt-1.5 text-[11px] leading-5 text-ink-faint">
                  {step.error.hint}
                </p>
              )}
            </div>
          )}

          <JsonViewer title="Input" value={step.input} />
          <JsonViewer title="Output" value={step.output ?? {}} defaultOpen />
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
          <p className="text-xs text-ink-muted">No run data for this node yet.</p>
          <p className="mt-1 text-[11px] text-ink-faint">
            Run a test to capture its input and output.
          </p>
        </div>
      )}

      <section>
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Output schema
        </h3>
        <ul className="divide-y divide-line overflow-hidden rounded-md border border-line">
          {def.outputs.map((output) => (
            <li key={output.key} className="flex items-start gap-2 px-2.5 py-2">
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[11px] text-ink">{output.key}</span>
                <span className="block text-[10px] text-ink-faint">
                  {output.description}
                </span>
              </span>
              <span className="shrink-0 rounded border border-line px-1 py-px text-[9px] uppercase text-ink-faint">
                {output.type}
              </span>
            </li>
          ))}
          {def.outputs.length === 0 && (
            <li className="px-2.5 py-3 text-[11px] text-ink-faint">
              This node produces no output.
            </li>
          )}
        </ul>
      </section>
    </div>
  )
}

