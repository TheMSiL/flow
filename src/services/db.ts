import {
  readStorage,
  StorageKeys,
  STORAGE_VERSION,
  writeStorage,
} from '@/lib/storage'
import { debounce } from '@/lib/utils'
import { buildActivity, buildComments, buildNotifications } from '@/data/notifications'
import { applyStats, buildExecutions } from '@/data/executions'
import { buildDailyMetrics, type DailyMetric } from '@/data/metrics'
import { buildTemplates } from '@/data/templates'
import { buildWorkflows } from '@/data/workflows'
import { INTEGRATIONS } from '@/data/integrations'
import { USERS, WORKSPACES } from '@/data/users'
import type { Execution } from '@/types/execution'
import type { Integration } from '@/types/integration'
import type { Template } from '@/types/template'
import type { Comment, Workflow } from '@/types/workflow'
import type {
  ActivityEntry,
  AppNotification,
  User,
  Workspace,
} from '@/types/workspace'

export interface DbState {
  workspaces: Workspace[]
  workflows: Workflow[]
  executions: Execution[]
  /** Pre-aggregated daily rollups powering every chart and total. */
  metrics: DailyMetric[]
  integrations: Integration[]
  notifications: AppNotification[]
  comments: Comment[]
  activity: ActivityEntry[]
  templates: Template[]
  users: User[]
}

/* ------------------------------------------------------------------ *
 * Seeding
 * ------------------------------------------------------------------ */

function seed(): DbState {
  const rawWorkflows = buildWorkflows()
  const executions = buildExecutions(rawWorkflows)
  const metrics = buildDailyMetrics(rawWorkflows)
  const workflows = applyStats(rawWorkflows, executions, metrics)
  return {
    workspaces: WORKSPACES,
    workflows,
    executions,
    metrics,
    integrations: INTEGRATIONS,
    notifications: buildNotifications(workflows, executions),
    comments: buildComments(workflows),
    activity: buildActivity(workflows),
    templates: buildTemplates(),
    users: USERS,
  }
}

function hydrate(): DbState {
  const fresh = seed()

  // A shipped change to the fixtures must not leave a returning visitor on a
  // stale snapshot, so persisted data is discarded when the schema moves.
  if (readStorage(StorageKeys.version, 0) !== STORAGE_VERSION) {
    writeStorage(StorageKeys.version, STORAGE_VERSION)
    return fresh
  }

  return {
    ...fresh,
    workspaces: readStorage(StorageKeys.workspaces, fresh.workspaces),
    workflows: readStorage(StorageKeys.workflows, fresh.workflows),
    executions: readStorage(StorageKeys.executions, fresh.executions),
    integrations: readStorage(StorageKeys.integrations, fresh.integrations),
    notifications: readStorage(StorageKeys.notifications, fresh.notifications),
    comments: readStorage(StorageKeys.comments, fresh.comments),
  }
}

/* ------------------------------------------------------------------ *
 * Store
 * ------------------------------------------------------------------ */

let state: DbState = hydrate()
const listeners = new Set<() => void>()

const persist = debounce((next: DbState) => {
  writeStorage(StorageKeys.workspaces, next.workspaces)
  writeStorage(StorageKeys.workflows, next.workflows)
  writeStorage(StorageKeys.executions, next.executions)
  writeStorage(StorageKeys.integrations, next.integrations)
  writeStorage(StorageKeys.notifications, next.notifications)
  writeStorage(StorageKeys.comments, next.comments)
}, 350)

export const db = {
  get: () => state,

  set(updater: (current: DbState) => Partial<DbState>) {
    const patch = updater(state)
    state = { ...state, ...patch }
    persist(state)
    listeners.forEach((fn) => fn())
    return state
  },

  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => void listeners.delete(listener)
  },

  /** Discards local edits and rebuilds the fixture set. */
  reset() {
    state = seed()
    writeStorage(StorageKeys.version, STORAGE_VERSION)
    persist(state)
    listeners.forEach((fn) => fn())
  },
}

/** Simulated network latency — keeps the UI honest about async data. */
export function latency(ms = 120) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Every service call funnels through here, so swapping the mock layer for
 * `fetch` later means changing this one function.
 */
export async function request<T>(resolver: () => T, ms?: number): Promise<T> {
  await latency(ms)
  return resolver()
}
