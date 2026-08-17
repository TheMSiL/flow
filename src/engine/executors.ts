import type { Rng } from '@/lib/random'
import { resolveDeep, resolveTemplate } from '@/lib/variables'
import { evaluateOperator, type OperatorId } from './operators'
import type { NodeConfig, NodeType, WorkflowNode } from '@/types/node'

export interface ExecContext {
  /** Everything resolvable by `{{…}}` at this point in the run. */
  scope: Record<string, unknown>
  /** Payload handed to this node by its predecessor. */
  input: Record<string, unknown>
  node: WorkflowNode
  rng: Rng
}

export interface ExecResult {
  output: Record<string, unknown>
  /** Outgoing handle to follow — condition nodes only. */
  branch?: string
  /** Extra log lines emitted by the node itself. */
  logs?: { level: 'info' | 'warn' | 'error'; message: string }[]
}

type Executor = (ctx: ExecContext) => ExecResult

const str = (config: NodeConfig, key: string, fallback = '') =>
  typeof config[key] === 'string' ? (config[key] as string) : fallback

const num = (config: NodeConfig, key: string, fallback = 0) => {
  const value = config[key]
  if (typeof value === 'number') return value
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

/** Stable pseudo-id derived from the run's rng — reads like a real id. */
function fakeId(rng: Rng, prefix: string, length = 8) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(rng() * alphabet.length)]
  return `${prefix}_${out}`
}

const INTENTS = ['high', 'medium', 'low'] as const
const SEGMENTS = ['enterprise', 'mid-market', 'smb', 'startup'] as const

/* ------------------------------------------------------------------ *
 * Per-kind executors
 * ------------------------------------------------------------------ */

const triggerExecutor: Executor = ({ input, node }) => ({
  output: {
    ...input,
    receivedAt: new Date().toISOString(),
    source: node.type.replace('trigger.', ''),
  },
})

const conditionExecutor: Executor = ({ node, scope }) => {
  const config = node.data.config
  const left = resolveTemplate(str(config, 'left') || str(config, 'field'), scope)
  const right = resolveTemplate(str(config, 'right'), scope)
  const operator = (str(config, 'operator', 'equals') || 'equals') as OperatorId
  const result = evaluateOperator(left, operator, right)

  if (node.type === 'condition.filter') {
    return {
      output: { passed: result, evaluated: `${left} ${operator} ${right}` },
      branch: result ? 'pass' : 'drop',
      logs: [{ level: 'info', message: `Filter ${result ? 'passed' : 'dropped'}: ${left} ${operator} ${right}` }],
    }
  }

  return {
    output: { result, branch: result ? 'yes' : 'no', evaluated: `${left} ${operator} ${right}` },
    branch: result ? 'yes' : 'no',
    logs: [{ level: 'info', message: `Condition ${result ? 'YES' : 'NO'} — ${left} ${operator} ${right}` }],
  }
}

const switchExecutor: Executor = ({ node, scope }) => {
  const config = node.data.config
  const value = resolveTemplate(str(config, 'field'), scope).trim().toLowerCase()
  const cases: [string, string][] = [
    ['case_1', str(config, 'case_1')],
    ['case_2', str(config, 'case_2')],
    ['case_3', str(config, 'case_3')],
  ]
  const hit = cases.find(
    ([, expected]) => expected && expected.trim().toLowerCase() === value,
  )
  const branch = hit?.[0] ?? 'default'
  return {
    output: { matched: hit?.[1] ?? null, branch, value },
    branch,
    logs: [{ level: 'info', message: `Switch routed "${value || '∅'}" → ${branch}` }],
  }
}

