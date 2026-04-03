import { describe, expect, it } from 'vitest'
import { getAvailableTokens, useListingPremium } from '@/components/demo-state-provider'

describe('demo-state-provider helpers', () => {
  it('returns available token amount from position', () => {
    expect(
      getAvailableTokens({
        herdId: 'h-1',
        herdName: 'Herd',
        tokensOwned: 100,
        listedTokens: 30,
        averageCostUsd: 1,
        claimedDividendsUsd: 0,
        pendingDividendsUsd: 0,
      })
    ).toBe(70)
  })

  it('returns zero available tokens without position', () => {
    expect(getAvailableTokens(undefined)).toBe(0)
  })

  it('calculates listing premium relative to nav', () => {
    const premium = useListingPremium(
      {
        id: 'l-1',
        herdId: 'h-1',
        herdName: 'Herd',
        tokensAvailable: 50,
        pricePerTokenUsd: 1.2,
        sellerWallet: 'wallet',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'h-1',
        name: 'Herd',
        tokenSymbol: 'TOK',
        location: 'US',
        description: 'd',
        herdSize: 10,
        herdAgeMonths: 12,
        milkProductionLitersPerDay: 100,
        expectedAnnualRevenueUsd: 1000,
        totalValueUsd: 1000,
        navPerTokenUsd: 1,
        marketPriceUsd: 1,
        totalTokens: 1000,
        availableDirectTokens: 100,
        projectedYieldPct: 10,
        healthStatus: 'Strong',
        totalDividendsDistributedUsd: 100,
      }
    )

    expect(premium).toBe(20)
  })
})
