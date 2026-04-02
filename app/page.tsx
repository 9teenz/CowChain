'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { HerdCard } from '@/components/herd-card'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDemoState } from '@/components/demo-state-provider'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { shortenWallet } from '@/lib/solana-contract'
import { Wallet, TrendingUp, Coins, Users, ArrowRight, Sparkles, RefreshCw } from 'lucide-react'

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet'

type PhantomRequestProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function isCluster(value: unknown): value is Cluster {
  return value === 'mainnet-beta' || value === 'devnet' || value === 'testnet'
}

export default function DashboardPage() {
  const {
    state: { herds, listings, sales, wallet },
    portfolioSummary,
    claimDividends,
  } = useDemoState()

  const [realSolBalance, setRealSolBalance] = useState<number | null>(null)
  const [isSolLoading, setIsSolLoading] = useState(false)

  const connectedWalletAddress = wallet.connected ? wallet.walletAddress : ''

  const fetchSolBalance = async () => {
    if (!wallet.connected || !connectedWalletAddress) {
      setRealSolBalance(null)
      return
    }
    setIsSolLoading(true)
    try {
      let preferredCluster: Cluster | 'auto' = 'auto'
      try {
        const provider = (window as Window & { solana?: PhantomRequestProvider }).solana
        const providerCluster = await provider?.request?.({ method: 'getCluster' })
        if (isCluster(providerCluster)) preferredCluster = providerCluster
      } catch { /* fallback to auto */ }

      const requestBalance = (cluster: Cluster | 'auto') => {
        const params = new URLSearchParams({ address: connectedWalletAddress, cluster })
        return fetch(`/api/wallet/balance?${params.toString()}`, { cache: 'no-store' })
      }

      let response = await requestBalance(preferredCluster)
      let data = (await response.json()) as { ok: boolean; sol?: number }
      if ((!response.ok || !data.ok) && preferredCluster !== 'auto') {
        response = await requestBalance('auto')
        data = (await response.json()) as { ok: boolean; sol?: number }
      }
      setRealSolBalance(data.ok && data.sol !== undefined ? data.sol : null)
    } catch {
      setRealSolBalance(null)
    } finally {
      setIsSolLoading(false)
    }
  }

  useEffect(() => {
    fetchSolBalance()
  }, [wallet.connected, connectedWalletAddress])

  const totalHerdSize = herds.reduce((sum, herd) => sum + herd.herdSize, 0)
  const totalTokens = herds.reduce((sum, herd) => sum + herd.totalTokens, 0)
  const averageNav = herds.reduce((sum, herd) => sum + herd.navPerTokenUsd, 0) / herds.length
  const topListings = [...listings].sort((left, right) => left.pricePerTokenUsd - right.pricePerTokenUsd).slice(0, 3)
  const latestSales = sales.slice(0, 3)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.12),_transparent_35%),linear-gradient(135deg,rgba(16,24,40,0.98),rgba(12,74,110,0.9))] px-6 py-10 text-white shadow-2xl sm:px-10">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18),_transparent_60%)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/80">
              <Sparkles className="h-4 w-4" />
              SPL herd pools on Solana with real-time dividend routing
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                Tokenize herd ownership, trade it peer-to-peer, and stream cow-sale dividends to wallets.
              </h1>
              <p className="max-w-2xl text-base text-white/75 sm:text-lg">
                CowFi models a Solana herd pool where each SPL token is a fractional claim on a cow collective. Buy at NAV, fill market orders above or below NAV, and claim dividends the moment the farm exits livestock.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-white text-slate-950 hover:bg-white/90" asChild>
                <Link href="/marketplace">Open Marketplace</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
                <Link href="/portfolio">View Portfolio</Link>
              </Button>
            </div>
          </div>

          <Card className="border-white/15 bg-white/10 text-white shadow-none backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl">Wallet Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                <span>Status</span>
                <span className="font-semibold text-white">
                  {wallet.connected ? `${wallet.provider} connected` : 'Wallet disconnected'}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Address</p>
                  <p className="mt-2 font-medium text-white">{shortenWallet(wallet.walletAddress)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Pending dividends</p>
                  <p className="mt-2 font-medium text-white">{formatCurrency(portfolioSummary.pendingDividendsUsd)}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">SOL balance</p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {isSolLoading ? 'Loading...' : realSolBalance !== null ? `${realSolBalance.toFixed(4)} SOL` : wallet.connected ? 'Unavailable' : '—'}
                </p>
                {wallet.connected && (
                  <button
                    onClick={fetchSolBalance}
                    disabled={isSolLoading}
                    className="mt-2 flex items-center gap-1 text-xs text-white/50 hover:text-white/80 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Refresh
                  </button>
                )}
              </div>
              <Button
                className="w-full bg-primary text-primary-foreground"
                onClick={() => claimDividends(wallet.preferredDividendCurrency)}
                disabled={!wallet.connected || portfolioSummary.pendingDividendsUsd <= 0}
              >
                Claim Pending Dividends
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Herd Size"
          value={`${formatNumber(totalHerdSize)} cows`}
          change="Across tokenized pools"
          changeType="neutral"
          icon={Users}
        />
        <StatCard
          title="Total Token Supply"
          value={formatNumber(totalTokens)}
          change="SPL herd shares minted"
          changeType="neutral"
          icon={Coins}
        />
        <StatCard
          title="Average NAV"
          value={formatCurrency(averageNav)}
          change="Blended platform entry price"
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Your Token Balance"
          value={formatNumber(portfolioSummary.totalTokensOwned)}
          change={wallet.connected ? 'Tracked from connected wallet' : 'Connect wallet to trade and claim'}
          changeType={wallet.connected ? 'positive' : 'neutral'}
          icon={Wallet}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Live Herd Pools</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Buy directly at NAV or inspect order book liquidity on each pool.
              </p>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/marketplace">
                Full order book
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {herds.map((herd) => (
                <HerdCard key={herd.id} herd={herd} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Best Market Offers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {topListings.map((listing) => {
                const herd = herds.find((item) => item.id === listing.herdId)
                return (
                  <div key={listing.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{listing.herdName}</p>
                        <p className="text-sm text-muted-foreground">Seller {shortenWallet(listing.sellerWallet)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(listing.pricePerTokenUsd)}</p>
                        <p className="text-xs text-muted-foreground">NAV {formatCurrency(herd?.navPerTokenUsd ?? 0)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatNumber(listing.tokensAvailable)} tokens available</span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/herd/${listing.herdId}`}>Buy</Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest Cow Sales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestSales.map((sale) => (
                <div key={sale.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{sale.herdName}</p>
                      <p className="text-sm text-muted-foreground">
                        {sale.cowTag} sold and routed to token holders
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(sale.salePriceUsd)}</p>
                      <p className="text-xs text-muted-foreground">{sale.settlementCurrency} payout</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-card p-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Coins className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">NAV Minting</h3>
            <p className="text-sm text-muted-foreground">
              Platform inventory is minted against herd NAV so each SPL share maps to a fractional claim on the pool.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">Dividend Streaming</h3>
            <p className="text-sm text-muted-foreground">
              Sold cows distribute proceeds pro-rata to holders and only nudge NAV down slightly to reflect lower herd inventory.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">P2P Matching</h3>
            <p className="text-sm text-muted-foreground">
              Buyers settle in SOL while the listing engine transfers herd tokens in the same workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
