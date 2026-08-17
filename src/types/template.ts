import type { WorkflowEdge } from './workflow'
import type { WorkflowNode } from './node'

export type TemplateCategory =
  | 'sales'
  | 'marketing'
  | 'operations'
  | 'support'
  | 'finance'
  | 'ai'

export interface Template {
  id: string
  name: string
  description: string
  longDescription: string
  category: TemplateCategory
  icon: string
  tags: string[]
  usedBy: number
  rating: number
  authorId: string
  featured: boolean
  estimatedSetupMin: number
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  integrations: string[]
  createdAt: string
}
