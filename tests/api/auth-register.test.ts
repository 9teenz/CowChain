import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, authUtilsMock, mailerMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    emailVerificationToken: {
      create: vi.fn(),
    },
  },
  authUtilsMock: {
    hashPassword: vi.fn(),
    createEmailVerificationToken: vi.fn(),
  },
  mailerMock: {
    sendVerificationEmail: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth-utils', () => authUtilsMock)
vi.mock('@/lib/mailer', () => mailerMock)

import { POST } from '@/app/api/auth/register/route'

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({ id: 'user-1' })
    prismaMock.emailVerificationToken.create.mockResolvedValue({ id: 'tok-1' })
    authUtilsMock.hashPassword.mockResolvedValue('hashed-password')
    authUtilsMock.createEmailVerificationToken.mockReturnValue({
      token: 'raw-token',
      tokenHash: 'hash-token',
      expiresAt: new Date('2026-04-03T12:30:00.000Z'),
    })
    mailerMock.sendVerificationEmail.mockResolvedValue(undefined)
  })

  it('returns 400 on invalid payload', async () => {
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'bad-email', password: 'short' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('email')
  })

  it('returns 409 when email already exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' })

    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'alice@example.com', password: 'Secret12345' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toContain('already registered')
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('creates user, stores token hash, and sends verification email', async () => {
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', email: 'Alice@Example.com', password: 'Secret12345' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'alice@example.com',
          passwordHash: 'hashed-password',
        }),
      })
    )
    expect(prismaMock.emailVerificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'alice@example.com',
          tokenHash: 'hash-token',
        }),
      })
    )
    expect(mailerMock.sendVerificationEmail).toHaveBeenCalledWith('alice@example.com', 'raw-token')
  })
})
