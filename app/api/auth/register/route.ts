import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createEmailVerificationToken, hashPassword } from '@/lib/auth-utils'
import { sendVerificationEmail } from '@/lib/mailer'

const bodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  role: z.enum(['farmer', 'investor']).default('investor'),
})

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const parsed = bodySchema.safeParse(payload)

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]
      return NextResponse.json(
        {
          error: firstIssue
            ? `${firstIssue.path.join('.') || 'payload'}: ${firstIssue.message}`
            : 'Invalid registration payload.',
        },
        { status: 400 }
      )
    }

    const email = parsed.data.email.toLowerCase()
    const derivedName = email.split('@')[0]
    const name = parsed.data.name?.trim() || derivedName

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered.' }, { status: 409 })
    }

    const passwordHash = await hashPassword(parsed.data.password)

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: parsed.data.role,
      },
    })

    const { token, tokenHash, expiresAt } = createEmailVerificationToken()

    await prisma.emailVerificationToken.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    })

    await sendVerificationEmail(email, token)

    return NextResponse.json({
      ok: true,
      message: 'Account created. Verify your email from the Ethereal message link.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
