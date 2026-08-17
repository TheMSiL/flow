import { cn, initials } from '@/lib/utils'
import type { User } from '@/types/workspace'

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
  xl: 'size-14 text-lg',
} as const

interface AvatarProps {
  user: Pick<User, 'name' | 'hue'>
  size?: keyof typeof SIZES
  className?: string
  ring?: boolean
}

export function Avatar({ user, size = 'md', className, ring }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold uppercase tracking-tight',
        SIZES[size],
        ring && 'ring-2 ring-bg',
        className,
      )}
      style={{
        background: `hsl(${user.hue} 62% 22%)`,
        color: `hsl(${user.hue} 88% 74%)`,
        boxShadow: `inset 0 0 0 1px hsl(${user.hue} 62% 34% / 0.6)`,
      }}
      aria-hidden
    >
      {initials(user.name)}
    </span>
  )
}

export function AvatarGroup({
  users,
  max = 4,
  size = 'sm',
}: {
  users: Pick<User, 'id' | 'name' | 'hue'>[]
  max?: number
  size?: keyof typeof SIZES
}) {
  const shown = users.slice(0, max)
  const rest = users.length - shown.length
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((user) => (
        <Avatar key={user.id} user={user} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-surface-raised font-medium text-ink-muted ring-2 ring-bg',
            SIZES[size],
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  )
}
