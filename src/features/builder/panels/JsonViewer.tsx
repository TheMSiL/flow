import { useState } from 'react'
import { Check, ChevronRight, Copy } from 'lucide-react'
import { formatJson } from '@/lib/format'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  value: unknown
  defaultOpen?: boolean
  maxHeight?: number
}

/** Collapsible, copyable payload view used across run details and nodes. */
export function JsonViewer({ title, value, defaultOpen = false, maxHeight = 260 }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)
  const text = formatJson(value)
  const lines = text.split('\n').length

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <section className="overflow-hidden rounded-md border border-line">
      <div className="flex items-center gap-1.5 bg-surface-sunken px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronRight
            className={cn(
              'size-3 shrink-0 text-ink-faint transition-transform duration-150',
              open && 'rotate-90',
            )}
            aria-hidden
          />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            {title}
          </span>
          <span className="text-[10px] text-ink-faint">{lines} lines</span>
        </button>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${title}`}
          className="rounded p-1 text-ink-faint transition-colors hover:text-ink"
        >
          {copied ? (
            <Check className="size-3 text-state-success" aria-hidden />
          ) : (
            <Copy className="size-3" aria-hidden />
          )}
        </button>
      </div>
      {open && (
        <pre
          className="overflow-auto bg-surface-sunken/50 px-2.5 py-2 font-mono text-[11px] leading-5 text-ink-muted"
          style={{ maxHeight }}
        >
          {text}
        </pre>
      )}
    </section>
  )
}
