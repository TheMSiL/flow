import { useCallback, useEffect, useState } from 'react'
import { readStorage, subscribeStorage, writeStorage } from '@/lib/storage'

/**
 * `useState` backed by localStorage, synchronised across every hook
 * instance that shares the same key.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initial))

  useEffect(() => subscribeStorage(key, (next) => setValue(next as T)), [key])

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved =
          typeof next === 'function' ? (next as (c: T) => T)(current) : next
        writeStorage(key, resolved)
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
