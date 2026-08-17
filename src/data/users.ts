import { daysAgo, hoursAgo, minutesAgo } from './base'
import type { User, Workspace } from '@/types/workspace'

export const CURRENT_USER_ID = 'u_maya'

export const USERS: User[] = [
  {
    id: 'u_maya',
    name: 'Maya Chen',
    email: 'maya@acmelabs.co',
    role: 'admin',
    title: 'Head of Revenue Ops',
    status: 'active',
    lastActiveAt: minutesAgo(2),
    hue: 88,
  },
  {
    id: 'u_dev',
    name: 'Devin Park',
    email: 'devin@acmelabs.co',
    role: 'admin',
    title: 'Platform Engineer',
    status: 'active',
    lastActiveAt: minutesAgo(18),
    hue: 196,
  },
  {
    id: 'u_ines',
    name: 'Inès Rossi',
    email: 'ines@acmelabs.co',
    role: 'editor',
    title: 'Marketing Automation Lead',
    status: 'active',
    lastActiveAt: hoursAgo(1),
    hue: 322,
  },
  {
    id: 'u_omar',
    name: 'Omar Haddad',
    email: 'omar@acmelabs.co',
    role: 'editor',
    title: 'Sales Engineer',
    status: 'active',
    lastActiveAt: hoursAgo(4),
    hue: 24,
  },
  {
    id: 'u_lena',
    name: 'Lena Fischer',
    email: 'lena@acmelabs.co',
    role: 'editor',
    title: 'Support Operations',
    status: 'active',
    lastActiveAt: hoursAgo(9),
    hue: 268,
  },
  {
    id: 'u_theo',
    name: 'Theo Almeida',
    email: 'theo@acmelabs.co',
    role: 'viewer',
    title: 'Finance Analyst',
    status: 'active',
    lastActiveAt: daysAgo(1),
    hue: 158,
  },
  {
    id: 'u_priya',
    name: 'Priya Nair',
    email: 'priya@acmelabs.co',
    role: 'editor',
    title: 'Lifecycle Marketing',
    status: 'active',
    lastActiveAt: daysAgo(2),
    hue: 12,
  },
  {
    id: 'u_jonas',
    name: 'Jonas Weber',
    email: 'jonas@acmelabs.co',
    role: 'viewer',
    title: 'Data Analyst',
    status: 'active',
    lastActiveAt: daysAgo(3),
    hue: 210,
  },
  {
    id: 'u_sofia',
    name: 'Sofia Marino',
    email: 'sofia@acmelabs.co',
    role: 'editor',
    title: 'Customer Success',
    status: 'invited',
    lastActiveAt: daysAgo(4),
    hue: 340,
  },
  {
    id: 'u_ravi',
    name: 'Ravi Shankar',
    email: 'ravi@acmelabs.co',
    role: 'viewer',
    title: 'Contractor — Integrations',
    status: 'suspended',
    lastActiveAt: daysAgo(21),
    hue: 46,
  },
]

export const USER_BY_ID = Object.fromEntries(USERS.map((u) => [u.id, u])) as Record<
  string,
  User
>

export function getUser(id: string): User {
  return (
    USER_BY_ID[id] ?? {
      id,
      name: 'System',
      email: 'system@flow.app',
      role: 'viewer',
      title: 'Automation',
      status: 'active',
      lastActiveAt: minutesAgo(0),
      hue: 120,
    }
  )
}

export const WORKSPACES: Workspace[] = [
  {
    id: 'ws_acme',
    name: 'Acme Labs',
    slug: 'acme-labs',
    plan: 'business',
    hue: 88,
    createdAt: daysAgo(412),
    memberIds: USERS.map((u) => u.id),
  },
  {
    id: 'ws_marketing',
    name: 'Marketing',
    slug: 'marketing',
    plan: 'team',
    hue: 322,
    createdAt: daysAgo(288),
    memberIds: ['u_maya', 'u_ines', 'u_priya', 'u_jonas'],
  },
  {
    id: 'ws_sales',
    name: 'Sales Automation',
    slug: 'sales-automation',
    plan: 'team',
    hue: 196,
    createdAt: daysAgo(201),
    memberIds: ['u_maya', 'u_omar', 'u_dev', 'u_sofia'],
  },
  {
    id: 'ws_internal',
    name: 'Internal Tools',
    slug: 'internal-tools',
    plan: 'free',
    hue: 24,
    createdAt: daysAgo(96),
    memberIds: ['u_dev', 'u_maya', 'u_theo'],
  },
]
