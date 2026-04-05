import { describe, expect, it } from 'vitest'

import { GET } from '@/app/api/token-metadata/route'

describe('token metadata route', () => {
  it('returns generated metadata from query params', async () => {
    const response = await GET(
      new Request('http://localhost/api/token-metadata?name=MilkChain%20Token&symbol=MILK')
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.name).toBe('MilkChain Token')
    expect(body.symbol).toBe('MILK')
    expect(body.image).toContain('/milk-token.png')
    expect(body.description).toContain('MilkChain Token')
  })
})
