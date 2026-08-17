import type { NodeType } from './node'

export type IntegrationStatus = 'connected' | 'disconnected' | 'error'

export type IntegrationCategory =
  | 'communication'
  | 'crm'
  | 'productivity'
  | 'payments'
  | 'ai'
  | 'developer'

export interface IntegrationAction {
  id: string
  label: string
  description: string
  nodeType?: NodeType
}

export interface Integration {
  id: string
  slug: string
  name: string
  description: string
  category: IntegrationCategory
  status: IntegrationStatus
  /** Brand tint, applied at low alpha for the icon tile. */
  brand: string
  icon: string
  account: string | null
  connectedAt: string | null
  lastActivityAt: string | null
  actions: IntegrationAction[]
  usedInWorkflowIds: string[]
  errorMessage?: string
  /** Monthly mock spend attributed to this integration. */
  monthlyCost: number
  scopes: string[]
  docsUrl: string
}
