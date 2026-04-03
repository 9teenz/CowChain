import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getServerSessionMock, prismaMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
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

import { GET } from '@/app/api/auth/me/route'

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when session has no user id', async () => {
    getServerSessionMock.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('returns 404 when user is missing in db', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.user.findUnique.mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(404)
  })

  it('returns user payload when session is valid', async () => {
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } })
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      walletAddress: '7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL',
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe('user-1')
    expect(body.email).toBe('alice@example.com')
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
      })
    )
  })
})
