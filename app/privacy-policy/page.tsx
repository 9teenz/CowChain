'use client'
import { useTranslation } from 'react-i18next'

export default function PrivacyPolicyPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">{t('privacy.title')}</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {t('privacy.p1')}
      </p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {t('privacy.p2')}
      </p>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {t('privacy.p3')}
      </p>
    </div>
  )
}
