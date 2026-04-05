'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HerdCard } from '@/components/herd-card'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDemoState } from '@/components/demo-state-provider'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { shortenWallet } from '@/lib/solana-contract'
import { Wallet, TrendingUp, Coins, Users, Sparkles } from 'lucide-react'

type TokenSupplyResponse = {
  ok?: boolean
  amount?: number
  cluster?: string
  error?: string
}

export default function DashboardPage() {
  const {
    state: { herds, listings, sales, wallet, platform },
    portfolioSummary,
    claimDividends,
  } = useDemoState()
  const [liveTotalTokens, setLiveTotalTokens] = useState(platform.totalSupply)
  const [tokenSupplyLabel, setTokenSupplyLabel] = useState('Loading live CowChain supply...')

  useEffect(() => {
    let isMounted = true

    const fetchTokenSupply = async () => {
      setTokenSupplyLabel('Loading live CowChain supply...')

      try {
        const params = new URLSearchParams()

        if (platform.mint) {
          params.set('mint', platform.mint)
        }

        if (platform.symbol) {
          params.set('symbol', platform.symbol)
        }

        const response = await fetch(`/api/token-supply?${params.toString()}`, { cache: 'no-store' })
        const data = (await response.json()) as TokenSupplyResponse

        if (!isMounted) {
          return
        }

        if (!response.ok || !data.ok || typeof data.amount !== 'number') {
          setLiveTotalTokens(platform.totalSupply)
          setTokenSupplyLabel(data.error || 'Using cached CowChain supply')
          return
        }

        setLiveTotalTokens(data.amount)
        setTokenSupplyLabel(`Live on-chain supply · ${data.cluster || 'RPC'}`)
      } catch {
        if (!isMounted) {
          return
        }

        setLiveTotalTokens(platform.totalSupply)
        setTokenSupplyLabel('Using cached CowChain supply')
      }
    }

    void fetchTokenSupply()

    return () => {
      isMounted = false
    }
  }, [platform.mint, platform.symbol, platform.totalSupply])

  const totalHerdSize = herds.reduce((sum, herd) => sum + herd.herdSize, 0)
  const totalTokens = liveTotalTokens
  const averageNav = platform.navPerTokenUsd
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
                CowChain models a Solana herd pool where each SPL token is a fractional claim on a cow collective. Buy CowChain tokens, fill market orders, and claim dividends the moment the farm exits livestock.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
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
                  <p className="mt-2 font-medium text-white">{wallet.connected ? shortenWallet(wallet.walletAddress) : '—'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">Pending dividends</p>
                  <p className="mt-2 font-medium text-white">{wallet.connected ? formatCurrency(portfolioSummary.pendingDividendsUsd) : '—'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">Your Token Balance</p>
                <p className="mt-2 text-2xl font-bold text-white">{wallet.connected ? formatNumber(portfolioSummary.userPlatformTokens) : '—'}</p>
                <p className="mt-1 text-xs text-white/50">{wallet.connected ? 'CowChain tokens' : 'Connect wallet to view'}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-white text-slate-950 hover:bg-white/90"
                  asChild
                >
                  <Link href="/marketplace">Buy CowChain Token</Link>
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={() => claimDividends(wallet.preferredDividendCurrency)}
                  disabled={!wallet.connected || portfolioSummary.pendingDividendsUsd <= 0}
                >
                  Claim Pending Dividends
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Herd Size"
          value={`${formatNumber(totalHerdSize)} cows`}
          change="Across tokenized pools"
          changeType="neutral"
          icon={Users}
        />
        <StatCard
          title="Platform Token Supply"
          value={formatNumber(totalTokens)}
          change={tokenSupplyLabel}
          changeType="neutral"
          icon={Coins}
        />
        <StatCard
          title="CowChain Price"
          value={formatCurrency(averageNav)}
          change="CowChain token price"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Partners</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Tokenized herd pools participating in the platform.
              </p>
            </div>
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
                        <p className="text-xs text-muted-foreground">CowChain {formatCurrency(platform.navPerTokenUsd)}</p>
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
