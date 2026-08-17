import type {
  NodeCategory,
  NodeDefinition,
  NodeType,
} from '@/types/node'

/* ------------------------------------------------------------------ *
 * Shared field fragments
 * ------------------------------------------------------------------ */

const IN = [{ id: 'in' }]
const OUT = [{ id: 'out' }]
const NO_IN: NodeDefinition['inputs'] = []

const AI_MODELS = [
  { value: 'flow-reason-1', label: 'Flow Reason 1', hint: 'Balanced · $0.004/run' },
  { value: 'flow-reason-1-mini', label: 'Flow Reason 1 Mini', hint: 'Fast · $0.001/run' },
  { value: 'flow-reason-1-pro', label: 'Flow Reason 1 Pro', hint: 'Deep · $0.012/run' },
]

const TEMPERATURE = {
  key: 'temperature',
  label: 'Temperature',
  type: 'slider' as const,
  min: 0,
  max: 1,
  step: 0.1,
  defaultValue: 0.3,
  help: 'Lower values keep the output deterministic.',
}

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'gt', label: 'is greater than' },
  { value: 'lt', label: 'is less than' },
  { value: 'gte', label: 'is greater or equal' },
  { value: 'lte', label: 'is less or equal' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
]

/* ------------------------------------------------------------------ *
 * Category metadata
 * ------------------------------------------------------------------ */

export interface CategoryMeta {
  id: NodeCategory
  label: string
  plural: string
  description: string
  /** Tailwind token suffix — resolves to `text-cat-<token>` etc. */
  token: string
  icon: string
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'trigger',
    label: 'Trigger',
    plural: 'Triggers',
    description: 'Start a workflow when something happens',
    token: 'trigger',
    icon: 'zap',
  },
  {
    id: 'action',
    label: 'Action',
    plural: 'Actions',
    description: 'Do something with the data',
    token: 'action',
    icon: 'send',
  },
  {
    id: 'condition',
    label: 'Logic',
    plural: 'Conditions',
    description: 'Branch, filter and route',
    token: 'condition',
    icon: 'gitBranch',
  },
  {
    id: 'ai',
    label: 'AI',
    plural: 'AI',
    description: 'Reason over unstructured data',
    token: 'ai',
    icon: 'sparkles',
  },
  {
    id: 'integration',
    label: 'Integration',
    plural: 'Integrations',
    description: 'Connect the tools you already use',
    token: 'integration',
    icon: 'network',
  },
  {
    id: 'utility',
    label: 'Utility',
    plural: 'Utilities',
    description: 'Glue, variables and debugging',
    token: 'utility',
    icon: 'braces',
  },
]

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<NodeCategory, CategoryMeta>

/* ------------------------------------------------------------------ *
 * Node definitions
 * ------------------------------------------------------------------ */

