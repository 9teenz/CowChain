import { describe, expect, it } from 'vitest'

import { POST } from '@/app/api/buy-cowchain/route'

describe('buy CowChain quote route', () => {
  it('returns 400 for an invalid token amount', async () => {
    const response = await POST(
      new Request('http://localhost/api/buy-cowchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ herdId: 'alpine-meadow', tokenAmount: 0 }),
      })
    )

    expect(response.status).toBe(400)
  })

  it('returns a SOL quote for a valid herd NAV purchase', async () => {
    const response = await POST(
      new Request('http://localhost/api/buy-cowchain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          herdId: 'alpine-meadow',
          tokenAmount: 100,
          cluster: 'devnet',
          solUsdRate: 200,
        }),
      })
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.herdId).toBe('alpine-meadow')
    expect(body.tokenAmount).toBe(100)
    expect(body.usdTotal).toBe(110.6)
    expect(body.solTotal).toBe(0.553)
    expect(body.lamports).toBe(553000000)
    expect(body.cluster).toBe('devnet')
    expect(body.slippageBps).toBeGreaterThan(0)
  })
})
