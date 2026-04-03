import { describe, expect, it } from 'vitest'
import { createEmailVerificationToken, hashPassword, hashToken, verifyPassword } from '@/lib/auth-utils'

describe('auth-utils', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('SuperSecret123')

    expect(hash).not.toBe('SuperSecret123')
    await expect(verifyPassword('SuperSecret123', hash)).resolves.toBe(true)
  })

  it('rejects incorrect password', async () => {
    const hash = await hashPassword('SuperSecret123')

    await expect(verifyPassword('WrongPassword123', hash)).resolves.toBe(false)
  })

  it('creates verification token with hash and 30 minute expiry', () => {
    const now = Date.now()
    const { token, tokenHash, expiresAt } = createEmailVerificationToken()

    expect(token).toHaveLength(64)
    expect(tokenHash).toHaveLength(64)
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(now + 29 * 60 * 1000)
    expect(expiresAt.getTime()).toBeLessThanOrEqual(now + 31 * 60 * 1000)
  })

  it('hashToken is deterministic', () => {
    const a = hashToken('demo-token')
    const b = hashToken('demo-token')
    const c = hashToken('other-token')

    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
