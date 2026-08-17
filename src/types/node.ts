/**
 * Node taxonomy.
 *
 * A node's *kind* (`NodeType`) is the stable identifier used everywhere:
 * as the React Flow renderer key, as the registry key for its config
 * schema, and as the lookup key for its mock executor.
 */

export type NodeCategory =
  | 'trigger'
  | 'action'
  | 'condition'
  | 'ai'
  | 'integration'
  | 'utility'

export type NodeType =
  // ── triggers ──
  | 'trigger.webhook'
  | 'trigger.schedule'
  | 'trigger.new_lead'
  | 'trigger.new_order'
  | 'trigger.form_submitted'
  | 'trigger.email_received'
  | 'trigger.payment_received'
  | 'trigger.manual'
  // ── actions ──
  | 'action.send_email'
  | 'action.create_task'
  | 'action.update_record'
  | 'action.create_deal'
  | 'action.send_notification'
  | 'action.http_request'
  | 'action.wait'
  | 'action.transform'
  // ── conditions ──
  | 'condition.if'
  | 'condition.filter'
  | 'condition.switch'
  // ── ai ──
  | 'ai.analyze'
  | 'ai.classify'
  | 'ai.summarize'
  | 'ai.extract'
  | 'ai.generate'
  // ── integrations ──
  | 'integration.slack'
  | 'integration.telegram'
  | 'integration.discord'
  | 'integration.gmail'
  | 'integration.sheets'
  | 'integration.notion'
  | 'integration.hubspot'
  | 'integration.stripe'
  | 'integration.openai'
  | 'integration.webhook'
  // ── utilities ──
  | 'utility.set_variable'
  | 'utility.merge'
  | 'utility.log'
  | 'utility.code'
  // ── canvas primitives (not executable) ──
  | 'canvas.note'
  | 'canvas.group'

export type NodeStatus =
  | 'configured'
  | 'needs_config'
  | 'disabled'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'
  | 'idle'

/** Field kinds understood by the generic config form renderer. */
export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'boolean'
  | 'json'
  | 'code'
  | 'keyvalue'
  | 'cron'
  | 'slider'
  | 'endpoint'
  | 'operator'

export interface FieldOption {
  value: string
  label: string
  hint?: string
}

export interface FieldDef {
  key: string
  label: string
  type: FieldKind
  placeholder?: string
  help?: string
  required?: boolean
  options?: FieldOption[]
  min?: number
  max?: number
  step?: number
  rows?: number
  /** Enables the `{{variable}}` picker affordance on this field. */
  variables?: boolean
  defaultValue?: unknown
  /** Conditional visibility driven by another field's current value. */
  showIf?: { key: string; equals: string | number | boolean | string[] }
}

/** Shape of a node's runtime output, used by the variable picker. */
export interface OutputField {
  key: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  sample: string | number | boolean
}

export interface HandleDef {
  id: string
  label?: string
  /** Semantic tone for branch handles (yes / no). */
  tone?: 'default' | 'positive' | 'negative'
}

export interface NodeDefinition {
  type: NodeType
  category: NodeCategory
  label: string
  description: string
  /** Lucide icon name, resolved through the icon registry. */
  icon: string
  /** Extra search terms beyond label + description. */
  keywords?: string[]
  popular?: boolean
  /** Integration slug, when this node is provided by an integration. */
  integration?: string
  fields: FieldDef[]
  outputs: OutputField[]
  inputs: HandleDef[]
  outputHandles: HandleDef[]
  /** Average mock execution cost in USD, used by analytics. */
  unitCost?: number
}

export type NodeConfig = Record<string, unknown>

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string
  description?: string
  config: NodeConfig
  status?: NodeStatus
  disabled?: boolean
  /** Canvas note body (`canvas.note` only). */
  text?: string
  /** Group tint + collapsed state (`canvas.group` only). */
  color?: string
  collapsed?: boolean
  /** Number of unresolved comments, surfaced as a badge. */
  commentCount?: number
}

export interface WorkflowNode {
  id: string
  type: NodeType
  position: { x: number; y: number }
  data: WorkflowNodeData
  width?: number
  height?: number
  parentId?: string
  extent?: 'parent'
  selected?: boolean
  hidden?: boolean
  zIndex?: number
}
