import type { Environment } from './workflow'

export type Role = 'admin' | 'editor' | 'viewer'

export type MemberStatus = 'active' | 'invited' | 'suspended'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  title: string
  status: MemberStatus
  lastActiveAt: string
  /** Deterministic hue for the generated avatar. */
  hue: number
}

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: 'free' | 'team' | 'business' | 'enterprise'
  hue: number
  createdAt: string
  memberIds: string[]
}

export interface EnvironmentInfo {
  id: Environment
  label: string
  status: 'healthy' | 'degraded' | 'idle'
  version: number
  lastDeployedAt: string | null
}

export type NotificationKind =
  | 'workflow_completed'
  | 'workflow_failed'
  | 'integration_disconnected'
  | 'workflow_published'
  | 'invite_received'
  | 'api_limit'
  | 'comment'

export interface AppNotification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  createdAt: string
  read: boolean
  level: 'info' | 'success' | 'warning' | 'error'
  workflowId?: string
  runId?: string
  actorId?: string
}

export interface ActivityEntry {
  id: string
  actorId: string
  verb: string
  target: string
  targetId?: string
  targetKind?: 'workflow' | 'run' | 'integration' | 'member' | 'template'
  createdAt: string
}

export type ThemeMode = 'dark' | 'light' | 'system'

export interface AppSettings {
  theme: ThemeMode
  reduceMotion: boolean
  showMinimap: boolean
  snapToGrid: boolean
  autoSave: boolean
  executionSpeed: 'normal' | 'fast' | 'instant'
  emailDigest: boolean
  notifyOnFailure: boolean
  notifyOnPublish: boolean
  notifyOnComment: boolean
  defaultEnvironment: Environment
  /** Simulated viewer role, used to exercise permission gating. */
  simulatedRole: Role | null
}
