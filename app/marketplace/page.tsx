'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function MarketplacePage() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold">{t('marketplace.title')}</h1>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Construction className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-semibold text-muted-foreground">
            {t('marketplace.temporarilyUnavailable')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}