import { useEffect } from 'react'
import type { ReactNode } from 'react'

export interface Command {
  id: string
  label: string
  group: string
  icon?: ReactNode
  shortcut?: string
  keywords?: string
  disabled?: boolean
  run: () => void
}

/**
 * Screens contribute their own commands to the palette. The builder, for
 * example, registers canvas actions that make no sense elsewhere.
 */
let contextual: Command[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

export const commandRegistry = {
  get: () => contextual,
  set(commands: Command[]) {
    contextual = commands
    emit()
  },
  clear(ids: string[]) {
    contextual = contextual.filter((c) => !ids.includes(c.id))
    emit()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  },
}

/** Publishes a screen's commands for as long as it is mounted. */
export function useRegisterCommands(factory: () => Command[], deps: unknown[]) {
  useEffect(() => {
    const commands = factory()
    commandRegistry.set(commands)
    return () => commandRegistry.clear(commands.map((c) => c.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
