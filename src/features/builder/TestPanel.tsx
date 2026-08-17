import { useEffect, useMemo, useState } from 'react'
import { FlaskConical, Play, TriangleAlert, Zap } from 'lucide-react'
import { Badge, Button, Field, Modal, Segmented, Switch, Textarea } from '@/components/ui'
import { NodeIcon } from '@/components/nodes/NodeIcon'
import { SPEED_LABELS } from '@/engine/engine'
import { getNodeDefinition } from '@/nodes/catalog'
import type { ExecutionSpeed } from '@/types/execution'
import type { AppNode } from './graph'

export interface TestConfig {
  input: Record<string, unknown>
  speed: ExecutionSpeed
  startNodeId?: string
  failAtNodeId?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onRun: (config: TestConfig) => void
  nodes: AppNode[]
  selectedNodeId?: string
  defaultSpeed: ExecutionSpeed
}

/** Derives a sensible JSON payload from the workflow's trigger. */
function defaultPayload(nodes: AppNode[]) {
  const trigger = nodes.find((n) => (n.type ?? '').startsWith('trigger.'))
  if (!trigger) return '{\n  "message": "hello"\n}'

  const sample = trigger.data.config.samplePayload
  if (typeof sample === 'string' && sample.trim()) return sample

  const def = getNodeDefinition(trigger.type ?? '')
  const payload: Record<string, unknown> = {}
  for (const output of def.outputs) {
    const key = output.key.split('.').pop() ?? output.key
    payload[key] = output.sample
  }
  return JSON.stringify(payload, null, 2)
}

export function TestPanel({
  open,
  onClose,
  onRun,
  nodes,
  selectedNodeId,
  defaultSpeed,
}: Props) {
  const [payload, setPayload] = useState('')
  const [speed, setSpeed] = useState<ExecutionSpeed>(defaultSpeed)
  const [fromSelected, setFromSelected] = useState(false)
  const [simulateFailure, setSimulateFailure] = useState(false)

  const executable = useMemo(
    () => nodes.filter((n) => !(n.type ?? '').startsWith('canvas.')),
    [nodes],
  )
  const selected = executable.find((n) => n.id === selectedNodeId)

  useEffect(() => {
    if (open) {
      setPayload(defaultPayload(nodes))
      setSpeed(defaultSpeed)
      setFromSelected(false)
      setSimulateFailure(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(payload) as Record<string, unknown>
      return { ok: true as const, value }
    } catch (error) {
      return { ok: false as const, message: (error as Error).message }
    }
  }, [payload])

  const startNode = fromSelected && selected ? selected : executable[0]
  const failNode = simulateFailure
    ? executable.find((n) => !(n.type ?? '').startsWith('trigger.')) ?? executable[1]
    : undefined

  const run = () => {
    if (!parsed.ok) return
    onRun({
      input: parsed.value,
      speed,
      startNodeId: fromSelected && selected ? selected.id : undefined,
      failAtNodeId: failNode?.id,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<FlaskConical className="size-4" aria-hidden />}
      title="Test workflow"
      description="Runs against mock data — nothing leaves this browser."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Play className="size-3.5" />}
            disabled={!parsed.ok}
            onClick={run}
          >
            Run test
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-line bg-surface-sunken p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Starting point
            </p>
            <div className="mt-2 space-y-2">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md p-1.5 transition-colors hover:bg-surface-raised">
                <input
                  type="radio"
                  name="test-start"
                  checked={!fromSelected}
                  onChange={() => setFromSelected(false)}
                  className="accent-[rgb(var(--c-accent))]"
                />
                <span className="min-w-0 flex-1 text-[12px] text-ink">
                  Run entire workflow
                </span>
              </label>
              <label
                className={cnRadio(!selected)}
                aria-disabled={!selected}
              >
                <input
                  type="radio"
                  name="test-start"
                  disabled={!selected}
                  checked={fromSelected}
                  onChange={() => setFromSelected(true)}
                  className="accent-[rgb(var(--c-accent))]"
                />
                <span className="min-w-0 flex-1 text-[12px] text-ink">
                  {selected ? `Run from “${selected.data.label}”` : 'Select a node first'}
                </span>
              </label>
            </div>
            {startNode && (
              <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
                <NodeIcon type={startNode.type ?? ''} size="xs" />
                <span className="truncate text-[11px] text-ink-muted">
                  Starts at {startNode.data.label}
                </span>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-line bg-surface-sunken p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Speed
            </p>
            <Segmented
              className="mt-2 w-full"
              value={speed}
              onChange={setSpeed}
              ariaLabel="Execution speed"
              options={(['normal', 'fast', 'instant'] as ExecutionSpeed[]).map((s) => ({
                value: s,
                label: SPEED_LABELS[s],
              }))}
            />
            <p className="mt-2 text-[11px] leading-5 text-ink-faint">
              {speed === 'normal'
                ? '300–700ms per node — matches production timing.'
                : speed === 'fast'
                  ? '100–200ms per node.'
                  : 'Skips the animation and jumps to the final state.'}
            </p>
            <div className="mt-2.5 border-t border-line pt-2.5">
              <Switch
                checked={simulateFailure}
                onChange={setSimulateFailure}
                label="Simulate a failure"
                description="Forces the first action to error, so you can exercise the failure path."
              />
            </div>
          </div>
        </div>

        <Field
          label="Test input"
          required
          error={parsed.ok ? undefined : `Invalid JSON — ${parsed.message}`}
          hint="Available to every node as {{trigger.*}} and the trigger's own namespace."
          htmlFor="test-payload"
          action={
            parsed.ok ? (
              <Badge tone="success" size="xs">
                Valid JSON
              </Badge>
            ) : (
              <Badge tone="danger" size="xs" icon={<TriangleAlert className="size-2.5" />}>
                Invalid
              </Badge>
            )
          }
        >
          <Textarea
            id="test-payload"
            mono
            rows={10}
            value={payload}
            invalid={!parsed.ok}
            onChange={(e) => setPayload(e.target.value)}
            spellCheck={false}
          />
        </Field>

        <div className="flex items-center gap-2 rounded-md border border-line bg-surface-sunken px-3 py-2">
          <Zap className="size-3.5 shrink-0 text-accent" aria-hidden />
          <p className="text-[11px] leading-5 text-ink-muted">
            {executable.length} nodes will be evaluated. Condition branches are chosen
            from the values in this payload.
          </p>
        </div>
      </div>
    </Modal>
  )
}

function cnRadio(disabled: boolean) {
  return [
    'flex items-center gap-2.5 rounded-md p-1.5 transition-colors',
    disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer hover:bg-surface-raised',
  ].join(' ')
}
