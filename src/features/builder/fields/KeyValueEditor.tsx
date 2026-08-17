import { Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { InsertVariableButton } from './VariablePicker'
import type { VariableGroup } from '@/lib/variables'

interface Props {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
  variables?: VariableGroup[]
  disabled?: boolean
}

/**
 * Ordered key/value rows. Kept as an array internally so renaming a key
 * does not reorder the list or collide with an existing entry mid-typing.
 */
export function KeyValueEditor({ value, onChange, variables, disabled }: Props) {
  const rows = Object.entries(value ?? {})

  const emit = (next: [string, string][]) => {
    const out: Record<string, string> = {}
    for (const [k, v] of next) if (k.trim()) out[k] = v
    onChange(out)
  }

  const update = (index: number, key: string, val: string) => {
    const next = [...rows]
    next[index] = [key, val]
    emit(next)
  }

  return (
    <div className="space-y-1.5">
      {rows.map(([key, val], index) => (
        <div key={index} className="flex items-center gap-1.5">
          <Input
            sizeVariant="sm"
            value={key}
            disabled={disabled}
            onChange={(e) => update(index, e.target.value, val)}
            placeholder="Key"
            aria-label={`Key ${index + 1}`}
            className="w-[40%] font-mono text-[11px]"
          />
          <div className="relative flex-1">
            <Input
              sizeVariant="sm"
              value={val}
              disabled={disabled}
              onChange={(e) => update(index, key, e.target.value)}
              placeholder="Value"
              aria-label={`Value ${index + 1}`}
              className="pr-6 font-mono text-[11px]"
            />
            {variables && !disabled && (
              <span className="absolute right-1 top-1/2 -translate-y-1/2">
                <InsertVariableButton
                  compact
                  groups={variables}
                  onSelect={(path) => update(index, key, `${val}{{${path}}}`)}
                />
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => emit(rows.filter((_, i) => i !== index))}
            aria-label={`Remove ${key || `row ${index + 1}`}`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-surface-raised hover:text-state-danger disabled:opacity-40"
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>
      ))}

      <button
        type="button"
        disabled={disabled}
        onClick={() => emit([...rows, ['', '']])}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-line px-2 py-1 text-[11px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink disabled:opacity-40"
      >
        <Plus className="size-3" aria-hidden />
        Add pair
      </button>
    </div>
  )
}
