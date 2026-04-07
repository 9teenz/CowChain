import { NextResponse } from 'next/server'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import bs58 from 'bs58'

interface SellRequest {
  recipientAddress: string
  tokenAmount: number
  solPriceUsd: number
  navPerTokenUsd?: number
}

type SellSuccess = {
  ok: true
  txId: string
  tokenAmount: number
  amountUsd: number
  amountSol: number
  solPriceUsd: number
  recipient: string
}

type SellFailure = {
  ok: false
  error: string
}

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const DEFAULT_NAV_PER_TOKEN_USD = 1.106

function resolveCluster() {
  const env = process.env.SOLANA_CLUSTER?.trim()
  if (env === 'devnet' || env === 'testnet' || env === 'mainnet-beta') return env
  return 'devnet'
}

function getConnection() {
  const cluster = resolveCluster()
  const rpcUrl = process.env.SOLANA_RPC_URL?.trim() || process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || clusterApiUrl(cluster)
  return new Connection(rpcUrl, 'confirmed')
}

function getAdminKeypair(): Keypair {
  const rawSecret = process.env.SOLANA_ADMIN_PRIVATE_KEY
  if (!rawSecret) {
    throw new Error('SOLANA_ADMIN_PRIVATE_KEY not configured.')
  }

  const trimmed = rawSecret.trim()
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as number[]
    return Keypair.fromSecretKey(Uint8Array.from(parsed))
  }

  return Keypair.fromSecretKey(bs58.decode(trimmed))
}

export async function POST(request: Request) {
  let body: SellRequest

  try {
    body = (await request.json()) as SellRequest
  } catch {
    return NextResponse.json<SellFailure>({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const { recipientAddress, tokenAmount, solPriceUsd, navPerTokenUsd } = body
  const navPrice = (navPerTokenUsd && navPerTokenUsd > 0) ? navPerTokenUsd : DEFAULT_NAV_PER_TOKEN_USD

  if (!recipientAddress || !BASE58_ADDRESS.test(recipientAddress)) {
    return NextResponse.json<SellFailure>({ ok: false, error: 'Invalid recipient wallet address.' }, { status: 400 })
  }

  if (!tokenAmount || tokenAmount <= 0) {
    return NextResponse.json<SellFailure>({ ok: false, error: 'Token amount must be positive.' }, { status: 400 })
  }

  if (!solPriceUsd || solPriceUsd <= 0) {
    return NextResponse.json<SellFailure>({ ok: false, error: 'Invalid SOL price.' }, { status: 400 })
  }

  try {
    const connection = getConnection()
    const payer = getAdminKeypair()
    const recipient = new PublicKey(recipientAddress)

    console.log('[sell-tokens] From treasury:', payer.publicKey.toBase58())
    console.log('[sell-tokens] To recipient:', recipient.toBase58())
    console.log('[sell-tokens] Tokens:', tokenAmount, '| SOL price:', solPriceUsd)

    const amountUsd = tokenAmount * navPrice
    const amountSol = amountUsd / solPriceUsd
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)

    if (lamports <= 0) {
      return NextResponse.json<SellFailure>({ ok: false, error: 'Payout amount too small.' }, { status: 400 })
    }

    console.log('[sell-tokens] Sending SOL:', amountSol.toFixed(6), '| USD:', amountUsd.toFixed(2), '| SOL price:', solPriceUsd)

    const balance = await connection.getBalance(payer.publicKey)
    const balanceSol = balance / LAMPORTS_PER_SOL
    if (balance < lamports + 5000) {
      return NextResponse.json<SellFailure>(
        { ok: false, error: `Treasury has ${balanceSol.toFixed(4)} SOL, need ${amountSol.toFixed(4)} SOL. Please fund the treasury wallet.` },
        { status: 502 }
      )
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: recipient,
        lamports,
      })
    )

    const txId = await sendAndConfirmTransaction(connection, transaction, [payer], {
      commitment: 'confirmed',
    })

    return NextResponse.json<SellSuccess>({
      ok: true,
      txId,
      tokenAmount,
      amountUsd: Number(amountUsd.toFixed(2)),
      amountSol: Number(amountSol.toFixed(6)),
      solPriceUsd,
      recipient: recipientAddress,
    })
  } catch (error) {
    console.error('[sell-tokens] Error:', error)
    const message = error instanceof Error ? error.message : 'Token sell failed.'
    return NextResponse.json<SellFailure>({ ok: false, error: message }, { status: 502 })
  }
}
