import { NextResponse } from 'next/server'
import { PLATFORM_TOKEN_MINT, PLATFORM_TOKEN_SYMBOL } from '@/lib/demo-data'

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet'

type TokenSupplySuccess = {
  ok: true
  mint: string
  symbol: string
  cluster: Cluster
  source: 'rpc'
  rawAmount: string
  amount: number
  decimals: number
}

type TokenSupplyFailure = {
  ok: false
  error: string
}

const CLUSTER_RPC: Record<Cluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function isCluster(value: string): value is Cluster {
  return value === 'mainnet-beta' || value === 'devnet' || value === 'testnet'
}

async function fetchTokenSupply(rpcUrl: string, mint: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenSupply',
        params: [mint],
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`RPC HTTP ${response.status}`)
    }

    const payload = (await response.json()) as {
      error?: { message?: string }
      result?: {
        value?: {
          amount?: string
          decimals?: number
          uiAmount?: number | null
          uiAmountString?: string
        }
      }
    }

    if (payload.error) {
      throw new Error(payload.error.message || 'RPC returned an error')
    }

    const value = payload.result?.value
    if (!value || typeof value.amount !== 'string') {
      throw new Error('RPC returned invalid token supply payload')
    }

    const decimals = typeof value.decimals === 'number' ? value.decimals : 0
    const parsedAmount =
      typeof value.uiAmount === 'number'
        ? value.uiAmount
        : Number.parseFloat(value.uiAmountString || '0')

    return {
      rawAmount: value.amount,
      amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
      decimals,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const clusterQuery = (url.searchParams.get('cluster') || 'auto').trim()
  const mint = (url.searchParams.get('mint') || process.env.NEXT_PUBLIC_COWCHAIN_TOKEN_MINT || PLATFORM_TOKEN_MINT).trim()
  const symbol = (url.searchParams.get('symbol') || PLATFORM_TOKEN_SYMBOL).trim() || PLATFORM_TOKEN_SYMBOL

  if (!mint) {
    return NextResponse.json<TokenSupplyFailure>({ ok: false, error: 'Missing token mint address.' }, { status: 400 })
  }

  if (!BASE58_ADDRESS.test(mint)) {
    return NextResponse.json<TokenSupplyFailure>({ ok: false, error: 'Invalid token mint address format.' }, { status: 400 })
  }

  const clustersToTry: Cluster[] =
    clusterQuery === 'auto'
      ? ['mainnet-beta', 'devnet', 'testnet']
      : isCluster(clusterQuery)
        ? [clusterQuery]
        : []

  if (clustersToTry.length === 0) {
    return NextResponse.json<TokenSupplyFailure>(
      { ok: false, error: 'Invalid cluster. Use auto, mainnet-beta, devnet, or testnet.' },
      { status: 400 }
    )
  }

  let lastError = 'Unable to fetch CowChain token supply from RPC.'
  const successful: Array<{
    cluster: Cluster
    rawAmount: string
    amount: number
    decimals: number
  }> = []

  for (const cluster of clustersToTry) {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || CLUSTER_RPC[cluster]

    try {
      const result = await fetchTokenSupply(rpcUrl, mint)

      if (clusterQuery === 'auto') {
        successful.push({ cluster, ...result })
        continue
      }

      return NextResponse.json<TokenSupplySuccess>({
        ok: true,
        mint,
        symbol,
        cluster,
        source: 'rpc',
        ...result,
      })
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'RPC request failed.'
    }
  }

  if (clusterQuery === 'auto' && successful.length > 0) {
    const best = successful.reduce((current, item) => {
      if (BigInt(item.rawAmount) > BigInt(current.rawAmount)) {
        return item
      }

      return current
    })

    return NextResponse.json<TokenSupplySuccess>({
      ok: true,
      mint,
      symbol,
      cluster: best.cluster,
      source: 'rpc',
      rawAmount: best.rawAmount,
      amount: best.amount,
      decimals: best.decimals,
    })
  }

  return NextResponse.json<TokenSupplyFailure>({ ok: false, error: lastError }, { status: 502 })
}
