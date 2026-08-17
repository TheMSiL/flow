import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUi } from '@/app/providers/UiProvider'

export interface ShortcutHandler {
  /** Lower-case `event.key`, or `event.code` for physical keys like `space`. */
  key: string
  mod?: boolean
  shift?: boolean
  alt?: boolean
  /** Fire even when focus is inside an input (e.g. ⌘S). */
  allowInInput?: boolean
  preventDefault?: boolean
  handler: (event: KeyboardEvent) => void
}

export function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * Registers a set of shortcuts on `document`. The handler list is kept in a
 * ref so re-renders never detach the listener mid-interaction.
 */
export function useShortcuts(shortcuts: ShortcutHandler[], enabled = true) {
  const ref = useRef(shortcuts)
  ref.current = shortcuts

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target)
      const key = event.key.toLowerCase()
      for (const shortcut of ref.current) {
        if (shortcut.key !== key) continue
        const mod = event.metaKey || event.ctrlKey
        if (!!shortcut.mod !== mod) continue
        if (!!shortcut.shift !== event.shiftKey) continue
        if (shortcut.alt !== undefined && !!shortcut.alt !== event.altKey) continue
        if (typing && !shortcut.allowInInput) continue
        if (shortcut.preventDefault !== false) event.preventDefault()
        shortcut.handler(event)
        return
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

/** Shortcuts available on every screen. */
export function useGlobalShortcuts() {
  const navigate = useNavigate()
  const { toggleCommand, toggleSidebar, setShortcutsOpen, setCommandOpen } = useUi()

  useShortcuts([
    {
      key: 'k',
      mod: true,
      allowInInput: true,
      handler: () => toggleCommand(),
    },
    { key: 'b', mod: true, handler: () => toggleSidebar() },
    { key: ',', mod: true, handler: () => navigate('/settings') },
    {
      key: '?',
      shift: true,
      handler: () => setShortcutsOpen(true),
    },
    {
      key: 'escape',
      allowInInput: true,
      preventDefault: false,
      handler: () => setCommandOpen(false),
    },
  ])
}
