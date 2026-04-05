import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/auth'
import {
  createManagedToken,
  disableMintAuthority,
  getTokenAdminSummary,
  inspectTokenMint,
  mintExistingToken,
  upsertTokenMetadata,
} from '@/lib/spl-token-admin'

const clusterSchema = z.enum(['devnet', 'testnet', 'mainnet-beta']).optional()

const createSchema = z.object({
  action: z.literal('create'),
  name: z.string().trim().min(2).max(32),
  symbol: z.string().trim().min(2).max(10),
  uri: z.string().trim().optional(),
  decimals: z.coerce.number().int().min(0).max(9).default(9),
  initialSupply: z.string().trim().optional(),
  recipient: z.string().trim().optional(),
  enableFreezeAuthority: z.coerce.boolean().optional(),
  cluster: clusterSchema,
})

const mintSchema = z.object({
  action: z.literal('mint'),
  mintAddress: z.string().trim().min(32),
  amount: z.string().trim().min(1),
  recipient: z.string().trim().optional(),
  cluster: clusterSchema,
})

const disableMintAuthoritySchema = z.object({
  action: z.literal('disableMintAuthority'),
  mintAddress: z.string().trim().min(32),
  cluster: clusterSchema,
})

const upsertMetadataSchema = z.object({
  action: z.literal('upsertMetadata'),
  mintAddress: z.string().trim().min(32),
  name: z.string().trim().min(2).max(32),
  symbol: z.string().trim().min(2).max(10),
  uri: z.string().trim().optional(),
  cluster: clusterSchema,
})

const actionSchema = z.discriminatedUnion('action', [
  createSchema,
  mintSchema,
  disableMintAuthoritySchema,
  upsertMetadataSchema,
])

type TokenAdminSession = {
  user?: {
    id?: string
    role?: string
    email?: string | null
    walletAddress?: string | null
  }
} | null

function isTokenAdmin(session: TokenAdminSession) {
  const role = session?.user?.role?.toLowerCase() || ''
  const email = session?.user?.email?.toLowerCase() || ''
  const allowedEmails = (process.env.SOLANA_ADMIN_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

  return !!session?.user?.id && (role === 'admin' || role === 'farmer' || allowedEmails.includes(email))
}

async function authorize() {
  const session = (await getServerSession(authOptions)) as TokenAdminSession

  if (!session?.user?.id) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (!isTokenAdmin(session)) {
    return {
      session,
      response: NextResponse.json(
        { ok: false, error: 'Admin or farmer access is required for SPL token management.' },
        { status: 403 }
      ),
    }
  }

  return { session, response: null }
}

export async function GET(request: Request) {
  const auth = await authorize()
  if (auth.response) {
    return auth.response
  }

  const url = new URL(request.url)
  const mintAddress = url.searchParams.get('mint')?.trim()
  const holderAddress = url.searchParams.get('holder')?.trim() || undefined
  const clusterResult = clusterSchema.safeParse(url.searchParams.get('cluster') || undefined)

  if (!clusterResult.success && url.searchParams.get('cluster')) {
    return NextResponse.json({ ok: false, error: 'Invalid cluster parameter.' }, { status: 400 })
  }

  try {
    if (!mintAddress) {
      const linkedWalletAddress = auth.session?.user?.walletAddress || null
      const summary = getTokenAdminSummary(clusterResult.data)

      return NextResponse.json({
        ok: true,
        ...summary,
        configured: !!linkedWalletAddress,
        adminPublicKey: linkedWalletAddress,
        setupMessage: linkedWalletAddress
          ? 'Use the linked Phantom wallet to sign SPL token transactions.'
          : 'Link a Phantom wallet to your account first.',
      })
    }

    const result = await inspectTokenMint({
      mintAddress,
      holderAddress,
      cluster: clusterResult.data,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed to inspect token mint.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await authorize()
  if (auth.response) {
    return auth.response
  }

  const payload = await request.json().catch(() => null)
  const parsed = actionSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request payload.', issues: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    if (parsed.data.action === 'create') {
      const result = await createManagedToken(parsed.data)
      return NextResponse.json({ ok: true, action: 'create', ...result })
    }

    if (parsed.data.action === 'mint') {
      const result = await mintExistingToken(parsed.data)
      return NextResponse.json({ ok: true, action: 'mint', ...result })
    }

    if (parsed.data.action === 'upsertMetadata') {
      const result = await upsertTokenMetadata(parsed.data)
      return NextResponse.json({ ok: true, action: 'upsertMetadata', ...result })
    }

    const result = await disableMintAuthority(parsed.data)
    return NextResponse.json({ ok: true, action: 'disableMintAuthority', ...result })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'SPL token action failed.' },
      { status: 500 }
    )
  }
}