/** Deterministic-feeling AI output derived from the resolved input text. */
const aiAnalyzeExecutor: Executor = ({ node, scope, rng }) => {
  const text = resolveTemplate(str(node.data.config, 'input'), scope)
  const numbers = text.match(/\d+/g)?.map(Number) ?? []
  // Prefer a number already present in the payload — it makes the
  // downstream condition feel connected to the test input.
  const score = numbers.length
    ? Math.min(100, Math.max(1, numbers[numbers.length - 1]))
    : Math.round(45 + rng() * 50)
  const intent = score >= 70 ? INTENTS[0] : score >= 40 ? INTENTS[1] : INTENTS[2]
  const category = SEGMENTS[Math.floor(rng() * SEGMENTS.length)]
  return {
    output: {
      score,
      intent,
      category,
      reasoning:
        score >= 70
          ? 'Strong buying signals and a named budget owner.'
          : score >= 40
            ? 'Some interest, no timeline mentioned yet.'
            : 'Low engagement, likely research stage.',
      tokens: 320 + Math.round(rng() * 400),
    },
    logs: [{ level: 'info', message: `Scored ${score}/100 · intent ${intent} · ${category}` }],
  }
}

const aiClassifyExecutor: Executor = ({ node, scope, rng }) => {
  const raw = str(node.data.config, 'categories', 'general')
  const categories = raw.split(',').map((c) => c.trim()).filter(Boolean)
  const text = resolveTemplate(str(node.data.config, 'input'), scope).toLowerCase()
  const matched = categories.find((c) => text.includes(c.toLowerCase()))
  const label = matched ?? categories[Math.floor(rng() * Math.max(categories.length, 1))] ?? 'general'
  return {
    output: {
      label,
      confidence: Number((0.72 + rng() * 0.27).toFixed(2)),
      categories,
    },
    logs: [{ level: 'info', message: `Classified as "${label}"` }],
  }
}

const aiSummarizeExecutor: Executor = ({ node, scope, rng }) => {
  const text = resolveTemplate(str(node.data.config, 'input'), scope)
  const words = text.split(/\s+/).filter(Boolean)
  const summary = words.length
    ? `${words.slice(0, 18).join(' ')}${words.length > 18 ? '…' : ''}`
    : 'Nothing to summarise — the input resolved to an empty string.'
  return {
    output: { summary, tokens: 180 + Math.round(rng() * 500), length: str(node.data.config, 'length', 'short') },
  }
}

const aiExtractExecutor: Executor = ({ node, scope, rng }) => {
  const raw = str(node.data.config, 'schema', '{}')
  let shape: Record<string, string> = {}
  try {
    shape = JSON.parse(raw) as Record<string, string>
  } catch {
    shape = {}
  }
  const source = resolveTemplate(str(node.data.config, 'input'), scope)
  const numbers = source.match(/[\d.]+/g) ?? []
  const data: Record<string, unknown> = {}
  let numberCursor = 0
  for (const [key, type] of Object.entries(shape)) {
    if (type === 'number') {
      data[key] = Number(numbers[numberCursor++] ?? Math.round(rng() * 5000) / 10)
    } else if (type === 'date') {
      data[key] = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)
    } else {
      data[key] = `${key}-${fakeId(rng, 'v', 4).slice(2)}`
    }
  }
  return {
    output: { data, confidence: Number((0.8 + rng() * 0.19).toFixed(2)), fields: Object.keys(shape) },
    logs: [{ level: 'info', message: `Extracted ${Object.keys(data).length} fields` }],
  }
}

const aiGenerateExecutor: Executor = ({ node, scope, rng }) => {
  const prompt = resolveTemplate(str(node.data.config, 'prompt'), scope)
  return {
    output: {
      text: prompt
        ? `${prompt.split('\n')[0].slice(0, 120)}\n\n— generated by ${str(node.data.config, 'model', 'flow-reason-1')}`
        : '',
      tokens: 240 + Math.round(rng() * 700),
    },
  }
}