const TRIGGERS: NodeDefinition[] = [
  {
    type: 'trigger.webhook',
    category: 'trigger',
    label: 'Webhook',
    description: 'Runs when an HTTP request hits your endpoint',
    icon: 'webhook',
    popular: true,
    keywords: ['http', 'post', 'incoming', 'api', 'endpoint'],
    inputs: NO_IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'endpoint',
        label: 'Endpoint URL',
        type: 'endpoint',
        required: true,
        help: 'Send requests here to start this workflow.',
      },
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        defaultValue: 'POST',
        options: [
          { value: 'POST', label: 'POST' },
          { value: 'GET', label: 'GET' },
          { value: 'PUT', label: 'PUT' },
        ],
      },
      {
        key: 'secret',
        label: 'Signing secret',
        type: 'text',
        placeholder: 'whsec_…',
        help: 'Requests are rejected when the signature does not match.',
      },
      {
        key: 'samplePayload',
        label: 'Sample payload',
        type: 'json',
        rows: 6,
        defaultValue:
          '{\n  "name": "Alex Morgan",\n  "email": "alex@example.com",\n  "score": 82\n}',
        help: 'Used for test runs and to populate the variable picker.',
      },
    ],
    outputs: [
      { key: 'body', type: 'object', description: 'Parsed request body', sample: '{…}' },
      { key: 'headers', type: 'object', description: 'Request headers', sample: '{…}' },
      { key: 'receivedAt', type: 'string', description: 'ISO timestamp', sample: '2026-08-17T09:12:04Z' },
    ],
  },
  {
    type: 'trigger.schedule',
    category: 'trigger',
    label: 'Schedule',
    description: 'Runs on a recurring schedule',
    icon: 'calendar',
    popular: true,
    keywords: ['cron', 'timer', 'recurring', 'daily', 'weekly'],
    inputs: NO_IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'frequency',
        label: 'Frequency',
        type: 'cron',
        required: true,
        defaultValue: 'daily',
      },
      {
        key: 'timezone',
        label: 'Timezone',
        type: 'select',
        defaultValue: 'Europe/Kyiv',
        options: [
          { value: 'Europe/Kyiv', label: 'Europe/Kyiv (UTC+3)' },
          { value: 'Europe/London', label: 'Europe/London (UTC+1)' },
          { value: 'America/New_York', label: 'America/New_York (UTC−4)' },
          { value: 'America/Los_Angeles', label: 'America/Los_Angeles (UTC−7)' },
          { value: 'UTC', label: 'UTC' },
        ],
      },
      {
        key: 'skipWeekends',
        label: 'Skip weekends',
        type: 'boolean',
        defaultValue: false,
      },
    ],
    outputs: [
      { key: 'scheduledFor', type: 'string', description: 'Planned run time', sample: '2026-08-18T09:00:00Z' },
      { key: 'occurrence', type: 'number', description: 'Run index in the series', sample: 412 },
    ],
  },
  {
    type: 'trigger.new_lead',
    category: 'trigger',
    label: 'New lead',
    description: 'Runs when a lead enters your funnel',
    icon: 'userPlus',
    popular: true,
    keywords: ['crm', 'contact', 'prospect', 'signup'],
    inputs: NO_IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'source',
        label: 'Lead source',
        type: 'select',
        required: true,
        defaultValue: 'any',
        options: [
          { value: 'any', label: 'Any source' },
          { value: 'website', label: 'Website form' },
          { value: 'api', label: 'API' },
          { value: 'import', label: 'CSV import' },
          { value: 'crm', label: 'CRM sync' },
        ],
      },
      { key: 'dedupe', label: 'Skip duplicate emails', type: 'boolean', defaultValue: true },
      {
        key: 'samplePayload',
        label: 'Sample lead',
        type: 'json',
        rows: 7,
        defaultValue:
          '{\n  "name": "Alex Morgan",\n  "email": "alex@northwind.io",\n  "company": "Northwind",\n  "score": 82,\n  "message": "We need to automate onboarding before Q4."\n}',
        help: 'Used for test runs and to populate the variable picker.',
      },
    ],
    outputs: [
      { key: 'lead.name', type: 'string', description: 'Full name', sample: 'Alex Morgan' },
      { key: 'lead.email', type: 'string', description: 'Email address', sample: 'alex@example.com' },
      { key: 'lead.company', type: 'string', description: 'Company name', sample: 'Northwind' },
      { key: 'lead.score', type: 'number', description: 'Inbound score', sample: 82 },
      { key: 'lead.message', type: 'string', description: 'What they wrote', sample: 'We need to automate…' },
      { key: 'lead.source', type: 'string', description: 'Acquisition source', sample: 'website' },
    ],
  },
  {
    type: 'trigger.new_order',
    category: 'trigger',
    label: 'New order',
    description: 'Runs when an order is placed',
    icon: 'shoppingCart',
    keywords: ['ecommerce', 'purchase', 'checkout', 'shop'],
    inputs: NO_IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'store',
        label: 'Store',
        type: 'select',
        required: true,
        defaultValue: 'all',
        options: [
          { value: 'all', label: 'All stores' },
          { value: 'eu', label: 'EU storefront' },
          { value: 'us', label: 'US storefront' },
        ],
      },
      { key: 'minAmount', label: 'Minimum amount', type: 'number', defaultValue: 0, min: 0 },
    ],
    outputs: [
      { key: 'order.id', type: 'string', description: 'Order id', sample: 'ord_8812' },
      { key: 'order.total', type: 'number', description: 'Order total', sample: 249 },
      { key: 'order.currency', type: 'string', description: 'Currency', sample: 'USD' },
      { key: 'order.email', type: 'string', description: 'Customer email', sample: 'sam@example.com' },
    ],
  },
  {
    type: 'trigger.form_submitted',
    category: 'trigger',
    label: 'Form submitted',
    description: 'Runs when a form is completed',
    icon: 'clipboard',
    keywords: ['typeform', 'survey', 'input'],
    inputs: NO_IN,
    outputHandles: OUT,
    fields: [
      { key: 'formId', label: 'Form', type: 'text', required: true, placeholder: 'contact-us' },
      { key: 'includeMeta', label: 'Include metadata', type: 'boolean', defaultValue: true },
    ],
    outputs: [
      { key: 'form.id', type: 'string', description: 'Form identifier', sample: 'contact-us' },
      { key: 'form.fields', type: 'object', description: 'Submitted answers', sample: '{…}' },
      { key: 'form.email', type: 'string', description: 'Respondent email', sample: 'jordan@example.com' },
    ],
  },
  {
    type: 'trigger.email_received',
    category: 'trigger',
    label: 'Email received',
    description: 'Runs when a mailbox receives a message',
    icon: 'inbox',
    keywords: ['gmail', 'imap', 'inbox', 'mail'],
    inputs: NO_IN,
    outputHandles: OUT,
    fields: [
      { key: 'mailbox', label: 'Mailbox', type: 'text', required: true, placeholder: 'support@acme.co' },
      { key: 'subjectContains', label: 'Subject contains', type: 'text', placeholder: 'Optional filter' },
      { key: 'attachmentsOnly', label: 'Only with attachments', type: 'boolean', defaultValue: false },
    ],
    outputs: [
      { key: 'email.from', type: 'string', description: 'Sender', sample: 'casey@example.com' },
      { key: 'email.subject', type: 'string', description: 'Subject line', sample: 'Invoice #2214' },
      { key: 'email.body', type: 'string', description: 'Plain-text body', sample: 'Hi team…' },
      { key: 'email.attachments', type: 'array', description: 'Attachment list', sample: '[…]' },
    ],
  },
  {
    type: 'trigger.payment_received',
    category: 'trigger',
    label: 'Payment received',
    description: 'Runs when a payment settles',
    icon: 'creditCard',
    keywords: ['stripe', 'invoice', 'billing', 'charge'],
    inputs: NO_IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'provider',
        label: 'Provider',
        type: 'select',
        required: true,
        defaultValue: 'stripe',
        options: [
          { value: 'stripe', label: 'Stripe' },
          { value: 'paddle', label: 'Paddle' },
          { value: 'manual', label: 'Manual entry' },
        ],
      },
      { key: 'minAmount', label: 'Minimum amount', type: 'number', defaultValue: 0, min: 0 },
    ],
    outputs: [
      { key: 'payment.id', type: 'string', description: 'Payment id', sample: 'pi_3Nx9' },
      { key: 'payment.amount', type: 'number', description: 'Amount', sample: 1490 },
      { key: 'payment.customerEmail', type: 'string', description: 'Payer email', sample: 'finance@northwind.io' },
    ],
  },
  {
    type: 'trigger.manual',
    category: 'trigger',
    label: 'Manual trigger',
    description: 'Runs only when someone presses Run',
    icon: 'mouse',
    keywords: ['button', 'run', 'test'],
    inputs: NO_IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'note',
        label: 'Instructions',
        type: 'textarea',
        rows: 3,
        placeholder: 'Shown to whoever runs this workflow',
      },
    ],
    outputs: [
      { key: 'startedBy', type: 'string', description: 'User who started the run', sample: 'Maya Chen' },
    ],
  },
]

