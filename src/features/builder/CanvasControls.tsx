import { useEffect, useState } from 'react'
import { Panel, useReactFlow, useStore } from '@xyflow/react'
import { Crosshair, Minus, Plus } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { modKey } from '@/lib/utils'

/** Zoom cluster pinned to the bottom-left of the canvas. */
export function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const zoom = useStore((state) => state.transform[2])
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    setFlash(true)
    const timer = setTimeout(() => setFlash(false), 500)
    return () => clearTimeout(timer)
  }, [zoom])

  return (
    <Panel position="bottom-left" className="!bottom-4 !left-4 !m-0">
      <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface/90 p-1 shadow-lg backdrop-blur-sm">
        <Tooltip content="Zoom out" shortcut={`${modKey()} −`} placement="top">
          <button
            type="button"
            onClick={() => zoomOut({ duration: 180 })}
            aria-label="Zoom out"
            className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
        </Tooltip>

        <button
          type="button"
          onClick={() => fitView({ padding: 0.28, duration: 320 })}
          aria-label={`Current zoom ${Math.round(zoom * 100)} percent. Reset to fit.`}
          className="tabular min-w-[3.25rem] rounded-md px-1 text-center text-[11px] font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          style={{ color: flash ? 'rgb(var(--c-ink))' : undefined }}
        >
          {Math.round(zoom * 100)}%
        </button>

        <Tooltip content="Zoom in" shortcut={`${modKey()} +`} placement="top">
          <button
            type="button"
            onClick={() => zoomIn({ duration: 180 })}
            aria-label="Zoom in"
            className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </Tooltip>

        <span className="mx-0.5 h-4 w-px bg-line" />

        <Tooltip content="Fit view" shortcut="F" placement="top">
          <button
            type="button"
            onClick={() => fitView({ padding: 0.28, duration: 320 })}
            aria-label="Fit view"
            className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <Crosshair className="size-3.5" aria-hidden />
          </button>
        </Tooltip>
      </div>
    </Panel>
  )
}
