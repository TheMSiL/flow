import { Modal } from '@/components/ui/Modal'
import { Kbd } from '@/components/ui/Badge'
import { useUi } from '@/app/providers/UiProvider'
import { modKey } from '@/lib/utils'

const GROUPS = () => [
  {
    title: 'Global',
    items: [
      { keys: [modKey(), 'K'], label: 'Open command palette' },
      { keys: [modKey(), 'B'], label: 'Toggle sidebar' },
      { keys: [modKey(), ','], label: 'Open settings' },
      { keys: ['?'], label: 'Show this dialog' },
    ],
  },
  {
    title: 'Builder',
    items: [
      { keys: [modKey(), 'S'], label: 'Save workflow' },
      { keys: [modKey(), 'Z'], label: 'Undo' },
      { keys: [modKey(), '⇧', 'Z'], label: 'Redo' },
      { keys: [modKey(), 'C'], label: 'Copy selection' },
      { keys: [modKey(), 'V'], label: 'Paste' },
      { keys: [modKey(), 'D'], label: 'Duplicate selection' },
      { keys: ['Del'], label: 'Delete selection' },
      { keys: ['N'], label: 'Open node picker' },
      { keys: ['R'], label: 'Run a test' },
    ],
  },
  {
    title: 'Canvas',
    items: [
      { keys: ['F'], label: 'Fit view' },
      { keys: [modKey(), '+'], label: 'Zoom in' },
      { keys: [modKey(), '−'], label: 'Zoom out' },
      { keys: ['Space', 'drag'], label: 'Pan the canvas' },
      { keys: ['⇧', 'click'], label: 'Add to selection' },
      { keys: ['M'], label: 'Toggle minimap' },
    ],
  },
]

export function ShortcutsDialog() {
  const { shortcutsOpen, setShortcutsOpen } = useUi()

  return (
    <Modal
      open={shortcutsOpen}
      onClose={() => setShortcutsOpen(false)}
      title="Keyboard shortcuts"
      description="Everything in FLOW is reachable without the mouse."
      size="lg"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {GROUPS().map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              {group.title}
            </h3>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-4 text-[13px] text-ink-muted"
                >
                  <span>{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
