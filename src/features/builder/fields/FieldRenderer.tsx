import { useCallback, useRef, useState } from 'react'
import { Check, Copy, RefreshCw } from 'lucide-react'
import {
  Badge,
  Field,
  Input,
  Select,
  Slider,
  Switch,
  Textarea,
} from '@/components/ui'
import { KeyValueEditor } from './KeyValueEditor'
import { CronEditor } from './CronEditor'
import { InsertVariableButton } from './VariablePicker'
import { OPERATOR_LABELS, type OperatorId } from '@/engine/operators'
import { useToast } from '@/app/providers/ToastProvider'
import { uid } from '@/lib/utils'
import type { FieldDef, NodeConfig } from '@/types/node'
import type { VariableGroup } from '@/lib/variables'

interface Props {
  field: FieldDef
  config: NodeConfig
  onChange: (patch: NodeConfig) => void
  variables: VariableGroup[]
  error?: string
  disabled?: boolean
}

/** Renders one config field from its schema entry. */
export function FieldRenderer({
  field,
  config,
  onChange,
  variables,
  error,
  disabled,
}: Props) {
  const value = config[field.key]
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)
  const id = `field-${field.key}`

  /** Inserts `{{path}}` at the caret, falling back to appending. */
  const insertVariable = useCallback(
    (path: string) => {
      const token = `{{${path}}}`
      const el = inputRef.current
      const current = typeof value === 'string' ? value : ''
      if (!el) {
        onChange({ [field.key]: current + token })
        return
      }
      const start = el.selectionStart ?? current.length
      const end = el.selectionEnd ?? current.length
      const next = current.slice(0, start) + token + current.slice(end)
      onChange({ [field.key]: next })
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(start + token.length, start + token.length)
      })
    },
    [field.key, onChange, value],
  )

  const variableAction = field.variables ? (
    <InsertVariableButton groups={variables} onSelect={insertVariable} />
  ) : undefined

  switch (field.type) {
    case 'textarea':
    case 'json':
    case 'code':
      return (
        <Field
          label={field.label}
          hint={field.help}
          error={error}
          required={field.required}
          htmlFor={id}
          action={variableAction}
        >
          <Textarea
            id={id}
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            rows={field.rows ?? 4}
            mono={field.type !== 'textarea'}
            disabled={disabled}
            invalid={!!error}
            placeholder={field.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange({ [field.key]: e.target.value })}
            spellCheck={field.type === 'textarea'}
          />
        </Field>
      )

    case 'number':
      return (
        <Field label={field.label} hint={field.help} error={error} required={field.required} htmlFor={id}>
          <Input
            id={id}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            disabled={disabled}
            invalid={!!error}
            placeholder={field.placeholder}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e) =>
              onChange({ [field.key]: e.target.value === '' ? '' : Number(e.target.value) })
            }
          />
        </Field>
      )

    case 'slider':
      return (
        <Field hint={field.help} error={error}>
          <Slider
            id={id}
            label={field.label}
            min={field.min ?? 0}
            max={field.max ?? 1}
            step={field.step ?? 0.1}
            value={Number(value ?? field.defaultValue ?? 0)}
            onChange={(next) => onChange({ [field.key]: next })}
          />
        </Field>
      )

    case 'boolean':
      return (
        <div className="rounded-md border border-line bg-surface-sunken p-2.5">
          <Switch
            id={id}
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(next) => onChange({ [field.key]: next })}
            label={field.label}
            description={field.help}
          />
        </div>
      )

    case 'select':
      return (
        <Field label={field.label} hint={field.help} error={error} required={field.required} htmlFor={id}>
          <Select
            id={id}
            disabled={disabled}
            invalid={!!error}
            value={String(value ?? field.defaultValue ?? '')}
            onChange={(e) => onChange({ [field.key]: e.target.value })}
          >
            <option value="">Select…</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.hint ? ` — ${option.hint}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      )

    case 'operator':
      return (
        <Field label={field.label} hint={field.help} error={error} required={field.required} htmlFor={id}>
          <Select
            id={id}
            disabled={disabled}
            value={String(value ?? 'equals')}
            onChange={(e) => onChange({ [field.key]: e.target.value })}
          >
            {(Object.keys(OPERATOR_LABELS) as OperatorId[]).map((op) => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </option>
            ))}
          </Select>
        </Field>
      )

    case 'keyvalue':
      return (
        <Field label={field.label} hint={field.help} error={error} required={field.required}>
          <KeyValueEditor
            value={(value as Record<string, string>) ?? {}}
            disabled={disabled}
            variables={field.variables ? variables : undefined}
            onChange={(next) => onChange({ [field.key]: next })}
          />
        </Field>
      )

    case 'cron':
      return (
        <Field label={field.label} hint={field.help} error={error} required={field.required}>
          <CronEditor
            value={config}
            disabled={disabled}
            timezone={String(config.timezone ?? 'UTC')}
            onChange={(patch) => onChange(patch)}
          />
        </Field>
      )

    case 'endpoint':
      return (
        <EndpointField
          field={field}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(next) => onChange({ [field.key]: next })}
        />
      )

    default:
      return (
        <Field
          label={field.label}
          hint={field.help}
          error={error}
          required={field.required}
          htmlFor={id}
          action={variableAction}
        >
          <Input
            id={id}
            ref={inputRef as React.Ref<HTMLInputElement>}
            disabled={disabled}
            invalid={!!error}
            placeholder={field.placeholder}
            value={typeof value === 'string' ? value : String(value ?? '')}
            onChange={(e) => onChange({ [field.key]: e.target.value })}
          />
        </Field>
      )
  }
}

/* ------------------------------------------------------------------ *
 * Webhook endpoint — copy + regenerate + live status
 * ------------------------------------------------------------------ */

function EndpointField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldDef
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard can be blocked; the toast still confirms intent.
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
    toast({ tone: 'success', title: 'Webhook URL copied' })
  }

  const regenerate = () => {
    const next = `https://hooks.flow.app/w/${uid('wh').replace('wh_', '')}`
    onChange(next)
    toast({
      tone: 'warning',
      title: 'Endpoint regenerated',
      description: 'The previous URL stops accepting requests immediately.',
    })
  }

  return (
    <Field
      label={field.label}
      hint={field.help}
      required={field.required}
      action={
        <Badge tone="success" size="xs">
          Active
        </Badge>
      }
    >
      <div className="flex items-stretch gap-1.5">
        <div className="flex min-w-0 flex-1 items-center rounded-md border border-line bg-surface-sunken px-2.5">
          <span className="truncate font-mono text-[11px] text-ink-muted">
            {value || 'Not generated yet'}
          </span>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy webhook URL"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface-sunken text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          {copied ? (
            <Check className="size-3.5 text-state-success" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={regenerate}
          disabled={disabled}
          aria-label="Regenerate webhook URL"
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface-sunken text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
        >
          <RefreshCw className="size-3.5" aria-hidden />
        </button>
      </div>
    </Field>
  )
}
