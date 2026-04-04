import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashToken } from '@/lib/auth-utils'

const bodySchema = z.object({
  token: z.string().min(10),
})

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const parsed = bodySchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid verification payload.' }, { status: 400 })
    }

    const tokenHash = hashToken(parsed.data.token)

    const verification = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    })

    if (!verification) {
      return NextResponse.json({ error: 'Verification token is invalid or expired.' }, { status: 400 })
    }

    if (verification.usedAt) {
      const user = await prisma.user.findUnique({ where: { email: verification.email } })
      if (user?.emailVerified) {
        return NextResponse.json({ ok: true, message: 'Email is already verified.' })
      }

      return NextResponse.json({ error: 'Verification token is invalid or expired.' }, { status: 400 })
    }

    if (verification.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Verification token is invalid or expired.' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { email: verification.email },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ])

    return NextResponse.json({ ok: true, email: verification.email, message: 'Email verified successfully.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm verification.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