const ACTIONS: NodeDefinition[] = [
  {
    type: 'action.send_email',
    category: 'action',
    label: 'Send email',
    description: 'Deliver a templated email',
    icon: 'mail',
    popular: true,
    keywords: ['mail', 'notify', 'message', 'follow-up'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0004,
    fields: [
      { key: 'to', label: 'Recipient', type: 'text', required: true, variables: true, placeholder: '{{lead.email}}' },
      { key: 'from', label: 'From', type: 'text', defaultValue: 'no-reply@acme.co' },
      { key: 'subject', label: 'Subject', type: 'text', required: true, variables: true, placeholder: 'Great to meet you, {{lead.name}}' },
      { key: 'body', label: 'Body', type: 'textarea', required: true, variables: true, rows: 7, placeholder: 'Hi {{lead.name}}, …' },
      { key: 'replyTo', label: 'Reply-to', type: 'text', variables: true },
    ],
    outputs: [
      { key: 'messageId', type: 'string', description: 'Provider message id', sample: 'msg_a91f22' },
      { key: 'accepted', type: 'boolean', description: 'Accepted by the relay', sample: true },
    ],
  },
  {
    type: 'action.create_task',
    category: 'action',
    label: 'Create task',
    description: 'Add a task for the team',
    icon: 'listChecks',
    popular: true,
    keywords: ['todo', 'assign', 'follow up', 'ticket'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0002,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, variables: true, placeholder: 'Follow up with {{lead.name}}' },
      {
        key: 'assignee',
        label: 'Assignee',
        type: 'select',
        defaultValue: 'round_robin',
        options: [
          { value: 'round_robin', label: 'Round robin' },
          { value: 'owner', label: 'Record owner' },
          { value: 'me', label: 'Me' },
        ],
      },
      { key: 'dueInDays', label: 'Due in (days)', type: 'number', defaultValue: 2, min: 0, max: 90 },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        defaultValue: 'normal',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'normal', label: 'Normal' },
          { value: 'high', label: 'High' },
          { value: 'urgent', label: 'Urgent' },
        ],
      },
      { key: 'notes', label: 'Notes', type: 'textarea', rows: 4, variables: true },
    ],
    outputs: [
      { key: 'taskId', type: 'string', description: 'Created task id', sample: 'tsk_4471' },
      { key: 'dueAt', type: 'string', description: 'Computed due date', sample: '2026-08-19T09:00:00Z' },
    ],
  },
  {
    type: 'action.update_record',
    category: 'action',
    label: 'Update record',
    description: 'Patch fields on an existing record',
    icon: 'penLine',
    keywords: ['patch', 'edit', 'crm', 'database'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0002,
    fields: [
      {
        key: 'object',
        label: 'Object',
        type: 'select',
        required: true,
        defaultValue: 'contact',
        options: [
          { value: 'contact', label: 'Contact' },
          { value: 'company', label: 'Company' },
          { value: 'deal', label: 'Deal' },
          { value: 'ticket', label: 'Ticket' },
        ],
      },
      { key: 'recordId', label: 'Record id', type: 'text', required: true, variables: true, placeholder: '{{lead.id}}' },
      { key: 'fields', label: 'Fields', type: 'keyvalue', variables: true, help: 'Values support variables.' },
    ],
    outputs: [
      { key: 'recordId', type: 'string', description: 'Updated record id', sample: 'con_7781' },
      { key: 'updatedFields', type: 'array', description: 'Field names written', sample: '["score"]' },
    ],
  },
  {
    type: 'action.create_deal',
    category: 'action',
    label: 'Create deal',
    description: 'Open a deal in your pipeline',
    icon: 'handshake',
    popular: true,
    keywords: ['crm', 'opportunity', 'pipeline', 'sales'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0003,
    fields: [
      { key: 'name', label: 'Deal name', type: 'text', required: true, variables: true, placeholder: '{{lead.company}} — inbound' },
      {
        key: 'pipeline',
        label: 'Pipeline',
        type: 'select',
        required: true,
        defaultValue: 'inbound',
        options: [
          { value: 'inbound', label: 'Inbound' },
          { value: 'outbound', label: 'Outbound' },
          { value: 'expansion', label: 'Expansion' },
        ],
      },
      {
        key: 'stage',
        label: 'Stage',
        type: 'select',
        defaultValue: 'qualified',
        options: [
          { value: 'new', label: 'New' },
          { value: 'qualified', label: 'Qualified' },
          { value: 'demo', label: 'Demo booked' },
        ],
      },
      { key: 'amount', label: 'Amount', type: 'text', variables: true, placeholder: '{{lead.estimatedValue}}' },
      { key: 'ownerEmail', label: 'Owner', type: 'text', variables: true, placeholder: 'sales@acme.co' },
    ],
    outputs: [
      { key: 'dealId', type: 'string', description: 'Created deal id', sample: 'deal_2291' },
      { key: 'stage', type: 'string', description: 'Resulting stage', sample: 'qualified' },
      { key: 'url', type: 'string', description: 'CRM deep link', sample: 'https://crm.acme.co/deals/2291' },
    ],
  },
  {
    type: 'action.send_notification',
    category: 'action',
    label: 'Send notification',
    description: 'Ping a channel or a person',
    icon: 'bell',
    keywords: ['alert', 'push', 'notify', 'ping'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0001,
    fields: [
      {
        key: 'channel',
        label: 'Channel',
        type: 'select',
        required: true,
        defaultValue: 'slack',
        options: [
          { value: 'slack', label: 'Slack' },
          { value: 'telegram', label: 'Telegram' },
          { value: 'email', label: 'Email' },
          { value: 'push', label: 'Mobile push' },
        ],
      },
      { key: 'target', label: 'Destination', type: 'text', required: true, variables: true, placeholder: '#sales' },
      { key: 'message', label: 'Message', type: 'textarea', required: true, variables: true, rows: 4 },
    ],
    outputs: [
      { key: 'delivered', type: 'boolean', description: 'Delivery acknowledged', sample: true },
      { key: 'channel', type: 'string', description: 'Resolved channel', sample: '#sales' },
    ],
  },
  {
    type: 'action.http_request',
    category: 'action',
    label: 'HTTP request',
    description: 'Call any REST endpoint',
    icon: 'globe',
    popular: true,
    keywords: ['api', 'rest', 'fetch', 'curl', 'request'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0001,
    fields: [
      { key: 'url', label: 'URL', type: 'text', required: true, variables: true, placeholder: 'https://api.example.com/v1/leads' },
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        required: true,
        defaultValue: 'POST',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ value: m, label: m })),
      },
      { key: 'headers', label: 'Headers', type: 'keyvalue', variables: true },
      { key: 'body', label: 'Body', type: 'json', rows: 6, variables: true },
      { key: 'timeoutMs', label: 'Timeout (ms)', type: 'number', defaultValue: 10000, min: 1000, max: 60000, step: 500 },
    ],
    outputs: [
      { key: 'status', type: 'number', description: 'HTTP status code', sample: 200 },
      { key: 'body', type: 'object', description: 'Response body', sample: '{…}' },
      { key: 'durationMs', type: 'number', description: 'Round-trip time', sample: 184 },
    ],
  },
  {
    type: 'action.wait',
    category: 'action',
    label: 'Wait',
    description: 'Pause before continuing',
    icon: 'timer',
    keywords: ['delay', 'sleep', 'pause', 'throttle'],
    inputs: IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        required: true,
        defaultValue: 'duration',
        options: [
          { value: 'duration', label: 'For a duration' },
          { value: 'until', label: 'Until a timestamp' },
        ],
      },
      { key: 'amount', label: 'Amount', type: 'number', defaultValue: 15, min: 1, showIf: { key: 'mode', equals: 'duration' } },
      {
        key: 'unit',
        label: 'Unit',
        type: 'select',
        defaultValue: 'minutes',
        options: [
          { value: 'seconds', label: 'Seconds' },
          { value: 'minutes', label: 'Minutes' },
          { value: 'hours', label: 'Hours' },
          { value: 'days', label: 'Days' },
        ],
        showIf: { key: 'mode', equals: 'duration' },
      },
      { key: 'until', label: 'Resume at', type: 'text', variables: true, placeholder: '{{order.shipAt}}', showIf: { key: 'mode', equals: 'until' } },
    ],
    outputs: [
      { key: 'resumedAt', type: 'string', description: 'Resume timestamp', sample: '2026-08-17T09:27:00Z' },
    ],
  },
  {
    type: 'action.transform',
    category: 'action',
    label: 'Transform data',
    description: 'Reshape the payload before the next step',
    icon: 'shuffle',
    keywords: ['map', 'rename', 'reshape', 'json'],
    inputs: IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'mode',
        label: 'Mode',
        type: 'select',
        required: true,
        defaultValue: 'map',
        options: [
          { value: 'map', label: 'Map fields' },
          { value: 'pick', label: 'Pick fields' },
          { value: 'flatten', label: 'Flatten' },
        ],
      },
      { key: 'mapping', label: 'Mapping', type: 'keyvalue', required: true, variables: true },
    ],
    outputs: [
      { key: 'result', type: 'object', description: 'Transformed payload', sample: '{…}' },
      { key: 'keys', type: 'array', description: 'Output keys', sample: '["email"]' },
    ],
  },
]

