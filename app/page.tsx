'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardBuyPanel } from '@/components/dashboard-buy-panel'
import { HerdCard } from '@/components/herd-card'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDemoState } from '@/components/demo-state-provider'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { shortenWallet } from '@/lib/solana-contract'
import { Wallet, TrendingUp, Coins, Users, Sparkles, Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/hooks/use-toast'

type TokenSupplyResponse = {
  ok?: boolean
  amount?: number
  cluster?: string
  error?: string
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const {
    state: { herds, sales, wallet, platform },
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
  const latestSales = sales.slice(0, 3)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.12),_transparent_35%),linear-gradient(135deg,rgba(16,24,40,0.98),rgba(12,74,110,0.9))] px-6 py-10 text-white shadow-2xl sm:px-10">
        <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18),_transparent_60%)] lg:block" />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/80">
              <Sparkles className="h-4 w-4" />
              {t('dashboard.subtitle')}
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
                {t('dashboard.title')}
              </h1>
              <p className="max-w-2xl text-base text-white/75 sm:text-lg">
                {t('dashboard.description')}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
                <Link href="/marketplace">{t('dashboard.openMarketplace')}</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" asChild>
                <Link href="/portfolio">{t('dashboard.viewPortfolio')}</Link>
              </Button>
            </div>
          </div>

          <Card className="border-white/15 bg-white/10 text-white shadow-none backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl">{t('dashboard.walletSnapshot')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-white/80">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                <span>{t('dashboard.status')}</span>
                <span className="font-semibold text-white">
                  {wallet.connected ? t('dashboard.walletConnected', { provider: wallet.provider }) : t('dashboard.walletDisconnected')}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">{t('dashboard.address')}</p>
                  <p className="mt-2 font-medium text-white">{wallet.connected ? shortenWallet(wallet.walletAddress) : '—'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/55">{t('dashboard.pendingDividends')}</p>
                  <p className="mt-2 font-medium text-white">{wallet.connected ? formatCurrency(portfolioSummary.pendingDividendsUsd) : '—'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/55">{t('dashboard.yourTokenBalance')}</p>
                <p className="mt-2 text-2xl font-bold text-white">{wallet.connected ? formatNumber(portfolioSummary.userPlatformTokens) : '—'}</p>
                <p className="mt-1 text-xs text-white/50">{wallet.connected ? t('dashboard.cowchainTokenPrice', 'CowChain tokens') : t('dashboard.connectWalletToView')}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-white text-slate-950 hover:bg-white/90"
                  asChild
                >
                  <Link href="#buy-cowchain">{t('dashboard.buyCowchainToken')}</Link>
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground"
                  onClick={async () => {
                    const result = await claimDividends(wallet.preferredDividendCurrency)
                    toast({ title: result.ok ? 'Дивиденды выплачены' : 'Ошибка', description: result.message, variant: result.ok ? 'default' : 'destructive' })
                  }}
                  disabled={!wallet.connected || portfolioSummary.pendingDividendsUsd <= 0}
                >
                  {t('dashboard.claimPendingDividends')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={t('dashboard.totalHerdSize')}
          value={`${formatNumber(totalHerdSize)} ${t('dashboard.cows')}`}
          change={t('dashboard.acrossTokenizedPools')}
          changeType="neutral"
          icon={Users}
        />
        <StatCard
          title={t('dashboard.platformTokenSupply')}
          value={formatNumber(totalTokens)}
          change={tokenSupplyLabel}
          changeType="neutral"
          icon={Coins}
        />
        <StatCard
          title={t('dashboard.cowchainPrice')}
          value={formatCurrency(averageNav)}
          change={t('dashboard.cowchainTokenPrice')}
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      <div id="buy-cowchain" className="mt-10">
        <DashboardBuyPanel />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t('dashboard.partners')}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('dashboard.partnersDesc')}
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
              <CardTitle>{t('dashboard.bestMarketOffers')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Construction className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-semibold text-muted-foreground">
                {t('marketplace.temporarilyUnavailable')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.latestCowSales')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestSales.map((sale) => (
                <div key={sale.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold">{t(`herds.${sale.herdId}.name`, sale.herdName)}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('dashboard.soldAndRouted', { tag: sale.cowTag })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(sale.salePriceUsd)}</p>
                      <p className="text-xs text-muted-foreground">{t('dashboard.payout', { currency: sale.settlementCurrency })}</p>
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
            <h3 className="mb-2 font-semibold">{t('features.navMinting')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('features.navMintingDesc')}
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">{t('features.dividendStreaming')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('features.dividendStreamingDesc')}
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold">{t('features.p2pMatching')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('features.p2pMatchingDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
