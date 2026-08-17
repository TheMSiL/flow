import { db, request } from './db'
import type { Integration, IntegrationStatus } from '@/types/integration'

export const integrationService = {
  getIntegrations() {
    return request(() => db.get().integrations)
  },

  getIntegration(slug: string) {
    return request(
      () => db.get().integrations.find((i) => i.slug === slug) ?? null,
      60,
    )
  },

  /** Mock OAuth handshake — resolves once the "provider" hands back a token. */
  async connect(slug: string): Promise<Integration | null> {
    await new Promise((resolve) => setTimeout(resolve, 1400))
    let updated: Integration | null = null
    db.set((s) => ({
      integrations: s.integrations.map((i) => {
        if (i.slug !== slug) return i
        updated = {
          ...i,
          status: 'connected' as IntegrationStatus,
          account: i.account ?? `Acme Labs · ${i.name.toLowerCase()}`,
          connectedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          errorMessage: undefined,
        }
        return updated
      }),
    }))
    return updated
  },

  disconnect(slug: string) {
    return request(() => {
      db.set((s) => ({
        integrations: s.integrations.map((i) =>
          i.slug === slug
            ? { ...i, status: 'disconnected' as const, account: null, connectedAt: null }
            : i,
        ),
      }))
      return true
    }, 320)
  },

  reconnect(slug: string) {
    return integrationService.connect(slug)
  },
}
