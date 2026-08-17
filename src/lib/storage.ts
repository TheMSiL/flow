/**
 * Namespaced localStorage wrapper.
 *
 * Every persisted key lives under `flow.*` and carries a schema version so a
 * future migration (or a real backend takeover) can detect stale payloads
 * instead of crashing on them.
 */

const NS = 'flow'
/** Bump whenever the shipped fixtures change shape, to invalidate stale caches. */
export const STORAGE_VERSION: number = 1

export const StorageKeys = {
  theme: `${NS}.theme`,
  sidebar: `${NS}.sidebar`,
  settings: `${NS}.settings`,
  workspaces: `${NS}.workspaces`,
  activeWorkspace: `${NS}.workspace.active`,
  workflows: `${NS}.workflows`,
  executions: `${NS}.executions`,
  integrations: `${NS}.integrations`,
  notifications: `${NS}.notifications`,
  comments: `${NS}.comments`,
  recentNodes: `${NS}.nodes.recent`,
  seeded: `${NS}.seeded`,
  version: `${NS}.version`,
} as const

type Listener = (value: unknown) => void
const listeners = new Map<string, Set<Listener>>()

function memoryFallback() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  }
}

let backing: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
try {
  const probe = '__flow_probe__'
  window.localStorage.setItem(probe, '1')
  window.localStorage.removeItem(probe)
  backing = window.localStorage
} catch {
  // Private-mode Safari and hardened browsers throw on access.
  backing = memoryFallback()
}

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = backing.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    backing.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded — the app stays usable, it just stops persisting.
    console.warn(`[flow] could not persist "${key}"`)
  }
  listeners.get(key)?.forEach((fn) => fn(value))
}

export function removeStorage(key: string): void {
  try {
    backing.removeItem(key)
  } catch {
    /* noop */
  }
  listeners.get(key)?.forEach((fn) => fn(undefined))
}

export function subscribeStorage(key: string, fn: Listener): () => void {
  const set = listeners.get(key) ?? new Set<Listener>()
  set.add(fn)
  listeners.set(key, set)
  return () => set.delete(fn)
}

/** Wipes every FLOW key — exposed in Settings › General as "Reset demo data". */
export function resetStorage() {
  Object.values(StorageKeys).forEach(removeStorage)
}