const CONDITIONS: NodeDefinition[] = [
  {
    type: 'condition.if',
    category: 'condition',
    label: 'If / Else',
    description: 'Split the run into two paths',
    icon: 'gitBranch',
    popular: true,
    keywords: ['branch', 'condition', 'logic', 'compare'],
    inputs: IN,
    outputHandles: [
      { id: 'yes', label: 'YES', tone: 'positive' },
      { id: 'no', label: 'NO', tone: 'negative' },
    ],
    fields: [
      { key: 'left', label: 'Value', type: 'text', required: true, variables: true, placeholder: '{{lead.score}}' },
      { key: 'operator', label: 'Operator', type: 'operator', required: true, defaultValue: 'gt', options: OPERATORS },
      {
        key: 'right',
        label: 'Compare to',
        type: 'text',
        variables: true,
        placeholder: '70',
        showIf: { key: 'operator', equals: ['equals', 'not_equals', 'contains', 'not_contains', 'gt', 'lt', 'gte', 'lte'] },
      },
    ],
    outputs: [
      { key: 'result', type: 'boolean', description: 'Evaluation result', sample: true },
      { key: 'branch', type: 'string', description: 'Branch taken', sample: 'yes' },
    ],
  },
  {
    type: 'condition.filter',
    category: 'condition',
    label: 'Filter',
    description: 'Stop the run unless the check passes',
    icon: 'filter',
    keywords: ['gate', 'guard', 'skip', 'only if'],
    inputs: IN,
    outputHandles: [
      { id: 'pass', label: 'PASS', tone: 'positive' },
      { id: 'drop', label: 'DROP', tone: 'negative' },
    ],
    fields: [
      { key: 'left', label: 'Field', type: 'text', required: true, variables: true, placeholder: '{{lead.source}}' },
      { key: 'operator', label: 'Operator', type: 'operator', required: true, defaultValue: 'equals', options: OPERATORS },
      { key: 'right', label: 'Value', type: 'text', variables: true, showIf: { key: 'operator', equals: ['equals', 'not_equals', 'contains', 'not_contains', 'gt', 'lt', 'gte', 'lte'] } },
    ],
    outputs: [
      { key: 'passed', type: 'boolean', description: 'Whether the item passed', sample: true },
    ],
  },
  {
    type: 'condition.switch',
    category: 'condition',
    label: 'Switch',
    description: 'Route to one of several paths',
    icon: 'split',
    keywords: ['route', 'case', 'match', 'multi'],
    inputs: IN,
    outputHandles: [
      { id: 'case_1', label: 'A' },
      { id: 'case_2', label: 'B' },
      { id: 'case_3', label: 'C' },
      { id: 'default', label: 'ELSE', tone: 'negative' },
    ],
    fields: [
      { key: 'field', label: 'Field', type: 'text', required: true, variables: true, placeholder: '{{ticket.category}}' },
      { key: 'case_1', label: 'Path A matches', type: 'text', required: true, placeholder: 'billing' },
      { key: 'case_2', label: 'Path B matches', type: 'text', placeholder: 'technical' },
      { key: 'case_3', label: 'Path C matches', type: 'text', placeholder: 'sales' },
    ],
    outputs: [
      { key: 'matched', type: 'string', description: 'Matched case', sample: 'billing' },
      { key: 'branch', type: 'string', description: 'Handle taken', sample: 'case_1' },
    ],
  },
]

