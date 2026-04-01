'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Award, Calendar, Check, Coins, Copy, PieChart, TrendingUp, Wallet } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDemoState } from '@/components/demo-state-provider'
import { shortenWallet } from '@/lib/solana-contract'
import { formatCurrency, formatNumber } from '@/lib/utils'

export default function ProfilePage() {
  const [copied, setCopied] = useState(false)
  const {
    state: { wallet, positions, herds, transactions },
    portfolioSummary,
    claimDividends,
    disconnectWallet,
    setPreferredDividendCurrency,
  } = useDemoState()

  const copyAddress = async () => {
    await navigator.clipboard.writeText(wallet.walletAddress)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-3xl font-bold">{wallet.walletAddress.slice(0, 2).toUpperCase()}</span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{shortenWallet(wallet.walletAddress)}</span>
                  <button onClick={copyAddress} className="text-muted-foreground transition-colors hover:text-foreground">
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Award className="h-3 w-3" />
                  {wallet.connected ? `${wallet.provider} connected` : 'Disconnected'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Demo wallet profile
                </span>
                <span className="flex items-center gap-1">
                  <PieChart className="h-4 w-4" />
                  {positions.length} herds invested
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="h-4 w-4" />
                  {formatNumber(portfolioSummary.totalTokensOwned)} tokens owned
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => claimDividends(wallet.preferredDividendCurrency)}>
                Claim Earnings
              </Button>
              <Button variant="destructive" onClick={disconnectWallet}>
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="SOL Balance"
          value={`${wallet.solBalance.toFixed(2)} SOL`}
          change="Wallet settlement balance"
          changeType="neutral"
          icon={Wallet}
        />
        <StatCard
          title="Stablecoin Balance"
          value={formatCurrency(wallet.stablecoinBalance)}
          change="USDC treasury balance"
          changeType="neutral"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Dividends Earned"
          value={formatCurrency(portfolioSummary.totalDividendsEarnedUsd)}
          change="Claimed + pending"
          changeType="positive"
          icon={Coins}
        />
        <StatCard
          title="Pending Dividends"
          value={formatCurrency(portfolioSummary.pendingDividendsUsd)}
          change="Ready to claim"
          changeType="positive"
          icon={Award}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Wallet Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Preferred dividend currency</label>
              <select
                value={wallet.preferredDividendCurrency}
                onChange={(event) => setPreferredDividendCurrency(event.target.value as 'SOL' | 'USDC')}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="USDC">USDC</option>
                <option value="SOL">SOL</option>
              </select>
            </div>

            <div className="rounded-2xl border border-border p-4">
              <p className="text-sm text-muted-foreground">Next claimable amount</p>
              <p className="mt-2 text-3xl font-bold text-primary">{formatCurrency(portfolioSummary.pendingDividendsUsd)}</p>
            </div>

            <Button className="w-full" onClick={() => claimDividends(wallet.preferredDividendCurrency)}>
              Claim to wallet
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <Link href="/marketplace">Open marketplace</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Token Positions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {positions.map((position) => {
              const herd = herds.find((item) => item.id === position.herdId)
              const marketValue = (herd?.marketPriceUsd ?? 0) * position.tokensOwned

              return (
                <div key={position.herdId} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{position.herdName}</p>
                      <p className="text-sm text-muted-foreground">{formatNumber(position.tokensOwned)} tokens</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Market value</p>
                      <p className="font-semibold text-foreground">{formatCurrency(marketValue)}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Currency</th>
                  <th className="pb-3 font-medium">Transaction</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border last:border-0">
                    <td className="py-4 font-medium">{transaction.label}</td>
                    <td className="py-4">{formatCurrency(transaction.amountUsd)}</td>
                    <td className="py-4">{transaction.currency}</td>
                    <td className="py-4 font-mono text-muted-foreground">{shortenWallet(transaction.txId)}</td>
                    <td className="py-4 text-muted-foreground">{new Date(transaction.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
