import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createEmailVerificationToken } from '@/lib/auth-utils'
import { sendVerificationEmail } from '@/lib/mailer'

const bodySchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const parsed = bodySchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid email payload.' }, { status: 400 })
    }

    const email = parsed.data.email.toLowerCase()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json({ ok: true, message: 'If your email exists, verification mail has been sent.' })
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, message: 'Email is already verified.' })
    }

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
      message: 'Verification email sent. Open the Ethereal preview link from terminal.',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to request verification.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