const sendEmailExecutor: Executor = ({ node, scope, rng }) => {
  const to = resolveTemplate(str(node.data.config, 'to'), scope)
  const subject = resolveTemplate(str(node.data.config, 'subject'), scope)
  return {
    output: { messageId: fakeId(rng, 'msg'), accepted: true, to, subject },
    logs: [{ level: 'info', message: `Queued email to ${to || '—'}` }],
  }
}

const createTaskExecutor: Executor = ({ node, scope, rng }) => {
  const days = num(node.data.config, 'dueInDays', 2)
  return {
    output: {
      taskId: fakeId(rng, 'tsk', 6),
      title: resolveTemplate(str(node.data.config, 'title'), scope),
      dueAt: new Date(Date.now() + days * 864e5).toISOString(),
      priority: str(node.data.config, 'priority', 'normal'),
    },
  }
}

const createDealExecutor: Executor = ({ node, scope, rng }) => {
  const id = fakeId(rng, 'deal', 6)
  return {
    output: {
      dealId: id,
      name: resolveTemplate(str(node.data.config, 'name'), scope),
      stage: str(node.data.config, 'stage', 'qualified'),
      amount: resolveTemplate(str(node.data.config, 'amount'), scope),
      url: `https://crm.acme.co/deals/${id}`,
    },
    logs: [{ level: 'info', message: `Deal ${id} opened in ${str(node.data.config, 'pipeline', 'inbound')}` }],
  }
}

const httpExecutor: Executor = ({ node, scope, rng }) => {
  const url = resolveTemplate(str(node.data.config, 'url'), scope)
  return {
    output: {
      status: 200,
      body: { ok: true, echoed: url },
      durationMs: 90 + Math.round(rng() * 260),
    },
    logs: [{ level: 'info', message: `${str(node.data.config, 'method', 'POST')} ${url || '—'} → 200` }],
  }
}

const waitExecutor: Executor = ({ node }) => {
  const config = node.data.config
  const mode = str(config, 'mode', 'duration')
  const unit = str(config, 'unit', 'minutes')
  const amount = num(config, 'amount', 15)
  const multiplier = { seconds: 1e3, minutes: 6e4, hours: 3.6e6, days: 8.64e7 }[unit] ?? 6e4
  return {
    output: {
      resumedAt: new Date(Date.now() + (mode === 'duration' ? amount * multiplier : 0)).toISOString(),
      waited: mode === 'duration' ? `${amount} ${unit}` : str(config, 'until'),
    },
    logs: [{ level: 'info', message: 'Wait skipped in simulation' }],
  }
}

const transformExecutor: Executor = ({ node, scope, input }) => {
  const mapping = (node.data.config.mapping ?? {}) as Record<string, string>
  const result: Record<string, unknown> = {}
  for (const [key, template] of Object.entries(mapping)) {
    result[key] = resolveTemplate(String(template), scope)
  }
  const merged = Object.keys(result).length ? result : input
  return { output: { result: merged, keys: Object.keys(merged) } }
}

const notificationExecutor: Executor = ({ node, scope }) => {
  const target = resolveTemplate(str(node.data.config, 'target'), scope)
  return {
    output: { delivered: true, channel: target, via: str(node.data.config, 'channel', 'slack') },
    logs: [{ level: 'info', message: `Notified ${target || '—'}` }],
  }
}

const slackExecutor: Executor = ({ node, scope, rng }) => {
  const channel = resolveTemplate(str(node.data.config, 'channel'), scope)
  const ts = `${Math.floor(Date.now() / 1000)}.${Math.floor(rng() * 900 + 100)}`
  return {
    output: { ts, channel, permalink: `https://acme.slack.com/archives/${ts}` },
    logs: [{ level: 'info', message: `Posted to ${channel || '#general'}` }],
  }
}

const telegramExecutor: Executor = ({ node, scope, rng }) => ({
  output: {
    messageId: Math.floor(rng() * 90000 + 10000),
    chatId: resolveTemplate(str(node.data.config, 'chatId'), scope),
  },
})

