import { NextResponse } from 'next/server'
import { PLATFORM_TOKEN_MINT, PLATFORM_TOKEN_SYMBOL } from '@/lib/demo-data'

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet'

type TokenBalanceSuccess = {
  ok: true
  address: string
  mint: string
  symbol: string
  cluster: Cluster
  source: 'rpc'
  rawAmount: string
  amount: number
  decimals: number
  tokenAccounts: number
}

type TokenBalanceFailure = {
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

function formatTokenAmount(rawAmount: bigint, decimals: number) {
  if (decimals <= 0) {
    return rawAmount.toString()
  }

  let divisor = BigInt(1)
  for (let index = 0; index < decimals; index += 1) {
    divisor *= BigInt(10)
  }

  const whole = rawAmount / divisor
  const fraction = (rawAmount % divisor).toString().padStart(decimals, '0').replace(/0+$/, '')

  return fraction ? `${whole.toString()}.${fraction}` : whole.toString()
}

async function fetchTokenBalance(rpcUrl: string, address: string, mint: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [address, { mint }, { encoding: 'jsonParsed' }],
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
        value?: Array<{
          account?: {
            data?: {
              parsed?: {
                info?: {
                  tokenAmount?: {
                    amount?: string
                    decimals?: number
                  }
                }
              }
            }
          }
        }>
      }
    }

    if (payload.error) {
      throw new Error(payload.error.message || 'RPC returned an error')
    }

    const accounts = payload.result?.value || []
    let totalRawAmount = BigInt(0)
    let decimals = 0

    for (const item of accounts) {
      const tokenAmount = item.account?.data?.parsed?.info?.tokenAmount
      if (typeof tokenAmount?.amount !== 'string') {
        continue
      }

      totalRawAmount += BigInt(tokenAmount.amount)
      decimals = typeof tokenAmount.decimals === 'number' ? tokenAmount.decimals : decimals
    }

    const formattedAmount = formatTokenAmount(totalRawAmount, decimals)

    return {
      rawAmount: totalRawAmount.toString(),
      amount: Number.parseFloat(formattedAmount),
      decimals,
      tokenAccounts: accounts.length,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const address = (url.searchParams.get('address') || '').trim()
  const clusterQuery = (url.searchParams.get('cluster') || 'auto').trim()
  const mint = (url.searchParams.get('mint') || process.env.NEXT_PUBLIC_COWCHAIN_TOKEN_MINT || PLATFORM_TOKEN_MINT).trim()
  const symbol = (url.searchParams.get('symbol') || PLATFORM_TOKEN_SYMBOL).trim() || PLATFORM_TOKEN_SYMBOL

  if (!address) {
    return NextResponse.json<TokenBalanceFailure>({ ok: false, error: 'Missing wallet address.' }, { status: 400 })
  }

  if (!BASE58_ADDRESS.test(address)) {
    return NextResponse.json<TokenBalanceFailure>({ ok: false, error: 'Invalid wallet address format.' }, { status: 400 })
  }

  if (!mint) {
    return NextResponse.json<TokenBalanceFailure>(
      { ok: false, error: 'Missing CowChain mint address.' },
      { status: 400 }
    )
  }

  if (!BASE58_ADDRESS.test(mint)) {
    return NextResponse.json<TokenBalanceFailure>(
      { ok: false, error: 'Invalid CowChain mint address format.' },
      { status: 400 }
    )
  }

  const clustersToTry: Cluster[] =
    clusterQuery === 'auto'
      ? ['mainnet-beta', 'devnet', 'testnet']
      : isCluster(clusterQuery)
        ? [clusterQuery]
        : []

  if (clustersToTry.length === 0) {
    return NextResponse.json<TokenBalanceFailure>(
      { ok: false, error: 'Invalid cluster. Use auto, mainnet-beta, devnet, or testnet.' },
      { status: 400 }
    )
  }

  let lastError = 'Unable to fetch CowChain token balance from RPC.'
  const successful: Array<{
    cluster: Cluster
    rawAmount: string
    amount: number
    decimals: number
    tokenAccounts: number
  }> = []

  for (const cluster of clustersToTry) {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || CLUSTER_RPC[cluster]

    try {
      const result = await fetchTokenBalance(rpcUrl, address, mint)

      if (clusterQuery === 'auto') {
        successful.push({ cluster, ...result })
        continue
      }

      return NextResponse.json<TokenBalanceSuccess>({
        ok: true,
        address,
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

    return NextResponse.json<TokenBalanceSuccess>({
      ok: true,
      address,
      mint,
      symbol,
      cluster: best.cluster,
      source: 'rpc',
      rawAmount: best.rawAmount,
      amount: best.amount,
      decimals: best.decimals,
      tokenAccounts: best.tokenAccounts,
    })
  }

  return NextResponse.json<TokenBalanceFailure>({ ok: false, error: lastError }, { status: 502 })
}
