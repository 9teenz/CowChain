import { NextResponse } from 'next/server'

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet'

type BalanceSuccess = {
  ok: true
  address: string
  cluster: Cluster
  source: 'rpc'
  lamports: number
  sol: number
}

type BalanceFailure = {
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

async function fetchLamports(rpcUrl: string, address: string): Promise<number> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      }),
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`RPC HTTP ${response.status}`)
    }

    const payload = (await response.json()) as {
      error?: { message?: string }
      result?: { value?: number }
    }

    if (payload.error) {
      throw new Error(payload.error.message || 'RPC returned an error')
    }

    const lamports = payload.result?.value
    if (typeof lamports !== 'number') {
      throw new Error('RPC returned invalid balance payload')
    }

    return lamports
  } finally {
    clearTimeout(timeout)
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const address = (url.searchParams.get('address') || '').trim()
  const clusterQuery = (url.searchParams.get('cluster') || 'auto').trim()

  if (!address) {
    return NextResponse.json<BalanceFailure>({ ok: false, error: 'Missing wallet address.' }, { status: 400 })
  }

  if (!BASE58_ADDRESS.test(address)) {
    return NextResponse.json<BalanceFailure>({ ok: false, error: 'Invalid wallet address format.' }, { status: 400 })
  }

  const clustersToTry: Cluster[] =
    clusterQuery === 'auto'
      ? ['mainnet-beta', 'devnet', 'testnet']
      : isCluster(clusterQuery)
        ? [clusterQuery]
        : []

  if (clustersToTry.length === 0) {
    return NextResponse.json<BalanceFailure>(
      { ok: false, error: 'Invalid cluster. Use auto, mainnet-beta, devnet, or testnet.' },
      { status: 400 }
    )
  }

  let lastError = 'Unable to fetch SOL balance from RPC.'

  // In auto mode, collect successful results from all clusters and prefer the highest
  // non-zero value so devnet/testnet funds are not masked by a mainnet zero balance.
  const successful: Array<{ cluster: Cluster; lamports: number }> = []

  for (const cluster of clustersToTry) {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || CLUSTER_RPC[cluster]

    try {
      const lamports = await fetchLamports(rpcUrl, address)
      if (clusterQuery === 'auto') {
        successful.push({ cluster, lamports })
        continue
      }

      const sol = Number((lamports / 1_000_000_000).toFixed(4))
      return NextResponse.json<BalanceSuccess>({
        ok: true,
        address,
        cluster,
        source: 'rpc',
        lamports,
        sol,
      })
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'RPC request failed.'
    }
  }

  if (clusterQuery === 'auto' && successful.length > 0) {
    const best = successful.reduce((current, item) => {
      if (item.lamports > current.lamports) {
        return item
      }
      return current
    })

    return NextResponse.json<BalanceSuccess>({
      ok: true,
      address,
      cluster: best.cluster,
      source: 'rpc',
      lamports: best.lamports,
      sol: Number((best.lamports / 1_000_000_000).toFixed(4)),
    })
  }

  return NextResponse.json<BalanceFailure>({ ok: false, error: lastError }, { status: 502 })
}