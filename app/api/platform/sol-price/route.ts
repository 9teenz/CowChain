import { NextResponse } from 'next/server'

type SolPriceSuccess = { ok: true; priceUsd: number; source: string }
type SolPriceFailure = { ok: false; error: string }

let cachedPrice: { priceUsd: number; fetchedAt: number } | null = null
const CACHE_TTL_MS = 30_000

async function fetchFromCoingecko(): Promise<number | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { signal: controller.signal, cache: 'no-store' }
    )
    clearTimeout(timeout)
    if (!res.ok) return null
    const data = (await res.json()) as { solana?: { usd?: number } }
    return data.solana?.usd ?? null
  } catch {
    return null
  }
}

export async function GET() {
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json<SolPriceSuccess>({
      ok: true,
      priceUsd: cachedPrice.priceUsd,
      source: 'cache',
    })
  }

  const price = await fetchFromCoingecko()

  if (price && price > 0) {
    cachedPrice = { priceUsd: price, fetchedAt: Date.now() }
    return NextResponse.json<SolPriceSuccess>({
      ok: true,
      priceUsd: price,
      source: 'coingecko',
    })
  }

  if (cachedPrice) {
    return NextResponse.json<SolPriceSuccess>({
      ok: true,
      priceUsd: cachedPrice.priceUsd,
      source: 'stale-cache',
    })
  }

  return NextResponse.json<SolPriceFailure>(
    { ok: false, error: 'Unable to fetch SOL price.' },
    { status: 502 }
  )
}
