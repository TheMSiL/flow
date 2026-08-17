import { coerce } from '@/lib/variables'

export type OperatorId =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'is_empty'
  | 'is_not_empty'

export const OPERATOR_LABELS: Record<OperatorId, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  gt: 'is greater than',
  lt: 'is less than',
  gte: 'is greater or equal',
  lte: 'is less or equal',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
}

export const OPERATOR_SYMBOLS: Record<OperatorId, string> = {
  equals: '=',
  not_equals: '≠',
  contains: '⊃',
  not_contains: '⊅',
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  is_empty: '∅',
  is_not_empty: '≠∅',
}

/** Operators that do not take a right-hand operand. */
export const UNARY_OPERATORS: OperatorId[] = ['is_empty', 'is_not_empty']

function numeric(a: unknown, b: unknown): [number, number] | null {
  const x = typeof a === 'number' ? a : Number(String(a))
  const y = typeof b === 'number' ? b : Number(String(b))
  if (Number.isNaN(x) || Number.isNaN(y)) return null
  return [x, y]
}

/**
 * Evaluates one comparison. Both operands arrive as resolved template
 * strings, so numeric comparisons coerce first and fall back to string
 * ordering when coercion is impossible.
 */
export function evaluateOperator(
  left: string,
  operator: OperatorId,
  right: string,
): boolean {
  const l = coerce(left)
  const r = coerce(right)

  switch (operator) {
    case 'equals':
      return String(l).toLowerCase() === String(r).toLowerCase()
    case 'not_equals':
      return String(l).toLowerCase() !== String(r).toLowerCase()
    case 'contains':
      return String(l).toLowerCase().includes(String(r).toLowerCase())
    case 'not_contains':
      return !String(l).toLowerCase().includes(String(r).toLowerCase())
    case 'gt': {
      const pair = numeric(l, r)
      return pair ? pair[0] > pair[1] : String(l) > String(r)
    }
    case 'lt': {
      const pair = numeric(l, r)
      return pair ? pair[0] < pair[1] : String(l) < String(r)
    }
    case 'gte': {
      const pair = numeric(l, r)
      return pair ? pair[0] >= pair[1] : String(l) >= String(r)
    }
    case 'lte': {
      const pair = numeric(l, r)
      return pair ? pair[0] <= pair[1] : String(l) <= String(r)
    }
    case 'is_empty':
      return left.trim() === ''
    case 'is_not_empty':
      return left.trim() !== ''
    default:
      return false
  }
}

/** Human-readable rendering used on the condition node body. */
export function describeCondition(
  left: string,
  operator: OperatorId,
  right: string,
) {
  if (UNARY_OPERATORS.includes(operator)) {
    return `${left || 'value'} ${OPERATOR_LABELS[operator]}`
  }
  return `${left || 'value'} ${OPERATOR_SYMBOLS[operator] ?? operator} ${right || '…'}`
}
