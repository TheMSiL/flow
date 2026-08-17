import { db, request } from './db'
import { uid } from '@/lib/utils'
import { CURRENT_USER_ID } from '@/data/users'
import type { Role, User, Workspace } from '@/types/workspace'

const HUES = [88, 196, 322, 24, 268, 158, 12, 210]

export const workspaceService = {
  getWorkspaces() {
    return request(() => db.get().workspaces, 60)
  },

  createWorkspace(input: { name: string; plan: Workspace['plan'] }) {
    return request(() => {
      const workspace: Workspace = {
        id: uid('ws'),
        name: input.name,
        slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        plan: input.plan,
        hue: HUES[db.get().workspaces.length % HUES.length],
        createdAt: new Date().toISOString(),
        memberIds: [CURRENT_USER_ID],
      }
      db.set((s) => ({ workspaces: [...s.workspaces, workspace] }))
      return workspace
    }, 320)
  },

  renameWorkspace(id: string, name: string) {
    return request(() => {
      db.set((s) => ({
        workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, name } : w)),
      }))
      return true
    }, 120)
  },

  deleteWorkspace(id: string) {
    return request(() => {
      db.set((s) => ({
        workspaces: s.workspaces.filter((w) => w.id !== id),
        workflows: s.workflows.filter((w) => w.workspaceId !== id),
      }))
      return true
    }, 240)
  },
}

export const userService = {
  getCurrentUser() {
    return request(
      () => db.get().users.find((u) => u.id === CURRENT_USER_ID) ?? db.get().users[0],
      40,
    )
  },

  getMembers(workspaceId?: string) {
    return request(() => {
      const state = db.get()
      if (!workspaceId) return state.users
      const workspace = state.workspaces.find((w) => w.id === workspaceId)
      if (!workspace) return state.users
      return state.users.filter((u) => workspace.memberIds.includes(u.id))
    })
  },

  inviteMember(input: { email: string; role: Role; workspaceId: string }) {
    return request(() => {
      const user: User = {
        id: uid('u'),
        name: input.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: input.email,
        role: input.role,
        title: 'Invited member',
        status: 'invited',
        lastActiveAt: new Date().toISOString(),
        hue: HUES[db.get().users.length % HUES.length],
      }
      db.set((s) => ({
        users: [...s.users, user],
        workspaces: s.workspaces.map((w) =>
          w.id === input.workspaceId ? { ...w, memberIds: [...w.memberIds, user.id] } : w,
        ),
      }))
      return user
    }, 420)
  },

  updateRole(userId: string, role: Role) {
    return request(() => {
      db.set((s) => ({
        users: s.users.map((u) => (u.id === userId ? { ...u, role } : u)),
      }))
      return true
    }, 160)
  },

  removeMember(userId: string) {
    return request(() => {
      db.set((s) => ({
        users: s.users.filter((u) => u.id !== userId),
        workspaces: s.workspaces.map((w) => ({
          ...w,
          memberIds: w.memberIds.filter((id) => id !== userId),
        })),
      }))
      return true
    }, 200)
  },
}

export const notificationService = {
  getNotifications() {
    return request(() => db.get().notifications, 60)
  },

  markRead(id: string) {
    return request(() => {
      db.set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      }))
      return true
    }, 40)
  },

  markAllRead() {
    return request(() => {
      db.set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
      return true
    }, 80)
  },

  dismiss(id: string) {
    return request(() => {
      db.set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }))
      return true
    }, 40)
  },
}
