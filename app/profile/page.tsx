'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Award, Calendar, Check, Coins, Copy, PieChart, RefreshCw, Unlink, Wallet } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDemoState } from '@/components/demo-state-provider'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { shortenWallet } from '@/lib/solana-contract'
import { formatCurrency, formatNumber } from '@/lib/utils'

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet'

type PhantomRequestProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}

function isCluster(value: unknown): value is Cluster {
  return value === 'mainnet-beta' || value === 'devnet' || value === 'testnet'
}

export default function ProfilePage() {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)
  const [phantomSolBalance, setPhantomSolBalance] = useState<number | null>(null)
  const [isSolBalanceLoading, setIsSolBalanceLoading] = useState(false)
  const [solBalanceStatus, setSolBalanceStatus] = useState<string>('Live balance')
  const [kindFilter, setKindFilter] = useState<'all' | 'nav-buy' | 'market-buy' | 'listing' | 'claim' | 'cow-sale'>('all')
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'SOL' | 'USDC'>('all')
  const {
    state: { wallet, positions, transactions },
    portfolioSummary,
    claimDividends,
    disconnectWallet,
  } = useDemoState()
  const { data: session, update: updateSession } = useSession()
  const { requireAuth } = useAuthGuard()

  const fullName = session?.user?.name || 'Unnamed user'
  const email = session?.user?.email || 'No email'
  const connectedWalletAddress = wallet.connected ? wallet.walletAddress : ''
  const displayedSolBalance = phantomSolBalance

  const fetchSolBalance = async () => {
    if (!wallet.connected || !connectedWalletAddress) {
      setPhantomSolBalance(null)
      setSolBalanceStatus('Connect wallet to load balance')
      return
    }

    setIsSolBalanceLoading(true)
    setSolBalanceStatus('Refreshing balance...')

    try {
      let preferredCluster: Cluster | 'auto' = 'auto'
      try {
        const provider = (window as Window & { solana?: PhantomRequestProvider }).solana
        const providerCluster = await provider?.request?.({ method: 'getCluster' })
        if (isCluster(providerCluster)) {
          preferredCluster = providerCluster
        }
      } catch {
        // Fallback to auto if provider cluster is unavailable.
      }

      const requestBalance = async (cluster: Cluster | 'auto') => {
        const params = new URLSearchParams({ address: connectedWalletAddress, cluster })
        return fetch(`/api/wallet/balance?${params.toString()}`, { cache: 'no-store' })
      }

      const parseBalanceResponse = async (response: Response) => {
        return (await response.json()) as
          | {
              ok: true
              sol: number
              cluster: string
            }
          | {
              ok: false
              error?: string
            }
      }

      let response = await requestBalance(preferredCluster)
      let finalData = await parseBalanceResponse(response)

      // If an explicit provider cluster fails, retry with auto cluster fallback.
      if ((!response.ok || !finalData.ok) && preferredCluster !== 'auto') {
        response = await requestBalance('auto')
        finalData = await parseBalanceResponse(response)
      }

      if (!response.ok || !finalData.ok) {
        setPhantomSolBalance(null)
        setSolBalanceStatus(finalData.ok ? 'Failed to refresh balance' : finalData.error || 'Failed to refresh balance')
        return
      }

      setPhantomSolBalance(finalData.sol)
      setSolBalanceStatus(`Live balance (${finalData.cluster})`)
    } catch {
      setPhantomSolBalance(null)
      setSolBalanceStatus('Failed to refresh balance')
    } finally {
      setIsSolBalanceLoading(false)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        return
      }

      const data = (await response.json()) as { createdAt?: string }
      setCreatedAt(data.createdAt || null)
    }

    loadProfile()
  }, [])

  useEffect(() => {
    if (!wallet.connected || !connectedWalletAddress) {
      setPhantomSolBalance(null)
      return
    }

    fetchSolBalance()
  }, [wallet.connected, connectedWalletAddress])

  const copyAddress = async () => {
    if (!connectedWalletAddress) {
      return
    }

    await navigator.clipboard.writeText(connectedWalletAddress)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    disconnectWallet()
    await signOut({ callbackUrl: '/login' })
  }

  const handleUnlinkWallet = async () => {
    setIsUnlinking(true)
    try {
      await fetch('/api/wallet/link', { method: 'DELETE' })
    } finally {
      disconnectWallet()
      setIsUnlinking(false)
      await updateSession()
    }
  }

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesKind = kindFilter === 'all' || transaction.kind === kindFilter
    const matchesCurrency = currencyFilter === 'all' || transaction.currency === currencyFilter
    return matchesKind && matchesCurrency
  })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-3xl font-bold">{fullName.slice(0, 2).toUpperCase()}</span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">
                    {connectedWalletAddress ? shortenWallet(connectedWalletAddress) : 'Wallet not connected'}
                  </span>
                  <button
                    onClick={copyAddress}
                    disabled={!connectedWalletAddress}
                    className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Award className="h-3 w-3" />
                  {wallet.connected ? `${wallet.provider} connected` : 'Disconnected'}
                </div>
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="rounded-lg border border-border px-3 py-2 sm:col-span-2">
                  <p className="font-medium text-foreground">{fullName}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Registered {createdAt ? new Date(createdAt).toLocaleDateString() : 'recently'}
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

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => requireAuth(() => claimDividends(wallet.preferredDividendCurrency))}>
                Claim Earnings
              </Button>
              {wallet.connected && (
                <Button variant="outline" onClick={handleUnlinkWallet} disabled={isUnlinking}>
                  <Unlink className="mr-2 h-4 w-4" />
                  {isUnlinking ? 'Unlinking...' : 'Unlink Wallet'}
                </Button>
              )}
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">SOL Balance</p>
                <p className="text-2xl font-bold">
                  {displayedSolBalance !== null ? `${displayedSolBalance.toFixed(4)} SOL` : 'Unavailable'}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchSolBalance}
                  disabled={!wallet.connected || isSolBalanceLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isSolBalanceLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
                <p className="text-xs text-muted-foreground">{solBalanceStatus}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All types</option>
              <option value="nav-buy">NAV Buy</option>
              <option value="market-buy">Market Buy</option>
              <option value="listing">Listing</option>
              <option value="claim">Claim</option>
              <option value="cow-sale">Cow Sale</option>
            </select>

            <select
              value={currencyFilter}
              onChange={(event) => setCurrencyFilter(event.target.value as typeof currencyFilter)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All currencies</option>
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>

            <Button
              variant="outline"
              onClick={() => {
                setKindFilter('all')
                setCurrencyFilter('all')
              }}
            >
              Reset filters
            </Button>
          </div>

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
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border last:border-0">
                    <td className="py-4 font-medium">{transaction.label}</td>
                    <td className="py-4">{formatCurrency(transaction.amountUsd)}</td>
                    <td className="py-4">{transaction.currency}</td>
                    <td className="py-4 font-mono text-muted-foreground">{shortenWallet(transaction.txId)}</td>
                    <td className="py-4 text-muted-foreground">{new Date(transaction.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td className="py-6 text-center text-muted-foreground" colSpan={5}>
                      No transactions match selected filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
