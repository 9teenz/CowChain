import { describe, expect, it } from 'vitest'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'

describe('utils formatting', () => {
  it('merges class names', () => {
    expect(cn('p-2', false && 'hidden', 'text-sm', 'p-4')).toContain('p-4')
  })

  it('formats numbers with en-US locale', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('formats currency with conditional decimals', () => {
    expect(formatCurrency(100)).toBe('$100')
    expect(formatCurrency(100.5)).toBe('$100.50')
  })
})
