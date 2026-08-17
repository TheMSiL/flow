import { createRng, pick, pickWeighted } from '@/lib/random'
import { iso, NOW, SEED } from './base'
import { USERS } from './users'
import type { ActivityEntry, AppNotification, NotificationKind } from '@/types/workspace'
import type { Comment } from '@/types/workflow'
import type { Execution } from '@/types/execution'
import type { Workflow } from '@/types/workflow'

const KIND_META: Record<
  NotificationKind,
  { level: AppNotification['level']; title: (name: string) => string; body: (name: string) => string }
> = {
  workflow_completed: {
    level: 'success',
    title: (name) => `${name} completed`,
    body: (name) => `The latest run of ${name} finished without errors.`,
  },
  workflow_failed: {
    level: 'error',
    title: (name) => `${name} failed`,
    body: () => 'A step returned an error. Open the run to see the failing node.',
  },
  integration_disconnected: {
    level: 'warning',
    title: () => 'Stripe disconnected',
    body: () => 'The stored API key was rotated and is no longer valid.',
  },
  workflow_published: {
    level: 'info',
    title: (name) => `${name} published`,
    body: (name) => `A new version of ${name} is live in production.`,
  },
  invite_received: {
    level: 'info',
    title: () => 'You were added to Sales Automation',
    body: () => 'Omar Haddad invited you as an editor.',
  },
  api_limit: {
    level: 'warning',
    title: () => 'Approaching your execution limit',
    body: () => 'You have used 84% of this month’s included executions.',
  },
  comment: {
    level: 'info',
    title: (name) => `New comment on ${name}`,
    body: () => 'Someone mentioned you in a node comment.',
  },
}

export function buildNotifications(
  workflows: Workflow[],
  executions: Execution[],
): AppNotification[] {
  const rng = createRng(SEED + 331)
  const out: AppNotification[] = []

  for (let i = 0; i < 30; i++) {
    const kind = pickWeighted<NotificationKind>(rng, [
      ['workflow_completed', 8],
      ['workflow_failed', 7],
      ['workflow_published', 5],
      ['comment', 4],
      ['integration_disconnected', 2],
      ['api_limit', 1],
      ['invite_received', 1],
    ])
    const workflow = pick(rng, workflows)
    const run = executions.find((e) => e.workflowId === workflow.id)
    const meta = KIND_META[kind]
    const ageMinutes = Math.round(Math.pow(i / 30, 1.7) * 20_160) + i * 11

    out.push({
      id: `ntf_${i.toString(36)}${workflow.id.slice(-2)}`,
      kind,
      title: meta.title(workflow.name),
      body: meta.body(workflow.name),
      createdAt: iso(NOW - ageMinutes * 60_000),
      read: i > 5,
      level: meta.level,
      workflowId: workflow.id,
      runId: kind.startsWith('workflow_') ? run?.id : undefined,
      actorId: pick(rng, USERS).id,
    })
  }

  return out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

const VERBS: { verb: string; kind: ActivityEntry['targetKind'] }[] = [
  { verb: 'published', kind: 'workflow' },
  { verb: 'edited', kind: 'workflow' },
  { verb: 'paused', kind: 'workflow' },
  { verb: 'duplicated', kind: 'workflow' },
  { verb: 'retried', kind: 'run' },
  { verb: 'commented on', kind: 'workflow' },
  { verb: 'connected', kind: 'integration' },
  { verb: 'used template', kind: 'template' },
  { verb: 'invited', kind: 'member' },
  { verb: 'archived', kind: 'workflow' },
]

export function buildActivity(workflows: Workflow[]): ActivityEntry[] {
  const rng = createRng(SEED + 559)
  const out: ActivityEntry[] = []
  for (let i = 0; i < 50; i++) {
    const { verb, kind } = pick(rng, VERBS)
    const workflow = pick(rng, workflows)
    const target =
      kind === 'integration'
        ? pick(rng, ['Slack', 'Notion', 'HubSpot', 'Google Sheets'])
        : kind === 'member'
          ? pick(rng, USERS).name
          : kind === 'template'
            ? pick(rng, ['Lead qualification', 'AI support triage', 'Invoice processing'])
            : workflow.name
    const ageMinutes = Math.round(Math.pow(i / 50, 1.6) * 30_240) + i * 9
    out.push({
      id: `act_${i.toString(36)}`,
      actorId: pick(rng, USERS).id,
      verb,
      target,
      targetId: kind === 'workflow' ? workflow.id : undefined,
      targetKind: kind,
      createdAt: iso(NOW - ageMinutes * 60_000),
    })
  }
  return out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

const COMMENT_BODIES = [
  'Check with sales before we lower this threshold.',
  'Can we add a fallback address here? Some leads come in without an email.',
  'Nice — this cut our response time in half last week.',
  'The prompt is a bit long. Worth trimming before we publish.',
  'Should this route to #sales-hot instead?',
  'I updated the pipeline mapping, please re-test.',
]

export function buildComments(workflows: Workflow[]): Comment[] {
  const rng = createRng(SEED + 991)
  const out: Comment[] = []
  const flagship = workflows.find((w) => w.id === 'wf_01')
  if (flagship) {
    out.push({
      id: 'cmt_1',
      workflowId: flagship.id,
      nodeId: `${flagship.id}_n_cond`,
      authorId: 'u_omar',
      body: 'Check with sales before publishing — we agreed on 70 for Q3, might move to 75.',
      createdAt: iso(NOW - 5 * 3_600_000),
      resolved: false,
      replies: [
        {
          id: 'cmt_1_r1',
          authorId: 'u_maya',
          body: 'Agreed. Let’s revisit after the September pipeline review.',
          createdAt: iso(NOW - 4 * 3_600_000),
        },
      ],
    })
    out.push({
      id: 'cmt_2',
      workflowId: flagship.id,
      nodeId: `${flagship.id}_n_email`,
      authorId: 'u_ines',
      body: 'Copy approved by brand. Please don’t change the subject line.',
      createdAt: iso(NOW - 26 * 3_600_000),
      resolved: true,
      replies: [],
    })
  }

  workflows.slice(1, 8).forEach((workflow, index) => {
    const node = workflow.nodes[(index + 1) % workflow.nodes.length]
    out.push({
      id: `cmt_gen_${index}`,
      workflowId: workflow.id,
      nodeId: node?.id,
      authorId: pick(rng, USERS).id,
      body: pick(rng, COMMENT_BODIES),
      createdAt: iso(NOW - (index + 2) * 9 * 3_600_000),
      resolved: index % 3 === 0,
      replies: [],
    })
  })

  return out
}
