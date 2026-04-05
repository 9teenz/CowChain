'use client'

import { Users, DollarSign, Droplets, BadgeCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatCurrency } from '@/lib/utils'
import type { HerdPool } from '@/lib/demo-data'
import { PLATFORM_TOKEN_SYMBOL } from '@/lib/demo-data'
import { useDemoState } from '@/components/demo-state-provider'
import { useTranslation } from 'react-i18next'

interface HerdCardProps {
  herd: HerdPool
}

export function HerdCard({ herd }: HerdCardProps) {
  const { t } = useTranslation()
  const milkPerMonth = herd.milkProductionLitersPerDay * 30

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{t(`herds.${herd.id}.name`, herd.name)}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t(`herds.${herd.id}.location`, herd.location)}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">
              {PLATFORM_TOKEN_SYMBOL}
            </div>
            {herd.verified && (
              <div className="flex items-center gap-1 text-xs font-medium text-primary">
                <BadgeCheck className="h-3.5 w-3.5" />
                Verified
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('herdCard.herdSize')}</p>
              <p className="font-semibold">{herd.herdSize} {t('herdCard.cows')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2.5">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{t('herdCard.totalValue')}</p>
              <p className="font-semibold">{formatCurrency(herd.totalValueUsd)}</p>
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <Droplets className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-medium text-muted-foreground">{t('herdCard.milkVolume')}</p>
            <p className="font-bold text-primary">{formatNumber(milkPerMonth)} {t('herdCard.l')}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
