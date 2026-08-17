import type { TooltipProps } from 'recharts'
import { formatNumber } from '@/lib/format'

type Payload = NonNullable<TooltipProps<number, string>['payload']>

interface Props extends TooltipProps<number, string> {
  /** Formats the value column; defaults to a grouped integer. */
  format?: (value: number) => string
  showTotal?: boolean
}

/**
 * Shared tooltip. Values keep text tokens; the swatch alone carries the
 * series identity, so nothing depends on colour perception.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  format = (v) => formatNumber(v),
  showTotal = true,
}: Props) {
  if (!active || !payload?.length) return null

  const rows = (payload as Payload).filter((row) => row.value !== undefined)
  const total = rows.reduce((acc, row) => acc + Number(row.value ?? 0), 0)

  return (
    <div className="pointer-events-none min-w-[10rem] rounded-lg border border-line bg-surface-overlay p-2.5 shadow-xl">
      {label !== undefined && (
        <p className="mb-1.5 text-[11px] font-medium text-ink">{String(label)}</p>
      )}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li
            key={String(row.dataKey)}
            className="flex items-center justify-between gap-4 text-[11px]"
          >
            <span className="flex items-center gap-1.5 text-ink-muted">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ background: row.color }}
                aria-hidden
              />
              {row.name}
            </span>
            <span className="tabular font-medium text-ink">
              {format(Number(row.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
      {showTotal && rows.length > 1 && (
        <div className="mt-1.5 flex items-center justify-between gap-4 border-t border-line pt-1.5 text-[11px]">
          <span className="text-ink-faint">Total</span>
          <span className="tabular font-medium text-ink">{format(total)}</span>
        </div>
      )}
    </div>
  )
}

export function ChartLegend({
  items,
}: {
  items: { label: string; color: string; value?: string }[]
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[11px]">
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ background: item.color }}
            aria-hidden
          />
          <span className="text-ink-muted">{item.label}</span>
          {item.value && (
            <span className="tabular font-medium text-ink">{item.value}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
