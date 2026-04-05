'use client'
import { useTranslation } from 'react-i18next'

export default function DocumentationPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">{t('docs.title')}</h1>
      <p className="mt-4 text-muted-foreground">
        {t('docs.desc')}
      </p>
    </div>
  )
}
