import { db, request } from './db'
import { workflowService } from './workflow.service'
import type { Template, TemplateCategory } from '@/types/template'

export interface TemplateFilter {
  query?: string
  category?: TemplateCategory | 'all'
  sort?: 'popular' | 'newest' | 'rating'
}

export function filterTemplates(items: Template[], filter: TemplateFilter) {
  const q = filter.query?.trim().toLowerCase() ?? ''
  const filtered = items.filter((t) => {
    if (filter.category && filter.category !== 'all' && t.category !== filter.category) {
      return false
    }
    if (!q) return true
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  })

  switch (filter.sort) {
    case 'newest':
      return filtered.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    case 'rating':
      return filtered.sort((a, b) => b.rating - a.rating)
    default:
      return filtered.sort((a, b) => b.usedBy - a.usedBy)
  }
}

export const templateService = {
  getTemplates(filter: TemplateFilter = {}) {
    return request(() => filterTemplates(db.get().templates, filter))
  },

  getTemplate(id: string) {
    return request(() => db.get().templates.find((t) => t.id === id) ?? null, 60)
  },

  /** Instantiates the template as a fresh draft workflow. */
  useTemplate(templateId: string, workspaceId: string, name?: string) {
    const template = db.get().templates.find((t) => t.id === templateId)
    if (!template) return Promise.resolve(null)
    return workflowService.createWorkflow({
      name: name ?? template.name,
      description: template.description,
      workspaceId,
      template,
    })
  },
}
