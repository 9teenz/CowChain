import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, authUtilsMock } = vi.hoisted(() => ({
  prismaMock: {
    emailVerificationToken: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  authUtilsMock: {
    hashToken: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth-utils', () => authUtilsMock)

import { POST } from '@/app/api/auth/verify/confirm/route'

describe('POST /api/auth/verify/confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authUtilsMock.hashToken.mockReturnValue('hashed-token')
  })

  it('returns 400 on invalid payload', async () => {
    const request = new Request('http://localhost/api/auth/verify/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'short' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('returns 400 when token not found', async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/auth/verify/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: '01234567890' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('invalid or expired')
  })

  it('returns ok when token was already used and user is verified', async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'vt-1',
      email: 'alice@example.com',
      usedAt: new Date('2026-04-01T10:00:00.000Z'),
      expiresAt: new Date('2026-04-05T10:00:00.000Z'),
    })
    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: new Date('2026-04-01T10:00:00.000Z') })

    const request = new Request('http://localhost/api/auth/verify/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: '01234567890' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('marks user verified and token used when valid', async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'vt-1',
      email: 'alice@example.com',
      usedAt: null,
      expiresAt: new Date('2030-04-05T10:00:00.000Z'),
    })
    prismaMock.user.update.mockReturnValue({})
    prismaMock.emailVerificationToken.update.mockReturnValue({})
    prismaMock.$transaction.mockResolvedValue([])

    const request = new Request('http://localhost/api/auth/verify/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: '01234567890' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
  })
})
