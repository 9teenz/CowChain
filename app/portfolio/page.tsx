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
import { useTranslation } from 'react-i18next'

export default function PortfolioPage() {
  const {
    state: { herds, positions, transactions, portfolioValueSeries, dividendSeries, wallet, platform },
    portfolioSummary,
    claimDividends,
  } = useDemoState()
  const { requireAuth } = useAuthGuard()
  const { t } = useTranslation()

  const totalInvested = positions.reduce((sum, item) => sum + item.tokensOwned * item.averageCostUsd, 0)
  const roi = totalInvested === 0 ? 0 : ((portfolioSummary.marketValueUsd - totalInvested) / totalInvested) * 100

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">{t("portfolio.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("portfolio.desc")}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t("portfolio.platformTokenBalance")}
          value={formatNumber(portfolioSummary.userPlatformTokens)}
          change={t("portfolio.acrossAllPools")}
          changeType="neutral"
          icon={Coins}
        />
        <StatCard
          title={t("portfolio.totalHerdShares")}
          value={t("portfolio.cows", { count: portfolioSummary.totalHerdShares.toFixed(2) })}
          change={t("portfolio.fractionalExposure")}
          changeType="neutral"
          icon={Wallet}
        />
        <StatCard
          title={t("portfolio.cowchainValue")}
          value={formatCurrency(portfolioSummary.currentNavValueUsd)}
          change={t("portfolio.cowchainValuation")}
          changeType="neutral"
          icon={DollarSign}
        />
        <StatCard
          title={t("portfolio.marketValue")}
          value={formatCurrency(portfolioSummary.marketValueUsd)}
          change={`${roi > 0 ? '+' : ''}${t('portfolio.totalReturn', { roi: roi.toFixed(2) })}`}
          changeType={roi >= 0 ? 'positive' : 'negative'}
          icon={LineChart}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t("portfolio.valHistory")}</CardTitle>
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
                  <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} width={80} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), t('portfolio.portfolioTooltip')]} />
                  <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="url(#portfolioArea)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("portfolio.divHistory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dividendSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="period" tick={{ fill: 'var(--color-muted-foreground)' }} />
                  <YAxis tick={{ fill: 'var(--color-muted-foreground)' }} width={50} />
                  <Tooltip formatter={(value: number) => [formatCurrency(value), t('portfolio.dividendsTooltip')]} />
                  <Bar dataKey="value" fill="var(--color-chart-2)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="col-span-1 overflow-hidden">
          <CardHeader>
            <CardTitle>{t("portfolio.yourHoldings")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground whitespace-nowrap">
                    <th className="pb-3 pr-4 font-medium">{t("portfolio.thHerd")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("portfolio.thTokens")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("portfolio.thListed")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("portfolio.thShare")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("portfolio.thPendingDivs")}</th>
                    <th className="pb-3 pr-4 font-medium">{t("portfolio.thMarketVal")}</th>
                    <th className="pb-3 font-medium">{t("portfolio.thAction")}</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((position) => {
                    const herd = herds.find((item) => item.id === position.herdId)
                    const share = herd ? (position.tokensOwned / platform.totalSupply) * 100 : 0
                    const marketValue = herd ? position.tokensOwned * herd.marketPriceUsd : 0

                    return (
                      <tr key={position.herdId} className="border-b border-border last:border-0">
                        <td className="py-4 pr-4 font-medium">{t(`herds.${position.herdId}.name`, position.herdName)}</td>
                        <td className="py-4 pr-4">{formatNumber(position.tokensOwned)}</td>
                        <td className="py-4 pr-4">{formatNumber(position.listedTokens)}</td>
                        <td className="py-4 pr-4">{share.toFixed(2)}%</td>
                        <td className="py-4 pr-4 text-primary">{formatCurrency(position.pendingDividendsUsd)}</td>
                        <td className="py-4 pr-4">{formatCurrency(marketValue)}</td> 
                        <td className="py-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/herd/${position.herdId}`}>
                              {t("portfolio.viewBtn")} <ExternalLink className="ml-1 h-3 w-3" />
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

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>{t("portfolio.claimQueue")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">{t("portfolio.pendingDivsVal")}</p>
              <p className="mt-2 text-3xl font-bold text-primary">{formatCurrency(portfolioSummary.pendingDividendsUsd)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("portfolio.defaultPayout")} {wallet.preferredDividendCurrency}</p>
            </div>
            <Button
              className="w-full"
              onClick={() => requireAuth(() => claimDividends(wallet.preferredDividendCurrency))}
              disabled={portfolioSummary.pendingDividendsUsd <= 0}
            >
              {t("portfolio.claimDivsBtn")}
            </Button>
            <div className="space-y-3 text-sm">
              {transactions.slice(0, 4).map((transaction) => (
                <div key={transaction.id} className="rounded-xl border border-border px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{t(`portfolio.txns.${transaction.id}`, t(`portfolio.txns.${transaction.kind}`, { defaultValue: transaction.label, label: transaction.label }))}</span>
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
