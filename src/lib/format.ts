/** Presentation-layer formatting. Locale is pinned so output is stable. */

const LOCALE = 'en-US'

export function formatNumber(value: number, opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(LOCALE, opts).format(value)
}

export function formatCompact(value: number) {
  if (Math.abs(value) < 1000) return String(Math.round(value))
  return new Intl.NumberFormat(LOCALE, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`
}

export function formatCurrency(value: number, digits = 2) {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)}s`
  const minutes = Math.floor(ms / 60_000)
  const seconds = Math.round((ms % 60_000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 100) return `${hours.toFixed(1)}h`
  return `${Math.round(hours)}h`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString(LOCALE, {
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatTimeWithSeconds(iso: string) {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
  ['second', 1000],
]

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

export function formatRelative(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now
  const abs = Math.abs(diff)
  if (abs < 45_000) return 'just now'
  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit)
  }
  return 'just now'
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i += 1
  }
  return `${value.toFixed(1)} ${units[i]}`
}

/** Pretty-prints run payloads for the log / output viewers. */
export function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}
