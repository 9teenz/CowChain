import { NextResponse } from 'next/server'
import { PLATFORM_TOKEN_MINT } from '@/lib/demo-data'

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet'

const CLUSTER_RPC: Record<Cluster, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
}

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

function isCluster(value: string): value is Cluster {
  return value === 'mainnet-beta' || value === 'devnet' || value === 'testnet'
}

/**
 * Uses getTokenLargestAccounts — a dedicated RPC method that returns up to 20
 * token accounts with non-zero balances. This method is available on all public
 * Solana RPC endpoints (unlike getProgramAccounts which is disabled).
 */
async function fetchTokenHolders(rpcUrl: string, mint: string): Promise<number> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenLargestAccounts',
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
        value?: Array<{ address: string; amount: string; decimals: number; uiAmount: number | null }>
      }
    }

    if (payload.error) {
      throw new Error(payload.error.message || 'RPC returned an error')
    }

    const accounts = payload.result?.value
    if (!Array.isArray(accounts)) {
      throw new Error('RPC returned invalid token accounts payload')
    }

    // Count only accounts with a non-zero balance
    return accounts.filter((a) => a.uiAmount !== null && a.uiAmount > 0).length
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const clusterQuery = (url.searchParams.get('cluster') || 'auto').trim()
  const mint = (
    url.searchParams.get('mint') ||
    process.env.NEXT_PUBLIC_COWCHAIN_TOKEN_MINT ||
    PLATFORM_TOKEN_MINT
  ).trim()

  if (!mint) {
    return NextResponse.json({ ok: false, error: 'Missing token mint address.' }, { status: 400 })
  }

  if (!BASE58_ADDRESS.test(mint)) {
    return NextResponse.json({ ok: false, error: 'Invalid token mint address format.' }, { status: 400 })
  }

  const clustersToTry: Cluster[] =
    clusterQuery === 'auto'
      ? ['mainnet-beta', 'devnet', 'testnet']
      : isCluster(clusterQuery)
        ? [clusterQuery]
        : []

  if (clustersToTry.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Invalid cluster. Use auto, mainnet-beta, devnet, or testnet.' },
      { status: 400 },
    )
  }

  let lastError = 'Unable to fetch token holder count from RPC.'

  if (clusterQuery !== 'auto') {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || CLUSTER_RPC[clustersToTry[0]]
    try {
      const count = await fetchTokenHolders(rpcUrl, mint)
      return NextResponse.json({ ok: true, mint, cluster: clustersToTry[0], source: 'rpc', holders: count })
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'RPC request failed.'
    }
    return NextResponse.json({ ok: false, error: lastError }, { status: 502 })
  }

  // auto mode: try all clusters, return the one with the most holders
  const successful: Array<{ cluster: Cluster; holders: number }> = []

  for (const cluster of clustersToTry) {
    const rpcUrl = CLUSTER_RPC[cluster]
    try {
      const count = await fetchTokenHolders(rpcUrl, mint)
      successful.push({ cluster, holders: count })
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'RPC request failed.'
    }
  }

  if (successful.length > 0) {
    const best = successful.reduce((a, b) => (b.holders > a.holders ? b : a))
    return NextResponse.json({ ok: true, mint, cluster: best.cluster, source: 'rpc', holders: best.holders })
  }

  return NextResponse.json({ ok: false, error: lastError }, { status: 502 })
}
