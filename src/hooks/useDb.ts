import { useCallback, useRef, useSyncExternalStore } from 'react'
import { db, type DbState } from '@/services/db'

/**
 * Subscribes to the client store.
 *
 * `useSyncExternalStore` requires `getSnapshot` to return a cached value for
 * unchanged data, so selectors that build new objects (counts, derived maps)
 * would otherwise loop forever. The store replaces its state object on every
 * mutation, so caching against that identity is both correct and cheap —
 * callers can write ordinary selectors without memoising by hand.
 */
export function useDb<T>(selector: (state: DbState) => T): T {
  const cache = useRef<{
    state: DbState
    selector: (state: DbState) => T
    value: T
  } | null>(null)

  const getSnapshot = useCallback(() => {
    const state = db.get()
    const cached = cache.current
    if (cached && cached.state === state && cached.selector === selector) {
      return cached.value
    }
    const value = selector(state)
    cache.current = { state, selector, value }
    return value
  }, [selector])

  return useSyncExternalStore(db.subscribe, getSnapshot, getSnapshot)
}

export function useDbState(): DbState {
  return useSyncExternalStore(db.subscribe, db.get, db.get)
}
