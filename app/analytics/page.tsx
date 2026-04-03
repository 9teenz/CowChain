'use client'

import { Users, DollarSign, TrendingUp, Wallet, Coins, GitBranch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/stat-card'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { useDemoState } from '@/components/demo-state-provider'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function AnalyticsPage() {
  const {
    state: { platform, herds, listings, sales, positions, transactions },
  } = useDemoState()

  const navVsMarketData = herds.map((herd) => ({
    herd: herd.name.split(' ')[0],
    nav: platform.navPerTokenUsd,
    market: herd.marketPriceUsd,
  }))

  const dividendData = herds.map((herd) => ({
    herd: herd.name.split(' ')[0],
    distributed: herd.totalDividendsDistributedUsd,
  }))

  const totalValueLocked = herds.reduce((sum, herd) => sum + herd.totalValueUsd, 0)
  const totalInvestors = positions.length + 412
  const averageYield = herds.reduce((sum, herd) => sum + herd.projectedYieldPct, 0) / herds.length

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor NAV spreads, dividend throughput, and the ledger mechanics backing the Solana herd token demo.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Cows"
          value={formatNumber(herds.reduce((sum, herd) => sum + herd.herdSize, 0))}
          change="Across on-chain pools"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Total Value Locked"
          value={formatCurrency(totalValueLocked)}
          change="Asset-backed herd NAV"
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Average Yield"
          value={`${averageYield.toFixed(1)}%`}
          change="Across all token pools"
          changeType="neutral"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Investors"
          value={formatNumber(totalInvestors)}
          change="Wallets with open positions"
          changeType="positive"
          icon={Wallet}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>NAV vs Market Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={navVsMarketData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="herd" tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Price']}
                  />
                  <Legend />
                  <Bar dataKey="nav" name="NAV" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="market" name="Market" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dividends Distributed By Herd</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dividendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="herd" tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Distributed']}
                  />
                  <Bar dataKey="distributed" fill="var(--color-chart-3)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>On-chain Mechanics Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <Coins className="h-5 w-5 text-primary" />
                SPL Minting
              </div>
              <p className="text-sm text-muted-foreground">
                Direct buys mint herd tokens at NAV while reducing platform inventory. Portfolio balances update immediately for the connected wallet.
              </p>
            </div>
            <div className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <GitBranch className="h-5 w-5 text-primary" />
                Dividend Ledger
              </div>
              <p className="text-sm text-muted-foreground">
                Each cow sale appends a dividend event and allocates pending payouts by the formula tokens_owned / total_tokens * sale_price.
              </p>
            </div>
            <div className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <Wallet className="h-5 w-5 text-primary" />
                Matching Engine
              </div>
              <p className="text-sm text-muted-foreground">
                Marketplace fills consume listings, settle SOL from buyer to seller, and transfer herd shares to the buyer in one logical trade flow.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Book Depth</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(listings.reduce((sum, listing) => sum + listing.tokensAvailable, 0))}</p>
            <p className="mt-1 text-sm text-muted-foreground">tokens available across active listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dividend Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(sales.length)}</p>
            <p className="mt-1 text-sm text-muted-foreground">sold-cow distributions recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatNumber(transactions.length)}</p>
            <p className="mt-1 text-sm text-muted-foreground">wallet and matching actions retained in activity log</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
