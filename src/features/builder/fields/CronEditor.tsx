import { useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import { Input, Select } from '@/components/ui'
import { cn } from '@/lib/utils'

export type Frequency = 'minutes' | 'hourly' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'cron'

interface Props {
  value: Record<string, unknown>
  onChange: (patch: Record<string, unknown>) => void
  timezone: string
  disabled?: boolean
}

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'minutes', label: 'Every N minutes' },
  { value: 'hourly', label: 'Every hour' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Every weekday' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'cron', label: 'Custom cron' },
]

const WEEKDAYS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
]

function toCron(frequency: Frequency, time: string, weekday: string, day: string, every: number) {
  const [hour = '9', minute = '0'] = time.split(':')
  switch (frequency) {
    case 'minutes':
      return `*/${every} * * * *`
    case 'hourly':
      return `${Number(minute)} * * * *`
    case 'daily':
      return `${Number(minute)} ${Number(hour)} * * *`
    case 'weekdays':
      return `${Number(minute)} ${Number(hour)} * * 1-5`
    case 'weekly':
      return `${Number(minute)} ${Number(hour)} * * ${weekday}`
    case 'monthly':
      return `${Number(minute)} ${Number(hour)} ${day} * *`
    default:
      return ''
  }
}

/** Computes the next three fire times for the preview strip. */
function nextRuns(frequency: Frequency, time: string, weekday: string, day: string, every: number) {
  const [hour = 9, minute = 0] = time.split(':').map(Number)
  const out: Date[] = []
  const cursor = new Date()

  if (frequency === 'minutes') {
    for (let i = 1; i <= 3; i++) out.push(new Date(cursor.getTime() + i * every * 60_000))
    return out
  }
  if (frequency === 'hourly') {
    for (let i = 1; i <= 3; i++) {
      const d = new Date(cursor.getTime() + i * 3_600_000)
      d.setMinutes(minute, 0, 0)
      out.push(d)
    }
    return out
  }

  const candidate = new Date(cursor)
  candidate.setHours(hour, minute, 0, 0)
  if (candidate <= cursor) candidate.setDate(candidate.getDate() + 1)

  let guard = 0
  while (out.length < 3 && guard < 400) {
    guard += 1
    const dow = candidate.getDay()
    const matches =
      frequency === 'daily' ||
      frequency === 'cron' ||
      (frequency === 'weekdays' && dow >= 1 && dow <= 5) ||
      (frequency === 'weekly' && String(dow) === weekday) ||
      (frequency === 'monthly' && candidate.getDate() === Number(day))
    if (matches) out.push(new Date(candidate))
    candidate.setDate(candidate.getDate() + 1)
  }
  return out
}

export function CronEditor({ value, onChange, timezone, disabled }: Props) {
  const frequency = (value.frequency as Frequency) ?? 'daily'
  const time = (value.time as string) ?? '09:00'
  const weekday = (value.weekday as string) ?? '1'
  const day = (value.day as string) ?? '1'
  const every = Number(value.every ?? 15)
  const cron = (value.cron as string) ?? '0 9 * * 1-5'

  const preview = useMemo(
    () => nextRuns(frequency, time, weekday, day, every),
    [frequency, time, weekday, day, every],
  )

  const expression =
    frequency === 'cron' ? cron : toCron(frequency, time, weekday, day, every)

  return (
    <div className="space-y-2.5">
      <Select
        sizeVariant="sm"
        value={frequency}
        disabled={disabled}
        aria-label="Schedule frequency"
        onChange={(e) => onChange({ frequency: e.target.value })}
      >
        {FREQUENCIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </Select>

      <div className="flex gap-1.5">
        {frequency === 'minutes' && (
          <Input
            sizeVariant="sm"
            type="number"
            min={1}
            max={59}
            value={every}
            disabled={disabled}
            aria-label="Interval in minutes"
            onChange={(e) => onChange({ every: Number(e.target.value) })}
            className="w-20"
          />
        )}
        {frequency === 'weekly' && (
          <Select
            sizeVariant="sm"
            value={weekday}
            disabled={disabled}
            aria-label="Day of week"
            onChange={(e) => onChange({ weekday: e.target.value })}
          >
            {WEEKDAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        )}
        {frequency === 'monthly' && (
          <Select
            sizeVariant="sm"
            value={day}
            disabled={disabled}
            aria-label="Day of month"
            onChange={(e) => onChange({ day: e.target.value })}
            className="w-24"
          >
            {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
              <option key={d} value={d}>
                Day {d}
              </option>
            ))}
          </Select>
        )}
        {frequency !== 'minutes' && frequency !== 'hourly' && frequency !== 'cron' && (
          <Input
            sizeVariant="sm"
            type="time"
            value={time}
            disabled={disabled}
            aria-label="Time of day"
            onChange={(e) => onChange({ time: e.target.value })}
            className="w-28"
          />
        )}
        {frequency === 'hourly' && (
          <Input
            sizeVariant="sm"
            type="number"
            min={0}
            max={59}
            value={Number(time.split(':')[1] ?? 0)}
            disabled={disabled}
            aria-label="Minute past the hour"
            onChange={(e) => onChange({ time: `00:${e.target.value.padStart(2, '0')}` })}
            className="w-20"
          />
        )}
        {frequency === 'cron' && (
          <Input
            sizeVariant="sm"
            mono
            value={cron}
            disabled={disabled}
            aria-label="Cron expression"
            placeholder="0 9 * * 1-5"
            onChange={(e) => onChange({ cron: e.target.value })}
          />
        )}
      </div>

      <div className="rounded-md border border-line bg-surface-sunken p-2.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          <CalendarClock className="size-3" aria-hidden />
          Next runs
        </div>
        <ul className="mt-1.5 space-y-1">
          {preview.map((date, index) => (
            <li
              key={date.toISOString()}
              className={cn(
                'tabular flex items-baseline justify-between text-[11px]',
                index === 0 ? 'text-ink' : 'text-ink-faint',
              )}
            >
              <span>
                {date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span>
                {date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex items-center justify-between border-t border-line pt-1.5 text-[10px] text-ink-faint">
          <span className="font-mono">{expression || 'custom'}</span>
          <span>{timezone}</span>
        </div>
      </div>
    </div>
  )
}
