import Link from 'next/link'
import { TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatNumber, formatCurrency } from '@/lib/utils'
import type { HerdPool } from '@/lib/demo-data'
import { listingPremiumPct } from '@/lib/solana-contract'

interface HerdCardProps {
  herd: HerdPool
}

export function HerdCard({ herd }: HerdCardProps) {
  const soldPercent = ((herd.totalTokens - herd.availableDirectTokens) / herd.totalTokens) * 100
  const premiumPct = listingPremiumPct(herd.marketPriceUsd, herd.navPerTokenUsd)
  const premiumPositive = premiumPct >= 0

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{herd.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{herd.location}</p>
          </div>
          <div className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
            {herd.tokenSymbol}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Herd Size</p>
              <p className="font-semibold">{herd.herdSize} cows</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="font-semibold">{formatCurrency(herd.totalValueUsd)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Projected Yield</p>
              <p className="font-semibold text-primary">{herd.projectedYieldPct}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
            {premiumPositive ? (
              <ArrowUpRight className="h-4 w-4 text-primary" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-chart-5" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Market vs NAV</p>
              <p className="font-semibold">{premiumPct > 0 ? '+' : ''}{premiumPct}%</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">NAV</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(herd.navPerTokenUsd)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Market Price</p>
            <p className="text-lg font-bold">{formatCurrency(herd.marketPriceUsd)}</p>
          </div>
        </div>

        {/* Token Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Platform inventory sold</span>
            <span className="font-medium">{soldPercent.toFixed(0)}%</span>
          </div>
          <Progress value={soldPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {formatNumber(herd.totalTokens - herd.availableDirectTokens)} / {formatNumber(herd.totalTokens)} tokens
          </p>
        </div>
      </CardContent>
      <CardFooter className="gap-2 pt-2">
        <Button variant="outline" className="flex-1" asChild>
          <Link href={`/herd/${herd.id}`}>View Details</Link>
        </Button>
        <Button className="flex-1" asChild>
          <Link href={`/herd/${herd.id}`}>Buy Tokens</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