const AI: NodeDefinition[] = [
  {
    type: 'ai.analyze',
    category: 'ai',
    label: 'AI Analyze',
    description: 'Score and interpret an input',
    icon: 'brain',
    popular: true,
    keywords: ['score', 'intent', 'qualify', 'llm', 'lead'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0042,
    fields: [
      { key: 'model', label: 'Model', type: 'select', required: true, defaultValue: 'flow-reason-1', options: AI_MODELS },
      { key: 'input', label: 'Input', type: 'textarea', required: true, variables: true, rows: 5, placeholder: '{{lead.name}} from {{lead.company}} — {{lead.message}}' },
      { key: 'criteria', label: 'What to look for', type: 'textarea', rows: 4, placeholder: 'Budget signals, company size, urgency…' },
      TEMPERATURE,
      {
        key: 'outputFormat',
        label: 'Output format',
        type: 'select',
        defaultValue: 'json',
        options: [
          { value: 'json', label: 'Structured JSON' },
          { value: 'text', label: 'Plain text' },
        ],
      },
    ],
    outputs: [
      { key: 'score', type: 'number', description: 'Confidence score 0–100', sample: 82 },
      { key: 'intent', type: 'string', description: 'Detected intent', sample: 'high' },
      { key: 'category', type: 'string', description: 'Segment', sample: 'enterprise' },
      { key: 'reasoning', type: 'string', description: 'Short rationale', sample: 'Mentions a Q4 budget…' },
    ],
  },
  {
    type: 'ai.classify',
    category: 'ai',
    label: 'AI Classify',
    description: 'Assign an input to one of your labels',
    icon: 'tags',
    popular: true,
    keywords: ['label', 'category', 'triage', 'route'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0021,
    fields: [
      { key: 'model', label: 'Model', type: 'select', required: true, defaultValue: 'flow-reason-1-mini', options: AI_MODELS },
      { key: 'input', label: 'Input', type: 'textarea', required: true, variables: true, rows: 4 },
      { key: 'categories', label: 'Categories', type: 'text', required: true, placeholder: 'billing, technical, sales', help: 'Comma separated.' },
      { key: 'multiLabel', label: 'Allow multiple labels', type: 'boolean', defaultValue: false },
    ],
    outputs: [
      { key: 'label', type: 'string', description: 'Winning label', sample: 'billing' },
      { key: 'confidence', type: 'number', description: 'Model confidence', sample: 0.94 },
    ],
  },
  {
    type: 'ai.summarize',
    category: 'ai',
    label: 'AI Summarize',
    description: 'Condense long content',
    icon: 'fileText',
    keywords: ['tldr', 'digest', 'recap', 'shorten'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0033,
    fields: [
      { key: 'model', label: 'Model', type: 'select', required: true, defaultValue: 'flow-reason-1', options: AI_MODELS },
      { key: 'input', label: 'Input', type: 'textarea', required: true, variables: true, rows: 5 },
      {
        key: 'length',
        label: 'Length',
        type: 'select',
        defaultValue: 'short',
        options: [
          { value: 'oneline', label: 'One line' },
          { value: 'short', label: 'Short paragraph' },
          { value: 'bullets', label: 'Bullet points' },
        ],
      },
      {
        key: 'tone',
        label: 'Tone',
        type: 'select',
        defaultValue: 'neutral',
        options: [
          { value: 'neutral', label: 'Neutral' },
          { value: 'executive', label: 'Executive' },
          { value: 'friendly', label: 'Friendly' },
        ],
      },
    ],
    outputs: [
      { key: 'summary', type: 'string', description: 'Generated summary', sample: '3 deals moved to demo…' },
      { key: 'tokens', type: 'number', description: 'Tokens consumed', sample: 512 },
    ],
  },
  {
    type: 'ai.extract',
    category: 'ai',
    label: 'AI Extract',
    description: 'Pull structured fields out of raw text',
    icon: 'scan',
    popular: true,
    keywords: ['parse', 'ocr', 'invoice', 'structured', 'fields'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0038,
    fields: [
      { key: 'model', label: 'Model', type: 'select', required: true, defaultValue: 'flow-reason-1', options: AI_MODELS },
      { key: 'input', label: 'Source', type: 'textarea', required: true, variables: true, rows: 4, placeholder: '{{email.body}}' },
      {
        key: 'schema',
        label: 'Fields to extract',
        type: 'json',
        required: true,
        rows: 6,
        defaultValue: '{\n  "invoiceNumber": "string",\n  "amount": "number",\n  "dueDate": "date"\n}',
      },
    ],
    outputs: [
      { key: 'data', type: 'object', description: 'Extracted object', sample: '{…}' },
      { key: 'confidence', type: 'number', description: 'Extraction confidence', sample: 0.91 },
    ],
  },
  {
    type: 'ai.generate',
    category: 'ai',
    label: 'AI Generate',
    description: 'Write copy from a prompt',
    icon: 'sparkles',
    keywords: ['write', 'draft', 'copy', 'prompt', 'compose'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0051,
    fields: [
      { key: 'model', label: 'Model', type: 'select', required: true, defaultValue: 'flow-reason-1', options: AI_MODELS },
      { key: 'prompt', label: 'Prompt', type: 'textarea', required: true, variables: true, rows: 7, placeholder: 'Write a follow-up email to {{lead.name}}…' },
      TEMPERATURE,
      { key: 'maxTokens', label: 'Max tokens', type: 'number', defaultValue: 800, min: 64, max: 4000, step: 64 },
      {
        key: 'format',
        label: 'Format',
        type: 'select',
        defaultValue: 'markdown',
        options: [
          { value: 'markdown', label: 'Markdown' },
          { value: 'plain', label: 'Plain text' },
          { value: 'html', label: 'HTML' },
        ],
      },
    ],
    outputs: [
      { key: 'text', type: 'string', description: 'Generated content', sample: 'Hi Alex, thanks for…' },
      { key: 'tokens', type: 'number', description: 'Tokens consumed', sample: 640 },
    ],
  },
]

const INTEGRATIONS: NodeDefinition[] = [
  {
    type: 'integration.slack',
    category: 'integration',
    label: 'Slack',
    description: 'Post a message to a channel',
    icon: 'messageSquare',
    integration: 'slack',
    popular: true,
    keywords: ['chat', 'channel', 'notify', 'team'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0002,
    fields: [
      { key: 'channel', label: 'Channel', type: 'text', required: true, variables: true, placeholder: '#sales' },
      { key: 'message', label: 'Message', type: 'textarea', required: true, variables: true, rows: 5 },
      { key: 'threadTs', label: 'Reply in thread', type: 'text', variables: true, placeholder: 'Optional thread id' },
      { key: 'broadcast', label: 'Also send to channel', type: 'boolean', defaultValue: false },
    ],
    outputs: [
      { key: 'ts', type: 'string', description: 'Message timestamp', sample: '1755419234.001' },
      { key: 'permalink', type: 'string', description: 'Message link', sample: 'https://acme.slack.com/…' },
    ],
  },
  {
    type: 'integration.telegram',
    category: 'integration',
    label: 'Telegram',
    description: 'Send a message through a bot',
    icon: 'send',
    integration: 'telegram',
    popular: true,
    keywords: ['bot', 'chat', 'notify'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0001,
    fields: [
      { key: 'chatId', label: 'Chat', type: 'text', required: true, variables: true, placeholder: '-1001234567890' },
      { key: 'message', label: 'Message', type: 'textarea', required: true, variables: true, rows: 5 },
      {
        key: 'parseMode',
        label: 'Formatting',
        type: 'select',
        defaultValue: 'markdown',
        options: [
          { value: 'markdown', label: 'Markdown' },
          { value: 'html', label: 'HTML' },
          { value: 'none', label: 'None' },
        ],
      },
      { key: 'silent', label: 'Silent notification', type: 'boolean', defaultValue: false },
    ],
    outputs: [
      { key: 'messageId', type: 'number', description: 'Telegram message id', sample: 88213 },
    ],
  },
  {
    type: 'integration.discord',
    category: 'integration',
    label: 'Discord',
    description: 'Post through a channel webhook',
    icon: 'hash',
    integration: 'discord',
    keywords: ['chat', 'community', 'webhook'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0001,
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: true, placeholder: 'https://discord.com/api/webhooks/…' },
      { key: 'username', label: 'Display name', type: 'text', defaultValue: 'FLOW' },
      { key: 'message', label: 'Message', type: 'textarea', required: true, variables: true, rows: 5 },
    ],
    outputs: [{ key: 'delivered', type: 'boolean', description: 'Webhook accepted', sample: true }],
  },
  {
    type: 'integration.gmail',
    category: 'integration',
    label: 'Gmail',
    description: 'Send mail from a connected mailbox',
    icon: 'mail',
    integration: 'gmail',
    keywords: ['email', 'google', 'inbox'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0003,
    fields: [
      { key: 'to', label: 'To', type: 'text', required: true, variables: true },
      { key: 'subject', label: 'Subject', type: 'text', required: true, variables: true },
      { key: 'body', label: 'Body', type: 'textarea', required: true, variables: true, rows: 6 },
      { key: 'labels', label: 'Apply labels', type: 'text', placeholder: 'automation, outbound' },
    ],
    outputs: [
      { key: 'messageId', type: 'string', description: 'Gmail message id', sample: '18f2a91c4b' },
      { key: 'threadId', type: 'string', description: 'Thread id', sample: '18f2a91c4b' },
    ],
  },
  {
    type: 'integration.sheets',
    category: 'integration',
    label: 'Google Sheets',
    description: 'Read or append spreadsheet rows',
    icon: 'sheet',
    integration: 'sheets',
    popular: true,
    keywords: ['spreadsheet', 'row', 'google', 'log'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0002,
    fields: [
      { key: 'spreadsheetId', label: 'Spreadsheet', type: 'text', required: true, placeholder: '1BxiMVs0…' },
      { key: 'sheet', label: 'Sheet name', type: 'text', defaultValue: 'Sheet1' },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        required: true,
        defaultValue: 'append',
        options: [
          { value: 'append', label: 'Append row' },
          { value: 'update', label: 'Update row' },
          { value: 'read', label: 'Read rows' },
        ],
      },
      { key: 'values', label: 'Row values', type: 'keyvalue', variables: true, showIf: { key: 'operation', equals: ['append', 'update'] } },
    ],
    outputs: [
      { key: 'range', type: 'string', description: 'Affected range', sample: 'Sheet1!A24:E24' },
      { key: 'rows', type: 'number', description: 'Rows touched', sample: 1 },
    ],
  },
  {
    type: 'integration.notion',
    category: 'integration',
    label: 'Notion',
    description: 'Create or update database pages',
    icon: 'notebook',
    integration: 'notion',
    keywords: ['docs', 'database', 'page', 'wiki'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0002,
    fields: [
      { key: 'databaseId', label: 'Database', type: 'text', required: true, placeholder: 'a3f1…' },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        required: true,
        defaultValue: 'create',
        options: [
          { value: 'create', label: 'Create page' },
          { value: 'update', label: 'Update page' },
        ],
      },
      { key: 'properties', label: 'Properties', type: 'keyvalue', required: true, variables: true },
    ],
    outputs: [
      { key: 'pageId', type: 'string', description: 'Notion page id', sample: 'p_9f21' },
      { key: 'url', type: 'string', description: 'Page URL', sample: 'https://notion.so/p_9f21' },
    ],
  },
  {
    type: 'integration.hubspot',
    category: 'integration',
    label: 'HubSpot',
    description: 'Sync contacts, companies and deals',
    icon: 'building',
    integration: 'hubspot',
    keywords: ['crm', 'contact', 'deal', 'sales'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0004,
    fields: [
      {
        key: 'object',
        label: 'Object',
        type: 'select',
        required: true,
        defaultValue: 'contact',
        options: [
          { value: 'contact', label: 'Contact' },
          { value: 'company', label: 'Company' },
          { value: 'deal', label: 'Deal' },
        ],
      },
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        required: true,
        defaultValue: 'upsert',
        options: [
          { value: 'create', label: 'Create' },
          { value: 'upsert', label: 'Create or update' },
          { value: 'update', label: 'Update' },
        ],
      },
      { key: 'properties', label: 'Properties', type: 'keyvalue', required: true, variables: true },
    ],
    outputs: [
      { key: 'objectId', type: 'string', description: 'HubSpot object id', sample: '3011' },
      { key: 'created', type: 'boolean', description: 'Newly created', sample: true },
    ],
  },
  {
    type: 'integration.stripe',
    category: 'integration',
    label: 'Stripe',
    description: 'Customers, invoices and refunds',
    icon: 'creditCard',
    integration: 'stripe',
    keywords: ['payment', 'billing', 'invoice', 'charge'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0005,
    fields: [
      {
        key: 'operation',
        label: 'Operation',
        type: 'select',
        required: true,
        defaultValue: 'create_invoice',
        options: [
          { value: 'create_customer', label: 'Create customer' },
          { value: 'create_invoice', label: 'Create invoice' },
          { value: 'refund', label: 'Refund payment' },
        ],
      },
      { key: 'customerEmail', label: 'Customer email', type: 'text', required: true, variables: true },
      { key: 'amount', label: 'Amount', type: 'text', variables: true, placeholder: '{{order.total}}', showIf: { key: 'operation', equals: ['create_invoice', 'refund'] } },
      {
        key: 'currency',
        label: 'Currency',
        type: 'select',
        defaultValue: 'usd',
        options: [
          { value: 'usd', label: 'USD' },
          { value: 'eur', label: 'EUR' },
          { value: 'gbp', label: 'GBP' },
        ],
      },
    ],
    outputs: [
      { key: 'objectId', type: 'string', description: 'Stripe object id', sample: 'in_1P2x' },
      { key: 'status', type: 'string', description: 'Object status', sample: 'open' },
    ],
  },
  {
    type: 'integration.openai',
    category: 'integration',
    label: 'OpenAI',
    description: 'Call a model with your own key',
    icon: 'bot',
    integration: 'openai',
    keywords: ['llm', 'gpt', 'completion', 'ai'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.006,
    fields: [
      {
        key: 'model',
        label: 'Model',
        type: 'select',
        required: true,
        defaultValue: 'gpt-4o-mini',
        options: [
          { value: 'gpt-4o', label: 'gpt-4o' },
          { value: 'gpt-4o-mini', label: 'gpt-4o-mini' },
          { value: 'o3-mini', label: 'o3-mini' },
        ],
      },
      { key: 'prompt', label: 'Prompt', type: 'textarea', required: true, variables: true, rows: 6 },
      TEMPERATURE,
      { key: 'maxTokens', label: 'Max tokens', type: 'number', defaultValue: 1024, min: 64, max: 8000, step: 64 },
    ],
    outputs: [
      { key: 'text', type: 'string', description: 'Completion text', sample: 'Sure — here is…' },
      { key: 'tokens', type: 'number', description: 'Total tokens', sample: 1180 },
    ],
  },
  {
    type: 'integration.webhook',
    category: 'integration',
    label: 'Outgoing webhook',
    description: 'POST the payload to an external URL',
    icon: 'webhook',
    integration: 'webhook',
    keywords: ['http', 'post', 'callback', 'external'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0001,
    fields: [
      { key: 'url', label: 'URL', type: 'text', required: true, variables: true },
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        defaultValue: 'POST',
        options: ['POST', 'PUT', 'PATCH'].map((m) => ({ value: m, label: m })),
      },
      { key: 'headers', label: 'Headers', type: 'keyvalue', variables: true },
      { key: 'body', label: 'Payload', type: 'json', rows: 6, variables: true },
    ],
    outputs: [
      { key: 'status', type: 'number', description: 'HTTP status', sample: 202 },
    ],
  },
]

const UTILITIES: NodeDefinition[] = [
  {
    type: 'utility.set_variable',
    category: 'utility',
    label: 'Set variable',
    description: 'Store a value for later steps',
    icon: 'variable',
    keywords: ['assign', 'store', 'const', 'let'],
    inputs: IN,
    outputHandles: OUT,
    fields: [
      { key: 'name', label: 'Variable name', type: 'text', required: true, placeholder: 'priorityTier' },
      { key: 'value', label: 'Value', type: 'text', required: true, variables: true },
      {
        key: 'scope',
        label: 'Scope',
        type: 'select',
        defaultValue: 'run',
        options: [
          { value: 'run', label: 'This run' },
          { value: 'workflow', label: 'Workflow' },
        ],
      },
    ],
    outputs: [{ key: 'value', type: 'string', description: 'Stored value', sample: 'tier-1' }],
  },
  {
    type: 'utility.merge',
    category: 'utility',
    label: 'Merge branches',
    description: 'Join two paths back together',
    icon: 'merge',
    keywords: ['join', 'combine', 'union'],
    inputs: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    outputHandles: OUT,
    fields: [
      {
        key: 'strategy',
        label: 'Strategy',
        type: 'select',
        required: true,
        defaultValue: 'shallow',
        options: [
          { value: 'shallow', label: 'Shallow merge' },
          { value: 'deep', label: 'Deep merge' },
          { value: 'first', label: 'First to arrive' },
        ],
      },
      { key: 'waitForAll', label: 'Wait for every branch', type: 'boolean', defaultValue: true },
    ],
    outputs: [{ key: 'merged', type: 'object', description: 'Combined payload', sample: '{…}' }],
  },
  {
    type: 'utility.log',
    category: 'utility',
    label: 'Log',
    description: 'Write a line to the execution log',
    icon: 'scroll',
    keywords: ['debug', 'print', 'console', 'trace'],
    inputs: IN,
    outputHandles: OUT,
    fields: [
      {
        key: 'level',
        label: 'Level',
        type: 'select',
        defaultValue: 'info',
        options: [
          { value: 'info', label: 'Info' },
          { value: 'warn', label: 'Warning' },
          { value: 'error', label: 'Error' },
        ],
      },
      { key: 'message', label: 'Message', type: 'textarea', required: true, variables: true, rows: 3 },
    ],
    outputs: [{ key: 'logged', type: 'boolean', description: 'Written to the log', sample: true }],
  },
  {
    type: 'utility.code',
    category: 'utility',
    label: 'Run code',
    description: 'Escape hatch for custom logic',
    icon: 'code',
    keywords: ['javascript', 'script', 'custom', 'function'],
    inputs: IN,
    outputHandles: OUT,
    unitCost: 0.0002,
    fields: [
      {
        key: 'language',
        label: 'Language',
        type: 'select',
        defaultValue: 'javascript',
        options: [
          { value: 'javascript', label: 'JavaScript' },
          { value: 'python', label: 'Python' },
        ],
      },
      {
        key: 'code',
        label: 'Code',
        type: 'code',
        required: true,
        rows: 10,
        defaultValue: 'return {\n  tier: input.score > 70 ? "hot" : "warm",\n}',
      },
    ],
    outputs: [{ key: 'result', type: 'object', description: 'Returned value', sample: '{…}' }],
  },
]

export const NODE_DEFINITIONS: NodeDefinition[] = [
  ...TRIGGERS,
  ...ACTIONS,
  ...CONDITIONS,
  ...AI,
  ...INTEGRATIONS,
  ...UTILITIES,
]

const BY_TYPE = new Map<NodeType, NodeDefinition>(
  NODE_DEFINITIONS.map((d) => [d.type, d]),
)

/** Placeholder used when a workflow references a node kind we no longer ship. */
const UNKNOWN: NodeDefinition = {
  type: 'utility.log',
  category: 'utility',
  label: 'Unknown node',
  description: 'This node type is not available in this workspace',
  icon: 'braces',
  inputs: IN,
  outputHandles: OUT,
  fields: [],
  outputs: [],
}

export function getNodeDefinition(type: NodeType | string): NodeDefinition {
  return BY_TYPE.get(type as NodeType) ?? UNKNOWN
}

export function isCanvasPrimitive(type: NodeType | string) {
  return type === 'canvas.note' || type === 'canvas.group'
}

export function isTrigger(type: NodeType | string) {
  return typeof type === 'string' && type.startsWith('trigger.')
}

export function isCondition(type: NodeType | string) {
  return typeof type === 'string' && type.startsWith('condition.')
}

/** Default config derived from each field's `defaultValue`. */
export function defaultConfigFor(type: NodeType | string): Record<string, unknown> {
  const def = getNodeDefinition(type)
  const config: Record<string, unknown> = {}
  for (const field of def.fields) {
    if (field.defaultValue !== undefined) config[field.key] = field.defaultValue
  }
  return config
}

export function searchNodeDefinitions(query: string, category?: NodeCategory) {
  const q = query.trim().toLowerCase()
  return NODE_DEFINITIONS.filter((def) => {
    if (category && def.category !== category) return false
    if (!q) return true
    return (
      def.label.toLowerCase().includes(q) ||
      def.description.toLowerCase().includes(q) ||
      def.category.includes(q) ||
      (def.keywords ?? []).some((k) => k.includes(q))
    )
  })
}

export { OPERATORS }
