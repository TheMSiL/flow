import { resolveIcon } from '@/lib/icons'
import { getNodeDefinition } from '@/nodes/catalog'
import { CATEGORY_STYLES } from './nodeStyles'
import { cn } from '@/lib/utils'
import type { NodeCategory, NodeType } from '@/types/node'

const SIZES = {
  xs: { box: 'size-5 rounded-[5px]', icon: 'size-3' },
  sm: { box: 'size-6 rounded-md', icon: 'size-3.5' },
  md: { box: 'size-8 rounded-lg', icon: 'size-4' },
  lg: { box: 'size-10 rounded-lg', icon: 'size-[18px]' },
} as const

interface NodeIconProps {
  type: NodeType | string
  size?: keyof typeof SIZES
  className?: string
  /** Overrides the category derived from the node type. */
  category?: NodeCategory
  icon?: string
}

export function NodeIcon({
  type,
  size = 'md',
  className,
  category,
  icon,
}: NodeIconProps) {
  const def = getNodeDefinition(type)
  const cat = category ?? def.category
  const styles = CATEGORY_STYLES[cat]
  const Icon = resolveIcon(icon ?? def.icon)
  const dims = SIZES[size]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center border',
        dims.box,
        styles.bg,
        styles.border,
        styles.text,
        className,
      )}
      aria-hidden
    >
      <Icon className={dims.icon} strokeWidth={1.8} />
    </span>
  )
}
