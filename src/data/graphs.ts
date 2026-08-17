import { chain, edge, node, note } from './base'
import type { WorkflowNode } from '@/types/node'
import type { WorkflowEdge } from '@/types/workflow'

export interface Graph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/* ------------------------------------------------------------------ *
 * 1 — Lead qualification (the flagship graph)
 * ------------------------------------------------------------------ */

export function leadQualificationGraph(): Graph {
  return {
    nodes: [
      // A lead trigger (not a raw webhook) so `{{lead.*}}` resolves for
      // every downstream node — the namespace comes from the trigger kind.
      node('n_trigger', 'trigger.new_lead', 'New lead created', 0, 0, {
        source: 'website',
        dedupe: true,
        samplePayload:
          '{\n  "name": "Alex Morgan",\n  "email": "alex@northwind.io",\n  "company": "Northwind",\n  "score": 82,\n  "message": "We need to automate onboarding for 400 seats before Q4."\n}',
      }, 'Inbound leads from the website form'),

      node('n_ai', 'ai.analyze', 'AI Analyze Lead', 1, 0, {
        model: 'flow-reason-1',
        input: '{{lead.name}} from {{lead.company}} wrote: {{lead.message}} (inbound score {{lead.score}})',
        criteria: 'Budget signals, company size, urgency, decision-maker seniority.',
        temperature: 0.2,
        outputFormat: 'json',
      }, 'Scores intent, segment and urgency'),

      node('n_cond', 'condition.if', 'Lead score > 70', 2, 0, {
        left: '{{ai_analyze_lead.score}}',
        operator: 'gt',
        right: '70',
      }, 'Route hot leads straight to sales'),

      node('n_deal', 'action.create_deal', 'Create deal', 3, -0.7, {
        name: '{{lead.company}} — inbound',
        pipeline: 'inbound',
        stage: 'qualified',
        amount: '{{lead.score}}00',
        ownerEmail: 'sales@acmelabs.co',
      }, 'Opens a qualified opportunity'),

      node('n_slack', 'integration.slack', 'Notify sales team', 4, -0.7, {
        channel: '#sales-hot',
        message:
          '🔥 *{{lead.company}}* — score {{ai_analyze_lead.score}} ({{ai_analyze_lead.category}})\n{{lead.name}} · {{lead.email}}\nDeal: {{create_deal.url}}',
        broadcast: false,
      }),

      node('n_email', 'action.send_email', 'Send follow-up', 5, -0.7, {
        to: '{{lead.email}}',
        from: 'hello@acmelabs.co',
        subject: 'Great to meet you, {{lead.name}}',
        body:
          'Hi {{lead.name}},\n\nThanks for reaching out about {{lead.company}}. Based on what you shared I think we can help — here is a 15 minute slot with our team.\n\n— Acme Labs',
      }),

      node('n_task', 'action.create_task', 'Create follow-up task', 3, 0.9, {
        title: 'Nurture {{lead.name}} ({{lead.company}})',
        assignee: 'round_robin',
        dueInDays: 3,
        priority: 'normal',
        notes: 'AI reasoning: {{ai_analyze_lead.reasoning}}',
      }, 'Warm leads go to the nurture queue'),

      node('n_sheet', 'integration.sheets', 'Log to sheet', 4, 0.9, {
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBd',
        sheet: 'Nurture',
        operation: 'append',
        values: { Name: '{{lead.name}}', Email: '{{lead.email}}', Score: '{{ai_analyze_lead.score}}' },
      }),

      note(
        'note_1',
        'Threshold agreed with Sales on Aug 12 — do not lower below 70 without pinging Omar.',
        2,
        1.15,
      ),
    ],
    edges: [
      edge('n_trigger', 'n_ai'),
      edge('n_ai', 'n_cond'),
      edge('n_cond', 'n_deal', 'yes', 'YES'),
      edge('n_cond', 'n_task', 'no', 'NO'),
      edge('n_deal', 'n_slack'),
      edge('n_slack', 'n_email'),
      edge('n_task', 'n_sheet'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 2 — Customer onboarding
 * ------------------------------------------------------------------ */

export function onboardingGraph(): Graph {
  return {
    nodes: [
      node('o_trigger', 'trigger.new_order', 'New customer', 0, 0, {
        store: 'all',
        minAmount: 0,
      }),
      node('o_email', 'action.send_email', 'Send welcome email', 1, 0, {
        to: '{{order.email}}',
        subject: 'Welcome aboard 👋',
        body: 'Your workspace is ready. Here is how to get started in 5 minutes.',
      }),
      node('o_task', 'action.create_task', 'Assign onboarding owner', 2, 0, {
        title: 'Onboard {{order.email}}',
        assignee: 'round_robin',
        dueInDays: 1,
        priority: 'high',
      }),
      node('o_slack', 'integration.slack', 'Announce in #wins', 3, 0, {
        channel: '#wins',
        message: 'New customer: {{order.email}} · {{order.total}} {{order.currency}}',
      }),
      node('o_wait', 'action.wait', 'Wait 3 days', 4, 0, {
        mode: 'duration',
        amount: 3,
        unit: 'days',
      }),
      node('o_check', 'condition.if', 'Activated?', 5, 0, {
        left: '{{order.total}}',
        operator: 'gt',
        right: '0',
      }),
      node('o_nudge', 'action.send_email', 'Send activation nudge', 6, 0.7, {
        to: '{{order.email}}',
        subject: 'Need a hand getting started?',
        body: 'We noticed you have not run your first workflow yet.',
      }),
      node('o_notion', 'integration.notion', 'Log account', 6, -0.7, {
        databaseId: 'a3f1c9e2b7',
        operation: 'create',
        properties: { Customer: '{{order.email}}', Status: 'Active' },
      }),
    ],
    edges: [
      ...chain('o_trigger', 'o_email', 'o_task', 'o_slack', 'o_wait', 'o_check'),
      edge('o_check', 'o_notion', 'yes', 'YES'),
      edge('o_check', 'o_nudge', 'no', 'NO'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 3 — Invoice processing
 * ------------------------------------------------------------------ */

export function invoiceGraph(): Graph {
  return {
    nodes: [
      node('i_trigger', 'trigger.email_received', 'Invoice received', 0, 0, {
        mailbox: 'invoices@acmelabs.co',
        subjectContains: 'invoice',
        attachmentsOnly: true,
      }),
      node('i_extract', 'ai.extract', 'AI Extract invoice', 1, 0, {
        model: 'flow-reason-1',
        input: '{{email.body}}',
        schema:
          '{\n  "invoiceNumber": "string",\n  "vendor": "string",\n  "amount": "number",\n  "dueDate": "date"\n}',
      }),
      node('i_cond', 'condition.if', 'Amount > 5000', 2, 0, {
        left: '{{ai_extract_invoice.data.amount}}',
        operator: 'gt',
        right: '5000',
      }),
      node('i_approve', 'action.create_task', 'Request approval', 3, -0.7, {
        title: 'Approve invoice {{ai_extract_invoice.data.invoiceNumber}}',
        assignee: 'owner',
        dueInDays: 1,
        priority: 'urgent',
      }),
      node('i_sheet', 'integration.sheets', 'Record in ledger', 3, 0.7, {
        spreadsheetId: '1LedgerFY26',
        sheet: 'AP',
        operation: 'append',
        values: {
          Invoice: '{{ai_extract_invoice.data.invoiceNumber}}',
          Amount: '{{ai_extract_invoice.data.amount}}',
        },
      }),
      node('i_notify', 'integration.slack', 'Notify finance', 4, 0, {
        channel: '#finance',
        message: 'Invoice {{ai_extract_invoice.data.invoiceNumber}} processed.',
      }),
    ],
    edges: [
      edge('i_trigger', 'i_extract'),
      edge('i_extract', 'i_cond'),
      edge('i_cond', 'i_approve', 'yes', 'YES'),
      edge('i_cond', 'i_sheet', 'no', 'NO'),
      edge('i_approve', 'i_notify'),
      edge('i_sheet', 'i_notify'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 4 — Support triage
 * ------------------------------------------------------------------ */

export function supportTriageGraph(): Graph {
  return {
    nodes: [
      node('s_trigger', 'trigger.form_submitted', 'New ticket', 0, 0, {
        formId: 'support-request',
        includeMeta: true,
      }),
      node('s_ai', 'ai.classify', 'AI Classify ticket', 1, 0, {
        model: 'flow-reason-1-mini',
        input: '{{form.fields.message}}',
        categories: 'billing, technical, sales',
        multiLabel: false,
      }),
      node('s_switch', 'condition.switch', 'Route to team', 2, 0, {
        field: '{{ai_classify_ticket.label}}',
        case_1: 'billing',
        case_2: 'technical',
        case_3: 'sales',
      }),
      node('s_billing', 'integration.slack', 'Billing queue', 3, -1, {
        channel: '#support-billing',
        message: 'New billing ticket from {{form.email}}',
      }),
      node('s_tech', 'integration.slack', 'Engineering queue', 3, 0, {
        channel: '#support-eng',
        message: 'New technical ticket from {{form.email}}',
      }),
      node('s_sales', 'integration.slack', 'Sales queue', 3, 1, {
        channel: '#support-sales',
        message: 'New sales ticket from {{form.email}}',
      }),
      node('s_fallback', 'action.create_task', 'Manual triage', 3, 2, {
        title: 'Triage unclassified ticket',
        assignee: 'round_robin',
        dueInDays: 1,
        priority: 'high',
      }),
    ],
    edges: [
      edge('s_trigger', 's_ai'),
      edge('s_ai', 's_switch'),
      edge('s_switch', 's_billing', 'case_1', 'A'),
      edge('s_switch', 's_tech', 'case_2', 'B'),
      edge('s_switch', 's_sales', 'case_3', 'C'),
      edge('s_switch', 's_fallback', 'default', 'ELSE'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 5 — Daily sales report
 * ------------------------------------------------------------------ */

export function dailyReportGraph(): Graph {
  return {
    nodes: [
      node('d_trigger', 'trigger.schedule', 'Every weekday 09:00', 0, 0, {
        frequency: 'weekdays',
        time: '09:00',
        timezone: 'Europe/Kyiv',
      }),
      node('d_fetch', 'integration.hubspot', 'Fetch pipeline', 1, 0, {
        object: 'deal',
        operation: 'update',
        properties: { window: 'last_24h' },
      }),
      node('d_ai', 'ai.summarize', 'AI Summary', 2, 0, {
        model: 'flow-reason-1',
        input: '{{fetch_pipeline.objectId}} pipeline movements for the last 24 hours',
        length: 'bullets',
        tone: 'executive',
      }),
      node('d_email', 'action.send_email', 'Email leadership', 3, -0.6, {
        to: 'leadership@acmelabs.co',
        subject: 'Daily pipeline — {{system.date}}',
        body: '{{ai_summary.summary}}',
      }),
      node('d_slack', 'integration.slack', 'Post to #revenue', 3, 0.6, {
        channel: '#revenue',
        message: '*Daily pipeline*\n{{ai_summary.summary}}',
      }),
    ],
    edges: [
      ...chain('d_trigger', 'd_fetch', 'd_ai'),
      edge('d_ai', 'd_email'),
      edge('d_ai', 'd_slack'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 6 — Slack lead alerts (compact)
 * ------------------------------------------------------------------ */

export function slackAlertsGraph(): Graph {
  return {
    nodes: [
      node('sa_trigger', 'trigger.new_lead', 'New lead', 0, 0, { source: 'website', dedupe: true }),
      node('sa_filter', 'condition.filter', 'Enterprise only', 1, 0, {
        left: '{{lead.source}}',
        operator: 'equals',
        right: 'website',
      }),
      node('sa_slack', 'integration.slack', 'Alert #sales', 2, -0.5, {
        channel: '#sales',
        message: 'New lead: {{lead.name}} · {{lead.email}}',
      }),
      node('sa_log', 'utility.log', 'Log dropped', 2, 0.6, {
        level: 'info',
        message: 'Dropped lead {{lead.email}}',
      }),
    ],
    edges: [
      edge('sa_trigger', 'sa_filter'),
      edge('sa_filter', 'sa_slack', 'pass', 'PASS'),
      edge('sa_filter', 'sa_log', 'drop', 'DROP'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 7 — Churn watch
 * ------------------------------------------------------------------ */

export function churnWatchGraph(): Graph {
  return {
    nodes: [
      node('c_trigger', 'trigger.schedule', 'Weekly scan', 0, 0, {
        frequency: 'weekly',
        weekday: 'mon',
        time: '07:30',
        timezone: 'Europe/Kyiv',
      }),
      node('c_http', 'action.http_request', 'Fetch usage', 1, 0, {
        url: 'https://api.acmelabs.co/v1/usage?window=30d',
        method: 'GET',
        timeoutMs: 10000,
      }),
      node('c_ai', 'ai.analyze', 'Predict churn risk', 2, 0, {
        model: 'flow-reason-1-pro',
        input: 'Usage payload: {{fetch_usage.body}}',
        criteria: 'Declining active seats, dropped runs, support escalations.',
        temperature: 0.1,
      }),
      node('c_cond', 'condition.if', 'Risk > 60', 3, 0, {
        left: '{{predict_churn_risk.score}}',
        operator: 'gt',
        right: '60',
      }),
      node('c_task', 'action.create_task', 'Alert CSM', 4, -0.6, {
        title: 'Churn risk review',
        assignee: 'owner',
        dueInDays: 2,
        priority: 'high',
      }),
      node('c_sheet', 'integration.sheets', 'Append to watchlist', 4, 0.6, {
        spreadsheetId: '1ChurnWatch',
        sheet: 'Q3',
        operation: 'append',
        values: { Score: '{{predict_churn_risk.score}}' },
      }),
    ],
    edges: [
      ...chain('c_trigger', 'c_http', 'c_ai', 'c_cond'),
      edge('c_cond', 'c_task', 'yes', 'YES'),
      edge('c_cond', 'c_sheet', 'no', 'NO'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 8 — Payment recovery
 * ------------------------------------------------------------------ */

export function paymentRecoveryGraph(): Graph {
  return {
    nodes: [
      node('p_trigger', 'trigger.payment_received', 'Payment failed', 0, 0, {
        provider: 'stripe',
        minAmount: 0,
      }),
      node('p_wait', 'action.wait', 'Wait 1 day', 1, 0, { mode: 'duration', amount: 1, unit: 'days' }),
      node('p_email', 'action.send_email', 'Dunning email', 2, 0, {
        to: '{{payment.customerEmail}}',
        subject: 'Payment could not be processed',
        body: 'Please update your card to keep your workspace active.',
      }),
      node('p_stripe', 'integration.stripe', 'Retry charge', 3, 0, {
        operation: 'create_invoice',
        customerEmail: '{{payment.customerEmail}}',
        amount: '{{payment.amount}}',
        currency: 'usd',
      }),
      node('p_cond', 'condition.if', 'Recovered?', 4, 0, {
        left: '{{retry_charge.status}}',
        operator: 'equals',
        right: 'ok',
      }),
      node('p_ok', 'integration.slack', 'Report recovery', 5, -0.6, {
        channel: '#billing',
        message: 'Recovered {{payment.amount}} from {{payment.customerEmail}}',
      }),
      node('p_esc', 'action.create_task', 'Escalate to finance', 5, 0.6, {
        title: 'Failed recovery — {{payment.customerEmail}}',
        assignee: 'owner',
        dueInDays: 1,
        priority: 'urgent',
      }),
    ],
    edges: [
      ...chain('p_trigger', 'p_wait', 'p_email', 'p_stripe', 'p_cond'),
      edge('p_cond', 'p_ok', 'yes', 'YES'),
      edge('p_cond', 'p_esc', 'no', 'NO'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 9 — Content pipeline
 * ------------------------------------------------------------------ */

export function contentPipelineGraph(): Graph {
  return {
    nodes: [
      node('ct_trigger', 'trigger.form_submitted', 'Brief submitted', 0, 0, {
        formId: 'content-brief',
        includeMeta: true,
      }),
      node('ct_ai', 'ai.generate', 'Draft article', 1, 0, {
        model: 'flow-reason-1',
        prompt: 'Write a 600 word article for the brief: {{form.fields.brief}}',
        temperature: 0.7,
        maxTokens: 1600,
        format: 'markdown',
      }),
      node('ct_notion', 'integration.notion', 'Create draft page', 2, 0, {
        databaseId: 'contentdb01',
        operation: 'create',
        properties: { Title: '{{form.fields.title}}', Status: 'Draft' },
      }),
      node('ct_task', 'action.create_task', 'Assign editor', 3, 0, {
        title: 'Edit: {{form.fields.title}}',
        assignee: 'round_robin',
        dueInDays: 2,
        priority: 'normal',
      }),
      node('ct_slack', 'integration.slack', 'Ping #content', 4, 0, {
        channel: '#content',
        message: 'Draft ready: {{create_draft_page.url}}',
      }),
    ],
    edges: chain('ct_trigger', 'ct_ai', 'ct_notion', 'ct_task', 'ct_slack'),
  }
}

/* ------------------------------------------------------------------ *
 * 10 — Webhook relay (small utility graph)
 * ------------------------------------------------------------------ */

export function webhookRelayGraph(): Graph {
  return {
    nodes: [
      node('w_trigger', 'trigger.webhook', 'Incoming event', 0, 0, {
        endpoint: 'https://hooks.flow.app/w/relay_2c81',
        method: 'POST',
        samplePayload: '{\n  "event": "user.created",\n  "id": "usr_882"\n}',
      }),
      node('w_transform', 'action.transform', 'Normalise payload', 1, 0, {
        mode: 'map',
        mapping: { id: '{{payload.id}}', type: '{{payload.event}}' },
      }),
      node('w_out', 'integration.webhook', 'Forward to warehouse', 2, 0, {
        url: 'https://warehouse.acmelabs.co/ingest',
        method: 'POST',
        headers: { 'X-Source': 'flow' },
      }),
      node('w_log', 'utility.log', 'Trace', 3, 0, {
        level: 'info',
        message: 'Relayed {{normalise_payload.result.type}}',
      }),
    ],
    edges: chain('w_trigger', 'w_transform', 'w_out', 'w_log'),
  }
}

/* ------------------------------------------------------------------ *
 * 11 — NPS follow-up
 * ------------------------------------------------------------------ */

export function npsGraph(): Graph {
  return {
    nodes: [
      node('np_trigger', 'trigger.form_submitted', 'NPS response', 0, 0, {
        formId: 'nps-quarterly',
        includeMeta: true,
      }),
      node('np_cond', 'condition.if', 'Detractor?', 1, 0, {
        left: '{{form.fields.score}}',
        operator: 'lt',
        right: '7',
      }),
      node('np_ai', 'ai.summarize', 'Summarise feedback', 2, 0.7, {
        model: 'flow-reason-1-mini',
        input: '{{form.fields.comment}}',
        length: 'oneline',
        tone: 'neutral',
      }),
      node('np_task', 'action.create_task', 'Schedule call', 3, 0.7, {
        title: 'Detractor follow-up — {{form.email}}',
        assignee: 'owner',
        dueInDays: 2,
        priority: 'high',
      }),
      node('np_thanks', 'action.send_email', 'Thank promoter', 2, -0.7, {
        to: '{{form.email}}',
        subject: 'Thanks for the kind words',
        body: 'Would you be open to a short case study?',
      }),
    ],
    edges: [
      edge('np_trigger', 'np_cond'),
      edge('np_cond', 'np_ai', 'yes', 'YES'),
      edge('np_cond', 'np_thanks', 'no', 'NO'),
      edge('np_ai', 'np_task'),
    ],
  }
}

/* ------------------------------------------------------------------ *
 * 12 — Deal desk approvals
 * ------------------------------------------------------------------ */

export function dealDeskGraph(): Graph {
  return {
    nodes: [
      node('dd_trigger', 'trigger.new_order', 'Quote requested', 0, 0, { store: 'all', minAmount: 0 }),
      node('dd_var', 'utility.set_variable', 'Compute discount', 1, 0, {
        name: 'discount',
        value: '{{order.total}}',
        scope: 'run',
      }),
      node('dd_cond', 'condition.if', 'Discount > 20%', 2, 0, {
        left: '{{compute_discount.value}}',
        operator: 'gt',
        right: '20',
      }),
      node('dd_task', 'action.create_task', 'CFO approval', 3, -0.6, {
        title: 'Approve discount on {{order.id}}',
        assignee: 'owner',
        dueInDays: 1,
        priority: 'urgent',
      }),
      node('dd_auto', 'action.update_record', 'Auto-approve', 3, 0.6, {
        object: 'deal',
        recordId: '{{order.id}}',
        fields: { approval: 'auto' },
      }),
      node('dd_merge', 'utility.merge', 'Continue', 4, 0, { strategy: 'shallow', waitForAll: false }),
      node('dd_slack', 'integration.slack', 'Post outcome', 5, 0, {
        channel: '#deal-desk',
        message: 'Quote {{order.id}} processed.',
      }),
    ],
    edges: [
      ...chain('dd_trigger', 'dd_var', 'dd_cond'),
      edge('dd_cond', 'dd_task', 'yes', 'YES'),
      edge('dd_cond', 'dd_auto', 'no', 'NO'),
      { ...edge('dd_task', 'dd_merge'), targetHandle: 'a' },
      { ...edge('dd_auto', 'dd_merge'), targetHandle: 'b' },
      edge('dd_merge', 'dd_slack'),
    ],
  }
}

export const GRAPH_BUILDERS = {
  lead: leadQualificationGraph,
  onboarding: onboardingGraph,
  invoice: invoiceGraph,
  support: supportTriageGraph,
  report: dailyReportGraph,
  slackAlerts: slackAlertsGraph,
  churn: churnWatchGraph,
  payments: paymentRecoveryGraph,
  content: contentPipelineGraph,
  relay: webhookRelayGraph,
  nps: npsGraph,
  dealDesk: dealDeskGraph,
} as const

export type GraphKey = keyof typeof GRAPH_BUILDERS

/** Namespaces node/edge ids so two workflows can share a graph shape. */
export function instantiateGraph(key: GraphKey, prefix: string): Graph {
  const graph = GRAPH_BUILDERS[key]()
  const map = new Map<string, string>()
  const nodes = graph.nodes.map((n) => {
    const id = `${prefix}${n.id}`
    map.set(n.id, id)
    return { ...n, id, data: { ...n.data, config: { ...n.data.config } } }
  })
  const edges = graph.edges.map((e) => ({
    ...e,
    id: `${prefix}${e.id}`,
    source: map.get(e.source) ?? e.source,
    target: map.get(e.target) ?? e.target,
  }))
  return { nodes, edges }
}
