import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/wallet/balance/route'

describe('GET /api/wallet/balance', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 400 when address is missing', async () => {
    const request = new Request('http://localhost/api/wallet/balance')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid cluster', async () => {
    const request = new Request('http://localhost/api/wallet/balance?address=7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL&cluster=moon')
    const response = await GET(request)

    expect(response.status).toBe(400)
  })

  it('returns balance for explicit cluster', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ result: { value: 1230000000 } }),
    } as Response)

    const request = new Request('http://localhost/api/wallet/balance?address=7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL&cluster=devnet')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.sol).toBe(1.23)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('in auto mode chooses highest successful cluster balance', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { value: 0 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { value: 750000000 } }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { value: 250000000 } }),
      } as Response)

    const request = new Request('http://localhost/api/wallet/balance?address=7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL&cluster=auto')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.sol).toBe(0.75)
  })

  it('returns 502 when rpc fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('rpc unavailable'))

    const request = new Request('http://localhost/api/wallet/balance?address=7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL&cluster=devnet')
    const response = await GET(request)

    expect(response.status).toBe(502)
  })
})
