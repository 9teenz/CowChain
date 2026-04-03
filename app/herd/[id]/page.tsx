'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, Droplets, MapPin, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getAvailableTokens, useDemoState } from '@/components/demo-state-provider'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { listingPremiumPct, shortenWallet } from '@/lib/solana-contract'
import { PLATFORM_TOKEN_SYMBOL } from '@/lib/demo-data'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function HerdDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const {
    state: { herds, positions, listings, sales, platform },
    buyAtNav,
    listTokens,
    buyListing,
    simulateCowSale,
  } = useDemoState()

  const [tokenAmount, setTokenAmount] = useState('500')
  const [listingAmount, setListingAmount] = useState('250')
  const [listingPrice, setListingPrice] = useState('1.12')
  const [salePrice, setSalePrice] = useState('1450')
  const [purchaseCurrency, setPurchaseCurrency] = useState<'SOL' | 'USDC'>('USDC')
  const [feedback, setFeedback] = useState<string | null>(null)
  const { requireAuth } = useAuthGuard()

  const herd = herds.find((item) => item.id === id)
  const position = positions.find((item) => item.herdId === id)
  const herdListings = listings.filter((item) => item.herdId === id)
  const herdSales = sales.filter((item) => item.herdId === id)

  const estimatedEarnings = useMemo(() => {
    if (!herd) {
      return 0
    }

    const tokens = Number(tokenAmount) || 0
    const sharePercent = tokens / platform.totalSupply
    return herd.expectedAnnualRevenueUsd * 0.12 * sharePercent
  }, [herd, tokenAmount, platform.totalSupply])

  if (!herd) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Herd not found</h1>
          <p className="mt-2 text-muted-foreground">The herd you&apos;re looking for doesn&apos;t exist.</p>
          <Button asChild className="mt-4">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const handleNavBuy = () => {
    requireAuth(() => {
      const result = buyAtNav(herd.id, Number(tokenAmount), purchaseCurrency)
      setFeedback(result.message)
    })
  }

  const handleList = () => {
    requireAuth(() => {
      const result = listTokens(herd.id, Number(listingAmount), Number(listingPrice))
      setFeedback(result.message)
    })
  }

  const handleSaleSimulation = () => {
    requireAuth(() => {
      const result = simulateCowSale(herd.id, Number(salePrice), purchaseCurrency)
      setFeedback(result.message)
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="mb-8 flex flex-col gap-6 rounded-3xl border border-border bg-card/70 p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{herd.name}</h1>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{herd.healthStatus}</div>
            <div className="rounded-full border border-border px-3 py-1 text-sm font-medium text-muted-foreground">{PLATFORM_TOKEN_SYMBOL}</div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {herd.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="h-4 w-4" />
              Herd size {herd.herdSize}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Droplets className="h-4 w-4" />
              {formatNumber(herd.milkProductionLitersPerDay)} L/day
            </span>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{herd.description}</p>
        </div>

        <div className="grid min-w-[280px] gap-3 sm:grid-cols-2 lg:w-[360px]">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">Token price (NAV)</p>
            <p className="mt-2 text-3xl font-bold text-primary">{formatCurrency(platform.navPerTokenUsd)}</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm text-muted-foreground">Market price</p>
            <p className="mt-2 text-3xl font-bold">{formatCurrency(herd.marketPriceUsd)}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {listingPremiumPct(herd.marketPriceUsd, platform.navPerTokenUsd) > 0 ? '+' : ''}
              {listingPremiumPct(herd.marketPriceUsd, platform.navPerTokenUsd)}% vs NAV
            </p>
          </div>
        </div>
      </div>

      {feedback ? (
        <div className="mb-6 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {feedback}
        </div>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total herd size</p>
            <p className="mt-2 text-2xl font-bold">{herd.herdSize}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Platform token supply</p>
            <p className="mt-2 text-2xl font-bold">{formatNumber(platform.totalSupply)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Available at NAV</p>
            <p className="mt-2 text-2xl font-bold">{formatNumber(platform.availableTokens)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Your balance</p>
            <p className="mt-2 text-2xl font-bold">{formatNumber(position?.tokensOwned ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Herd Fundamentals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Herd age</p>
                  <p className="mt-2 text-2xl font-bold">{herd.herdAgeMonths} mo</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Milk production</p>
                  <p className="mt-2 text-2xl font-bold">{formatNumber(herd.milkProductionLitersPerDay)}L</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Expected revenue</p>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(herd.expectedAnnualRevenueUsd)}</p>
                </div>
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-sm text-muted-foreground">Dividends paid</p>
                  <p className="mt-2 text-2xl font-bold">{formatCurrency(herd.totalDividendsDistributedUsd)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>NAV Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={herdSales
                        .slice()
                        .reverse()
                        .map((sale) => ({
                          period: new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'short' }),
                          nav: sale.navAfterUsd,
                        }))}
                    >
                      <defs>
                        <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="period" tick={{ fill: 'var(--color-muted-foreground)' }} />
                      <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'NAV']} />
                      <Area type="monotone" dataKey="nav" stroke="var(--color-primary)" fill="url(#navGradient)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dividend Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={herdSales
                        .slice()
                        .reverse()
                        .map((sale) => ({
                          period: new Date(sale.saleDate).toLocaleDateString('en-US', { month: 'short' }),
                          dividends: sale.salePriceUsd,
                        }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="period" tick={{ fill: 'var(--color-muted-foreground)' }} />
                      <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Distributed']} />
                      <Bar dataKey="dividends" fill="var(--color-chart-2)" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sold Cows and Dividend History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Cow</th>
                      <th className="pb-3 font-medium">Sale price</th>
                      <th className="pb-3 font-medium">Dividend / token</th>
                      <th className="pb-3 font-medium">NAV move</th>
                      <th className="pb-3 font-medium">Settlement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {herdSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-border last:border-0">
                        <td className="py-4 font-medium">{sale.cowTag}</td>
                        <td className="py-4">{formatCurrency(sale.salePriceUsd)}</td>
                        <td className="py-4">{formatCurrency(sale.dividendPerTokenUsd)}</td>
                        <td className="py-4">
                          {formatCurrency(sale.navBeforeUsd)} to {formatCurrency(sale.navAfterUsd)}
                        </td>
                        <td className="py-4">{sale.settlementCurrency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Buy From Platform</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Token amount</label>
                <Input value={tokenAmount} onChange={(event) => setTokenAmount(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Settlement currency</label>
                <select
                  value={purchaseCurrency}
                  onChange={(event) => setPurchaseCurrency(event.target.value as 'SOL' | 'USDC')}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="USDC">USDC</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm text-muted-foreground">Estimated annual dividend stream</p>
                <p className="mt-2 text-3xl font-bold text-primary">{formatCurrency(estimatedEarnings)}</p>
                <p className="mt-2 text-sm text-muted-foreground">Cost at NAV: {formatCurrency((Number(tokenAmount) || 0) * platform.navPerTokenUsd)}</p>
              </div>
              <Button className="w-full" onClick={handleNavBuy}>
                Buy PlatformToken at NAV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>List Tokens on Marketplace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Tokens to list</label>
                  <Input value={listingAmount} onChange={(event) => setListingAmount(event.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Price per token</label>
                  <Input value={listingPrice} onChange={(event) => setListingPrice(event.target.value)} />
                </div>
              </div>
              <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
                Unlocked tokens available to list: {formatNumber(getAvailableTokens(position))}
              </div>
              <Button className="w-full" variant="outline" onClick={handleList}>
                Post sell order
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketplace Order Book</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {herdListings.map((listing) => (
                <div key={listing.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{formatNumber(listing.tokensAvailable)} tokens</p>
                      <p className="text-sm text-muted-foreground">Seller {shortenWallet(listing.sellerWallet)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(listing.pricePerTokenUsd)}</p>
                      <p className="text-sm text-muted-foreground">per token</p>
                    </div>
                  </div>
                  <Button
                    className="mt-4 w-full"
                    variant="secondary"
                    onClick={() => setFeedback(buyListing(listing.id, Math.min(250, listing.tokensAvailable)).message)}
                  >
                    Buy from market
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Simulate Cow Sale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Cow sale price</label>
                <Input value={salePrice} onChange={(event) => setSalePrice(event.target.value)} />
              </div>
              <div className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
                Variant 2 payout: sale revenue is distributed proportionally to token holders, while NAV decreases only slightly.
              </div>
              <Button className="w-full" variant="outline" onClick={handleSaleSimulation}>
                Distribute dividends on-chain
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
