const fs = require('fs');

const content = `import { Users, DollarSign, TrendingUp, Wallet, Coins, GitBranch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/stat-card'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { useDemoState } from '@/components/demo-state-provider'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()

  const navVsMarketData = herds.map((herd) => ({
    herd: t(\`herds.\${herd.id}.name\`, herd.name.split(' ')[0]),
    nav: platform.navPerTokenUsd,
    market: herd.marketPriceUsd,
  }))

  const dividendData = herds.map((herd) => ({
    herd: t(\`herds.\${herd.id}.name\`, herd.name.split(' ')[0]),
    distributed: herd.totalDividendsDistributedUsd,
  }))

  const totalValueLocked = herds.reduce((sum, herd) => sum + herd.totalValueUsd, 0)
  const totalInvestors = positions.length + 412
  const averageYield = herds.reduce((sum, herd) => sum + herd.projectedYieldPct, 0) / herds.length

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("analytics.title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("analytics.desc")}
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("analytics.totalCows")}
          value={formatNumber(herds.reduce((sum, herd) => sum + herd.herdSize, 0))}
          change={t("analytics.acrossPools")}
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title={t("analytics.tvl")}
          value={formatCurrency(totalValueLocked)}
          change={t("analytics.assetBackedValue")}
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title={t("analytics.avgYield")}
          value={\`\${averageYield.toFixed(1)}%\`}
          change={t("analytics.acrossAllTokenPools")}
          changeType="neutral"
          icon={TrendingUp}
        />
        <StatCard
          title={t("analytics.totalInvestors")}
          value={formatNumber(totalInvestors)}
          change={t("analytics.walletsOpenPos")}
          changeType="positive"
          icon={Wallet}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.cowchainVsMarket")}</CardTitle>
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
                    formatter={(value) => [formatCurrency(value as number), t("analytics.priceTooltip")]}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="nav" name={t("analytics.cowchainName")} fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="market" name={t("analytics.marketName")} fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("analytics.divsDistributed")}</CardTitle>
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
                    formatter={(value) => [formatCurrency(value as number), t("analytics.distributedTooltip")]}
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
          <CardTitle>{t("analytics.onchainMechanics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <Coins className="h-5 w-5 text-primary" />
                {t("analytics.splMinting")}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("analytics.splMintingDesc")}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <GitBranch className="h-5 w-5 text-primary" />
                {t("analytics.dividendLedger")}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("analytics.dividendLedgerDesc")}
              </p>
            </div>
            <div className="rounded-2xl border border-border p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold">
                <Wallet className="h-5 w-5 text-primary" />
                {t("analytics.matchingEngine")}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("analytics.matchingEngineDesc")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.orderBookDepth")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(listings.reduce((sum, listing) => sum + listing.tokensAvailable, 0))}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("analytics.tokensAvailableActive")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.dividendEvents")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatNumber(sales.length)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("analytics.soldCowDistributions")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analytics.recentTransactions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatNumber(transactions.length)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("analytics.actionsRetained")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
`;

fs.writeFileSync(require('path').join(__dirname, '../../app/analytics/page.tsx'), "'use client'\n\n" + content, 'utf8');
console.log('Analytics fixed.');