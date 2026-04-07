import { NextResponse } from 'next/server'

import { initialDemoState, PLATFORM_TOKEN_SYMBOL } from '@/lib/demo-data'
import { calculateNavPurchaseQuote, SOL_USD_RATE } from '@/lib/solana-contract'

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet'

async function fetchLiveSolPrice(): Promise<number | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { signal: controller.signal, cache: 'no-store' })
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = await res.json() as { solana?: { usd?: number } }
    return data.solana?.usd ?? null
  } catch {
    return null
  }
}

type BuyCowChainRequest = {
  herdId?: string
  tokenAmount?: number
  cluster?: Cluster
  slippageBps?: number
  solUsdRate?: number
}

type BuyCowChainSuccess = {
  ok: true
  herdId: string
  herdName: string
  symbol: string
  tokenAmount: number
  navPerTokenUsd: number
  usdTotal: number
  solUsdRate: number
  solTotal: number
  lamports: number
  maxLamports: number
  slippageBps: number
  cluster: Cluster
  expiresAt: string
}

type BuyCowChainFailure = {
  ok: false
  error: string
}

function isCluster(value: string): value is Cluster {
  return value === 'mainnet-beta' || value === 'devnet' || value === 'testnet'
}

export async function POST(request: Request) {
  let payload: BuyCowChainRequest

  try {
    payload = (await request.json()) as BuyCowChainRequest
  } catch {
    return NextResponse.json<BuyCowChainFailure>({ ok: false, error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const herdId = (payload.herdId || initialDemoState.herds[0]?.id || '').trim()
  const tokenAmount = Number(payload.tokenAmount)
  const slippageBps = Number.isFinite(payload.slippageBps) ? Math.max(25, Math.min(1_500, Number(payload.slippageBps))) : 150
  const cluster = payload.cluster && isCluster(payload.cluster) ? payload.cluster : 'devnet'
  
  let solPriceContext = Number(process.env.NEXT_PUBLIC_SOL_USD_RATE || SOL_USD_RATE)
  const livePrice = await fetchLiveSolPrice()
  if (livePrice) {
    solPriceContext = livePrice
  }

  const solUsdRate = Number.isFinite(payload.solUsdRate) && Number(payload.solUsdRate) > 0
    ? Number(payload.solUsdRate)
    : solPriceContext

  if (!herdId) {
    return NextResponse.json<BuyCowChainFailure>({ ok: false, error: 'Missing herd id.' }, { status: 400 })
  }

  if (!Number.isFinite(tokenAmount) || tokenAmount <= 0) {
    return NextResponse.json<BuyCowChainFailure>({ ok: false, error: 'Token amount must be a positive number.' }, { status: 400 })
  }

  const herd = initialDemoState.herds.find((item) => item.id === herdId)

  if (!herd) {
    return NextResponse.json<BuyCowChainFailure>({ ok: false, error: 'Herd not found.' }, { status: 404 })
  }

  const quote = calculateNavPurchaseQuote({
    tokenAmount,
    navPerTokenUsd: initialDemoState.platform.navPerTokenUsd,
    solUsdRate,
  })

  const maxLamports = Math.ceil(quote.lamports * (1 + slippageBps / 10_000))
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString()

  return NextResponse.json<BuyCowChainSuccess>({
    ok: true,
    herdId: herd.id,
    herdName: herd.name,
    symbol: PLATFORM_TOKEN_SYMBOL,
    tokenAmount: quote.tokenAmount,
    navPerTokenUsd: quote.navPerTokenUsd,
    usdTotal: quote.usdTotal,
    solUsdRate: quote.solUsdRate,
    solTotal: quote.solTotal,
    lamports: quote.lamports,
    maxLamports,
    slippageBps,
    cluster,
    expiresAt,
  })
}
