import { describe, expect, it } from 'vitest'
import {
  SOL_USD_RATE,
  buildActionLabel,
  calculateNavAfterSale,
  calculateUserDividend,
  listingPremiumPct,
  projectedMarketValue,
  shortenWallet,
  solToUsd,
  usdToSol,
} from '@/lib/solana-contract'

describe('solana-contract helpers', () => {
  it('calculates user dividend proportionally', () => {
    expect(calculateUserDividend(100, 1000, 5000)).toBe(500)
  })

  it('returns zero dividend for invalid inputs', () => {
    expect(calculateUserDividend(0, 1000, 5000)).toBe(0)
    expect(calculateUserDividend(100, 0, 5000)).toBe(0)
    expect(calculateUserDividend(100, 1000, 0)).toBe(0)
  })

  it('applies buffered NAV drop after sale', () => {
    expect(calculateNavAfterSale(1.2, 1000, 1800)).toBe(0.876)
  })

  it('keeps nav floor at 0.25', () => {
    expect(calculateNavAfterSale(0.3, 1000, 10000)).toBe(0.25)
  })

  it('converts usd and sol with consistent rate', () => {
    const sol = usdToSol(310)
    expect(sol).toBe(2)
    expect(solToUsd(sol)).toBe(310)
    expect(SOL_USD_RATE).toBe(155)
  })

  it('shortens long wallet and leaves short intact', () => {
    expect(shortenWallet('ABCDEFGH')).toBe('ABCDEFGH')
    expect(shortenWallet('7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL')).toMatch(/^7GhK\.\.\.[\w]{4}$/)
  })

  it('calculates listing premium and projected value', () => {
    expect(listingPremiumPct(1.2, 1)).toBe(20)
    expect(projectedMarketValue(100, 1.234)).toBe(123.4)
  })

  it('builds action labels by kind', () => {
    expect(buildActionLabel('nav', 'Alpine')).toContain('Alpine')
    expect(buildActionLabel('market', 'Alpine')).toContain('Alpine')
    expect(buildActionLabel('claim')).toContain('Claimed pending dividends')
    expect(buildActionLabel('sale', 'Alpine')).toContain('Alpine')
  })
})
