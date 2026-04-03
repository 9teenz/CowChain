'use client'

import Link from 'next/link'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Coins, DollarSign, ExternalLink, LineChart, Wallet } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDemoState } from '@/components/demo-state-provider'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function PortfolioPage() {
  const {
    state: { herds, positions, transactions, portfolioValueSeries, dividendSeries, wallet, platform },
    portfolioSummary,
    claimDividends,
  } = useDemoState()
  const { requireAuth } = useAuthGuard()

  const totalInvested = positions.reduce((sum, item) => sum + item.tokensOwned * item.averageCostUsd, 0)
  const roi = totalInvested === 0 ? 0 : ((portfolioSummary.marketValueUsd - totalInvested) / totalInvested) * 100

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Portfolio Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Track token balances, herd-share exposure, and dividends earned across all herd pools.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="PlatformToken Balance"
          value={formatNumber(portfolioSummary.userPlatformTokens)}
          change="Across all herd pools"
          changeType="neutral"
          icon={Coins}
        />
        <StatCard
          title="Total Herd Shares"
          value={`${portfolioSummary.totalHerdShares.toFixed(2)} cows`}
          change="Fractional cattle exposure"
          changeType="neutral"
          icon={Wallet}
        />
        <StatCard
          title="Current NAV"
          value={formatCurrency(portfolioSummary.currentNavValueUsd)}
          change="Blended NAV valuation"
          changeType="neutral"
          icon={DollarSign}
        />
        <StatCard
          title="Market Value"
          value={formatCurrency(portfolioSummary.marketValueUsd)}
          change={`${roi > 0 ? '+' : ''}${roi.toFixed(2)}% total return`}
          changeType={roi >= 0 ? 'positive' : 'negative'}
          icon={LineChart}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={portfolioValueSeries}>
                  <defs>
                    <linearGradient id="portfolioArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="period" tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Portfolio']} />
                  <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="url(#portfolioArea)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dividends Earned Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dividendSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="period" tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Dividends']} />
                  <Bar dataKey="value" fill="var(--color-chart-2)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Your Herd Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Herd</th>
                    <th className="pb-3 font-medium">Tokens</th>
                    <th className="pb-3 font-medium">Listed</th>
                    <th className="pb-3 font-medium">Share</th>
                    <th className="pb-3 font-medium">Pending dividends</th>
                    <th className="pb-3 font-medium">Market value</th>
                    <th className="pb-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => {
                    const herd = herds.find((item) => item.id === position.herdId)
                    const share = herd ? (position.tokensOwned / platform.totalSupply) * 100 : 0
                    const marketValue = herd ? position.tokensOwned * herd.marketPriceUsd : 0

                    return (
                      <tr key={position.herdId} className="border-b border-border last:border-0">
                        <td className="py-4 font-medium">{position.herdName}</td>
                        <td className="py-4">{formatNumber(position.tokensOwned)}</td>
                        <td className="py-4">{formatNumber(position.listedTokens)}</td>
                        <td className="py-4">{share.toFixed(2)}%</td>
                        <td className="py-4 text-primary">{formatCurrency(position.pendingDividendsUsd)}</td>
                        <td className="py-4">{formatCurrency(marketValue)}</td>
                        <td className="py-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/herd/${position.herdId}`}>
                              View <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dividend Claim Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">Pending dividends</p>
              <p className="mt-2 text-3xl font-bold text-primary">{formatCurrency(portfolioSummary.pendingDividendsUsd)}</p>
              <p className="mt-2 text-sm text-muted-foreground">Default payout currency: {wallet.preferredDividendCurrency}</p>
            </div>
            <Button
              className="w-full"
              onClick={() => requireAuth(() => claimDividends(wallet.preferredDividendCurrency))}
              disabled={portfolioSummary.pendingDividendsUsd <= 0}
            >
              Claim dividends
            </Button>
            <div className="space-y-3 text-sm">
              {transactions.slice(0, 4).map((transaction) => (
                <div key={transaction.id} className="rounded-xl border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{transaction.label}</span>
                    <span>{formatCurrency(transaction.amountUsd)}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{new Date(transaction.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
