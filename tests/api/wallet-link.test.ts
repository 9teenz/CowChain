import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getServerSessionMock, prismaMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock('@/auth', () => ({
  authOptions: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

import { DELETE, POST } from '@/app/api/wallet/link/route'

describe('wallet link route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.update.mockResolvedValue({ id: 'user-1' })
  })

  it('POST returns 401 for unauthenticated user', async () => {
    getServerSessionMock.mockResolvedValue(null)

    const request = new Request('http://localhost/api/wallet/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ walletAddress: '7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL', walletProvider: 'Phantom' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('POST returns 400 for invalid payload', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })

    const request = new Request('http://localhost/api/wallet/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ walletAddress: 'short' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('POST returns 409 when wallet belongs to another user', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-2' })

    const request = new Request('http://localhost/api/wallet/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ walletAddress: '7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL', walletProvider: 'Phantom' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(409)
  })

  it('POST links wallet when payload and session are valid', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })

    const request = new Request('http://localhost/api/wallet/link', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ walletAddress: '7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL', walletProvider: 'Phantom' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: {
          walletAddress: '7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL',
          walletProvider: 'Phantom',
        },
      })
    )
  })

  it('DELETE unlinks wallet for authenticated user', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })

    const response = await DELETE()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: {
          walletAddress: null,
          walletProvider: null,
        },
      })
    )
  })
})
