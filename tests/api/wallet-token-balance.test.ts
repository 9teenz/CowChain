import { beforeEach, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/api/wallet/token-balance/route'

describe('wallet token balance route', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when wallet address is missing', async () => {
    const response = await GET(new Request('http://localhost/api/wallet/token-balance'))

    expect(response.status).toBe(400)
  })

  it('returns parsed CowChain token balance from RPC', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            value: [
              {
                account: {
                  data: {
                    parsed: {
                      info: {
                        tokenAmount: {
                          amount: '1234500',
                          decimals: 6,
                        },
                      },
                    },
                  },
                },
              },
            ],
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
        'http://localhost/api/wallet/token-balance?address=11111111111111111111111111111111&mint=11111111111111111111111111111111&cluster=devnet&symbol=CowChain'
      )
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.amount).toBe(1.2345)
    expect(body.symbol).toBe('CowChain')
  })
})
