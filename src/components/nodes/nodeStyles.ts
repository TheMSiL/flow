import type { NodeCategory, NodeStatus } from '@/types/node'

/**
 * Tailwind cannot build class names at runtime, so every category/state
 * combination is enumerated here once and reused everywhere.
 */
export const CATEGORY_STYLES: Record<
  NodeCategory,
  { text: string; bg: string; border: string; glow: string; dot: string }
> = {
  trigger: {
    text: 'text-cat-trigger',
    bg: 'bg-cat-trigger/10',
    border: 'border-cat-trigger/25',
    glow: 'shadow-[0_0_0_1px_rgb(var(--c-cat-trigger)/0.35)]',
    dot: 'bg-cat-trigger',
  },
  action: {
    text: 'text-cat-action',
    bg: 'bg-cat-action/10',
    border: 'border-cat-action/25',
    glow: 'shadow-[0_0_0_1px_rgb(var(--c-cat-action)/0.35)]',
    dot: 'bg-cat-action',
  },
  condition: {
    text: 'text-cat-condition',
    bg: 'bg-cat-condition/10',
    border: 'border-cat-condition/25',
    glow: 'shadow-[0_0_0_1px_rgb(var(--c-cat-condition)/0.35)]',
    dot: 'bg-cat-condition',
  },
  ai: {
    text: 'text-cat-ai',
    bg: 'bg-cat-ai/10',
    border: 'border-cat-ai/25',
    glow: 'shadow-[0_0_0_1px_rgb(var(--c-cat-ai)/0.35)]',
    dot: 'bg-cat-ai',
  },
  integration: {
    text: 'text-cat-integration',
    bg: 'bg-cat-integration/10',
    border: 'border-cat-integration/25',
    glow: 'shadow-[0_0_0_1px_rgb(var(--c-cat-integration)/0.35)]',
    dot: 'bg-cat-integration',
  },
  utility: {
    text: 'text-cat-utility',
    bg: 'bg-cat-utility/10',
    border: 'border-cat-utility/25',
    glow: 'shadow-[0_0_0_1px_rgb(var(--c-cat-utility)/0.35)]',
    dot: 'bg-cat-utility',
  },
}

export const STATUS_LABELS: Record<NodeStatus, string> = {
  configured: 'Configured',
  needs_config: 'Needs configuration',
  disabled: 'Disabled',
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
  skipped: 'Skipped',
  idle: 'Idle',
}

/** CSS colour value for a category — used by the minimap and edge strokes. */
export const CATEGORY_CSS_VAR: Record<NodeCategory, string> = {
  trigger: 'rgb(var(--c-cat-trigger))',
  action: 'rgb(var(--c-cat-action))',
  condition: 'rgb(var(--c-cat-condition))',
  ai: 'rgb(var(--c-cat-ai))',
  integration: 'rgb(var(--c-cat-integration))',
  utility: 'rgb(var(--c-cat-utility))',
}
