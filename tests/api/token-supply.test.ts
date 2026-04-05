import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/token-supply/route'

describe('token supply route', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 for an invalid mint address', async () => {
    const response = await GET(new Request('http://localhost/api/token-supply?mint=bad-mint'))

    expect(response.status).toBe(400)
  })

  it('returns parsed CowChain total supply from RPC', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            value: {
              amount: '1000000000000',
              decimals: 6,
              uiAmount: 1000000,
              uiAmountString: '1000000',
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )

    const response = await GET(
      new Request(
        'http://localhost/api/token-supply?mint=11111111111111111111111111111111&cluster=devnet&symbol=CowChain'
      )
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.amount).toBe(1000000)
    expect(body.symbol).toBe('CowChain')
  })
})
