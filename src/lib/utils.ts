import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Deterministic, collision-resistant enough for client-side entities. */
let idCounter = 0
export function uid(prefix = 'id'): string {
  idCounter += 1
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${idCounter.toString(36)}${rand}`
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const wrapped = (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), wait)
  }
  wrapped.cancel = () => timer && clearTimeout(timer)
  wrapped.flush = (...args: A) => {
    if (timer) clearTimeout(timer)
    fn(...args)
  }
  return wrapped
}

export function groupBy<T, K extends string>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item)
      ;(acc[k] ||= []).push(item)
      return acc
    },
    {} as Record<K, T[]>,
  )
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

export function sum(items: number[]): number {
  return items.reduce((a, b) => a + b, 0)
}

export function isMac() {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
}

/** Renders `mod` as ⌘ on Apple platforms and Ctrl elsewhere. */
export function modKey() {
  return isMac() ? '⌘' : 'Ctrl'
}

export function deepClone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

/** Case-insensitive substring match used by every search field. */
export function matches(haystack: string | undefined, needle: string) {
  if (!needle) return true
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase())
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function titleCase(value: string) {
  return value
    .replace(/[_.-]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
