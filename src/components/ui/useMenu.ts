import { useRef, useState } from 'react'

/** Trigger ref + open state for the very common button-plus-menu pairing. */
export function useMenu() {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return {
    anchorRef,
    open,
    toggle: () => setOpen((v) => !v),
    close: () => setOpen(false),
    show: () => setOpen(true),
  }
}
