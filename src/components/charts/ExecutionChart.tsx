import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { useChartTheme } from '@/hooks/useChartTheme'
import { formatCompact, formatNumber } from '@/lib/format'
import type { SeriesPoint } from '@/services/analytics.service'

interface Props {
  data: SeriesPoint[]
  height?: number
  /** Thins x-axis ticks on long ranges so labels never collide. */
  compact?: boolean
}

/**
 * Stacked run volume by outcome. Statuses use the reserved status palette —
 * never the categorical ramp — and each segment is separated by a 2px
 * surface gap so the stack reads as discrete quantities.
 */
export function ExecutionChart({ data, height = 260, compact }: Props) {
  const theme = useChartTheme()
  const [hidden, setHidden] = useState<Record<string, boolean>>({})

  const series = useMemo(
    () => [
      { key: 'successful', label: 'Successful', color: theme.success },
      { key: 'failed', label: 'Failed', color: theme.danger },
      { key: 'running', label: 'Running', color: theme.running },
    ],
    [theme],
  )

  const totals = useMemo(
    () => ({
      successful: data.reduce((a, d) => a + d.successful, 0),
      failed: data.reduce((a, d) => a + d.failed, 0),
      running: data.reduce((a, d) => a + d.running, 0),
    }),
    [data],
  )

  const visible = series.filter((s) => !hidden[s.key])
  const tickInterval = compact
    ? Math.max(0, Math.floor(data.length / 8))
    : Math.max(0, Math.floor(data.length / 12))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {series.map((item) => {
            const off = hidden[item.key]
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() =>
                    setHidden((h) => ({ ...h, [item.key]: !h[item.key] }))
                  }
                  aria-pressed={!off}
                  className="flex items-center gap-1.5 text-[11px] transition-opacity hover:opacity-80"
                  style={{ opacity: off ? 0.4 : 1 }}
                >
                  <span
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ background: item.color }}
                    aria-hidden
                  />
                  <span className="text-ink-muted">{item.label}</span>
                  <span className="tabular font-medium text-ink">
                    {formatNumber(totals[item.key as keyof typeof totals])}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div style={{ height }} role="img" aria-label="Workflow executions over time">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid
              vertical={false}
              stroke={theme.grid}
              strokeDasharray="2 4"
            />
            <XAxis
              dataKey="label"
              interval={tickInterval}
              tickLine={false}
              axisLine={false}
              tick={{ fill: theme.axis, fontSize: 10 }}
              dy={4}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={44}
              tick={{ fill: theme.axis, fontSize: 10 }}
              tickFormatter={(value: number) => formatCompact(value)}
            />
            <Tooltip
              cursor={{ fill: theme.grid, fillOpacity: 0.35 }}
              content={<ChartTooltip />}
            />
            {visible.map((item, index) => (
              <Bar
                key={item.key}
                dataKey={item.key}
                name={item.label}
                stackId="runs"
                fill={item.color}
                // 2px surface gap keeps stacked segments visually discrete.
                stroke={theme.surface}
                strokeWidth={2}
                maxBarSize={26}
                radius={index === visible.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

