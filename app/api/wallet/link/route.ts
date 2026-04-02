import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'

const bodySchema = z.object({
  walletAddress: z.string().min(8),
  walletProvider: z.string().min(2).max(40).optional(),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const parsed = bodySchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid wallet payload.' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { walletAddress: parsed.data.walletAddress } })
    if (existing && existing.id !== session.user.id) {
      return NextResponse.json({ error: 'Wallet is already linked to another account.' }, { status: 409 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        walletAddress: parsed.data.walletAddress,
        walletProvider: parsed.data.walletProvider || null,
      },
    })

    return NextResponse.json({ ok: true, message: 'Wallet linked successfully.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to link wallet.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { walletAddress: null, walletProvider: null },
    })

    return NextResponse.json({ ok: true, message: 'Wallet unlinked successfully.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to unlink wallet.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
