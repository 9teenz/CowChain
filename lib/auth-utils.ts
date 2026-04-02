import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}

export function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30)

  return { token, tokenHash, expiresAt }
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
