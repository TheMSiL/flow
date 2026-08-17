import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import { useChartTheme } from '@/hooks/useChartTheme'
import { formatCurrency } from '@/lib/format'
import type { CostBreakdown } from '@/services/analytics.service'

/**
 * Three-slice cost split. Identity is carried by a labelled legend as well
 * as colour, and the total lives in the middle as the headline number.
 */
export function CostDonut({ cost }: { cost: CostBreakdown }) {
  const theme = useChartTheme()

  const data = useMemo(
    () => [
      { name: 'AI usage', value: cost.ai, color: theme.categorical[0] },
      { name: 'Integrations', value: cost.integrations, color: theme.categorical[1] },
      { name: 'Executions', value: cost.executions, color: theme.categorical[2] },
    ],
    [cost, theme],
  )

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div
        className="relative size-[148px] shrink-0"
        role="img"
        aria-label={`Monthly automation cost ${formatCurrency(cost.total)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={72}
              // 2px surface ring separates adjacent slices.
              stroke={theme.surface}
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip showTotal={false} format={(v) => formatCurrency(v)} />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-lg font-semibold tracking-tight text-ink">
            {formatCurrency(cost.total)}
          </span>
          <span className="text-[10px] text-ink-faint">this month</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2">
        {data.map((slice) => {
          const share = cost.total ? (slice.value / cost.total) * 100 : 0
          return (
            <li key={slice.name}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 text-ink-muted">
                  <span
                    className="size-2 shrink-0 rounded-[2px]"
                    style={{ background: slice.color }}
                    aria-hidden
                  />
                  {slice.name}
                </span>
                <span className="tabular font-medium text-ink">
                  {formatCurrency(slice.value)}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-sunken">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${share}%`, background: slice.color }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