const sheetsExecutor: Executor = ({ node, rng }) => {
  const row = 12 + Math.floor(rng() * 400)
  const op = str(node.data.config, 'operation', 'append')
  return {
    output: {
      range: `${str(node.data.config, 'sheet', 'Sheet1')}!A${row}:E${row}`,
      rows: op === 'read' ? Math.floor(rng() * 40) + 1 : 1,
      operation: op,
    },
  }
}

const genericIntegrationExecutor: Executor = ({ node, rng }) => ({
  output: {
    objectId: fakeId(rng, node.type.split('.')[1]?.slice(0, 3) ?? 'obj', 6),
    status: 'ok',
    createdAt: new Date().toISOString(),
  },
})

const setVariableExecutor: Executor = ({ node, scope }) => {
  const name = str(node.data.config, 'name', 'value')
  const value = resolveTemplate(str(node.data.config, 'value'), scope)
  return { output: { name, value }, logs: [{ level: 'info', message: `${name} = ${value}` }] }
}

const logExecutor: Executor = ({ node, scope }) => {
  const message = resolveTemplate(str(node.data.config, 'message'), scope)
  const level = str(node.data.config, 'level', 'info') as 'info' | 'warn' | 'error'
  return { output: { logged: true, message }, logs: [{ level, message }] }
}

const codeExecutor: Executor = ({ input, rng }) => ({
  output: { result: { ...input, computed: true, hash: fakeId(rng, 'h', 6) } },
  logs: [{ level: 'info', message: 'Sandbox returned in 12ms' }],
})

const passthroughExecutor: Executor = ({ input, rng }) => ({
  output: { ...input, ok: true, id: fakeId(rng, 'res', 6) },
})

const EXECUTORS: Partial<Record<NodeType, Executor>> = {
  'trigger.webhook': triggerExecutor,
  'trigger.schedule': triggerExecutor,
  'trigger.new_lead': triggerExecutor,
  'trigger.new_order': triggerExecutor,
  'trigger.form_submitted': triggerExecutor,
  'trigger.email_received': triggerExecutor,
  'trigger.payment_received': triggerExecutor,
  'trigger.manual': triggerExecutor,

  'action.send_email': sendEmailExecutor,
  'action.create_task': createTaskExecutor,
  'action.update_record': passthroughExecutor,
  'action.create_deal': createDealExecutor,
  'action.send_notification': notificationExecutor,
  'action.http_request': httpExecutor,
  'action.wait': waitExecutor,
  'action.transform': transformExecutor,

  'condition.if': conditionExecutor,
  'condition.filter': conditionExecutor,
  'condition.switch': switchExecutor,

  'ai.analyze': aiAnalyzeExecutor,
  'ai.classify': aiClassifyExecutor,
  'ai.summarize': aiSummarizeExecutor,
  'ai.extract': aiExtractExecutor,
  'ai.generate': aiGenerateExecutor,

  'integration.slack': slackExecutor,
  'integration.telegram': telegramExecutor,
  'integration.discord': genericIntegrationExecutor,
  'integration.gmail': sendEmailExecutor,
  'integration.sheets': sheetsExecutor,
  'integration.notion': genericIntegrationExecutor,
  'integration.hubspot': genericIntegrationExecutor,
  'integration.stripe': genericIntegrationExecutor,
  'integration.openai': aiGenerateExecutor,
  'integration.webhook': httpExecutor,

  'utility.set_variable': setVariableExecutor,
  'utility.merge': passthroughExecutor,
  'utility.log': logExecutor,
  'utility.code': codeExecutor,
}

export function getExecutor(type: NodeType): Executor {
  return EXECUTORS[type] ?? passthroughExecutor
}

/** Resolved config snapshot recorded as the step's `input`. */
export function resolveNodeInput(node: WorkflowNode, scope: Record<string, unknown>) {
  return resolveDeep(node.data.config, scope) as Record<string, unknown>
}

