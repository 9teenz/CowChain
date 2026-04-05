'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Award,
  Banknote,
  BarChart3,
  Beef,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Copy,
  DollarSign,
  Milk,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
  Users2,
  Wallet,
} from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDemoState } from '@/components/demo-state-provider'
import { shortenWallet } from '@/lib/solana-contract'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type { CowAddEvent, CowSaleEvent } from '@/lib/demo-data'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ModalKind = 'add-cows' | 'sell-cow' | 'update-revenue' | 'pay-dividends' | null

interface ModalState {
  kind: ModalKind
  herdId: string
}

function activityIcon(kind: string) {
  switch (kind) {
    case 'cow-sale':   return <ArrowUpRight className="h-4 w-4 text-amber-500" />
    case 'claim':      return <Banknote className="h-4 w-4 text-emerald-500" />
    case 'nav-buy':    return <Plus className="h-4 w-4 text-primary" />
    case 'market-buy': return <TrendingUp className="h-4 w-4 text-sky-500" />
    case 'listing':    return <ArrowUpRight className="h-4 w-4 text-violet-500" />
    default:           return <RefreshCw className="h-4 w-4 text-muted-foreground" />
  }
}

type HistoryEntry =
  | { type: 'sale'; date: string; event: CowSaleEvent }
  | { type: 'add';  date: string; event: CowAddEvent }

const INCOME_MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']

export default function FarmerProfilePage() {
  const { data: session } = useSession()
  const { t } = useTranslation()
  const {
    state: { herds, positions, sales, addEvents, investors, transactions, wallet, platform },
    simulateCowSale,
    addCowsToHerd,
    updateMilkRevenue,
    claimDividends,
  } = useDemoState()

  const [copied, setCopied] = useState(false)
  const [modal, setModal] = useState<ModalState>({ kind: null, herdId: '' })
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [expandedSale, setExpandedSale] = useState<string | null>(null)

  const [cowCount, setCowCount]       = useState('3')
  const [cowCost, setCowCost]         = useState('1200')
  const [salePrice, setSalePrice]     = useState('1500')
  const [milkRevenue, setMilkRevenue] = useState('')

  const fullName     = session?.user?.name ?? 'Farmer'
  const farmerWallet = wallet.connected ? wallet.walletAddress : '—'

  const totalCows        = herds.reduce((s, h) => s + h.herdSize, 0)
  const totalNAV         = herds.reduce((s, h) => s + h.totalValueUsd, 0)
  const totalAnnualMilk  = herds.reduce((s, h) => s + h.expectedAnnualRevenueUsd, 0)
  const totalMonthlyMilk = Math.round(totalAnnualMilk / 12)
  const investorCount    = positions.length

  // Live token price: NAV = Total Herd Value / Total Supply
  const tokenPriceUsd    = platform.totalSupply > 0 ? totalNAV / platform.totalSupply : 0

  // Combined sorted event history (sales + cow additions)
  const historyEntries: HistoryEntry[] = [
    ...sales.map((e) => ({ type: 'sale' as const, date: e.saleDate, event: e })),
    ...(addEvents ?? []).map((e) => ({ type: 'add' as const, date: e.addDate, event: e })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const incomeChartData = INCOME_MONTHS.map((month, i) => {
    const row: Record<string, number | string> = { month }
    herds.forEach((h) => {
      const base  = Math.round(h.expectedAnnualRevenueUsd / 12)
      const noise = Math.round(base * 0.08 * Math.sin(i * 1.3 + h.herdSize))
      row[h.name.split(' ')[0]] = Math.max(0, base + noise)
    })
    return row
  })

  // Provide translated month texts based on generic formatting or dictionary
  const getTranslatedMonth = (monthCode: string) => {
    // Basic dynamic translation for months if needed, 
    // or just leave them as is if user relies on default dates.
    // For simplicity, we just use the original array.
    return monthCode;
  }

  const copyWallet = async () => {
    if (!wallet.walletAddress) return
    await navigator.clipboard.writeText(wallet.walletAddress)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const openModal = (kind: ModalKind, herdId: string) => {
    setFeedback(null)
    const herd = herds.find((h) => h.id === herdId)
    if (herd) setMilkRevenue(String(herd.expectedAnnualRevenueUsd))
    setModal({ kind, herdId })
    if (kind === 'pay-dividends') {
      const result = claimDividends(wallet.preferredDividendCurrency)
      setFeedback({ ok: result.ok, msg: result.message })
      if (result.ok) window.setTimeout(closeModal, 1800)
    }
  }

  const closeModal = () => setModal({ kind: null, herdId: '' })

  const handleAddCows = () => {
    const result = addCowsToHerd(modal.herdId, parseInt(cowCount), parseFloat(cowCost))
    setFeedback({ ok: result.ok, msg: result.message })
    if (result.ok) window.setTimeout(closeModal, 1400)
  }

  const handleSellCow = () => {
    const result = simulateCowSale(modal.herdId, parseFloat(salePrice), wallet.preferredDividendCurrency)
    setFeedback({ ok: result.ok, msg: result.message })
    if (result.ok) window.setTimeout(closeModal, 1400)
  }

  const handleUpdateRevenue = () => {
    const result = updateMilkRevenue(modal.herdId, parseFloat(milkRevenue))
    setFeedback({ ok: result.ok, msg: result.message })
    if (result.ok) window.setTimeout(closeModal, 1400)
  }

  const handlePayDividends = () => {
    const result = claimDividends(wallet.preferredDividendCurrency)
    setFeedback({ ok: result.ok, msg: result.message })
    if (result.ok) window.setTimeout(closeModal, 1400)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/20">
              <span className="text-3xl font-bold">{fullName.slice(0, 2).toUpperCase()}</span>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow">
                🐄
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <Badge variant="default" className="gap-1">
                  <Award className="h-3 w-3" />
                  {t('farmer.farmerRole')}
                </Badge>
                <Badge variant="secondary">
                  {herds.length} {herds.length === 1 ? t('farmer.farmSingular') : t('farmer.farmsPlural')}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-xs">{farmerWallet !== '—' ? shortenWallet(farmerWallet) : '—'}</span>
                  {wallet.connected && (
                    <button onClick={copyWallet} className="text-muted-foreground transition-colors hover:text-foreground">
                      {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {session?.user?.email && (
                  <div className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground">
                    {session.user.email}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  April 2026
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  {transactions.length} {t('farmer.transactionsPlural')}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t('farmer.createFarm')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title={t('farmer.totalCows')}
          value={formatNumber(totalCows)}
          change={`${herds.length} ${herds.length === 1 ? t('farmer.farmSingular') : t('farmer.farmsPlural')}`}
          changeType="positive"
          icon={Beef}
        />
        <StatCard
          title={t('farmer.totalCowchainValue')}
          value={formatCurrency(totalNAV)}
          change={t('farmer.valueOfAllAssets')}
          changeType="positive"
          icon={BarChart3}
        />
        <StatCard
          title={t('farmer.milkRevenueMo')}
          value={formatCurrency(totalMonthlyMilk)}
          change={t('farmer.currentMonthForecast')}
          changeType="positive"
          icon={Milk}
        />
        <StatCard
          title="Цена токена (NAV)"
          value={`$${tokenPriceUsd.toFixed(2)}`}
          change={`${formatNumber(platform.totalSupply)} токенов • NAV = Стоимость ÷ Супплай`}
          changeType="positive"
          icon={Coins}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="farms">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="farms" className="gap-1.5">
            <Beef className="h-4 w-4" /> {t('farmer.tabFarms')}
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5">
            <DollarSign className="h-4 w-4" /> {t('farmer.tabFinance')}
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="h-4 w-4" /> {t('farmer.tabActivity')}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <Beef className="h-4 w-4" /> История
          </TabsTrigger>
          <TabsTrigger value="investors" className="gap-1.5">
            <Users2 className="h-4 w-4" /> Инвесторы
          </TabsTrigger>
        </TabsList>

        {/* FARMS */}
        <TabsContent value="farms">
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {herds.map((herd) => (
              <Card key={herd.id} className="flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t(`herds.${herd.id}.name`, herd.name)}</CardTitle>
                  <CardDescription className="text-xs">{t(`herds.${herd.id}.location`, herd.location)}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{t('farmer.cowsLabel')}</p>
                      <p className="text-lg font-bold">{formatNumber(herd.herdSize)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{t('farmer.cowchainLabel')}</p>
                      <p className="text-lg font-bold">{formatCurrency(herd.totalValueUsd)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">{t('farmer.milkYearLabel')}</p>
                      <p className="text-lg font-bold">{formatCurrency(herd.expectedAnnualRevenueUsd)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('farmer.tokensSoldLabel')}</span>
                      <span>{formatNumber(herd.totalTokens - herd.availableDirectTokens)} / {formatNumber(herd.totalTokens)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${((herd.totalTokens - herd.availableDirectTokens) / herd.totalTokens) * 100}%` }}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground">
                      {(((herd.totalTokens - herd.availableDirectTokens) / herd.totalTokens) * 100).toFixed(1)}% {t('farmer.soldLabel')}
                    </p>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openModal('add-cows', herd.id)}>
                      <Plus className="h-3 w-3" /> {t('farmer.addCowsBtn')}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openModal('sell-cow', herd.id)}>
                      <ArrowUpRight className="h-3 w-3" /> {t('farmer.sellCowBtn')}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs col-span-2" onClick={() => openModal('update-revenue', herd.id)}>
                      <RefreshCw className="h-3 w-3" /> {t('farmer.updateRevenueBtn')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* FINANCE */}
        <TabsContent value="finance">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard title={t('farmer.annualMilkRevenue')} value={formatCurrency(totalAnnualMilk)} change={t('farmer.allFarmsForecast')} changeType="positive" icon={Milk} />
              <StatCard title={t('farmer.milkRevenueMo')} value={formatCurrency(totalMonthlyMilk)} change={t('farmer.currentMonthForecast')} changeType="positive" icon={TrendingUp} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {t('farmer.milkRevenueByMonth')}
                </CardTitle>
                <CardDescription>{t('farmer.breakdownByFarm')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={incomeChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {herds.map((herd, i) => {
                      const colors = ['var(--color-primary)', '#22d3ee', '#34d399', '#f59e0b']
                      return (
                        <Area
                          key={herd.id}
                          type="monotone"
                          dataKey={herd.name.split(' ')[0]}
                          stroke={colors[i % colors.length]}
                          fill={colors[i % colors.length]}
                          fillOpacity={0.12}
                          strokeWidth={2}
                          dot={false}
                        />
                      )
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t('farmer.farmFinancials')}</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 font-medium pr-4">{t('farmer.tableFarm')}</th>
                        <th className="pb-3 font-medium pr-4">{t('farmer.tableRevYr')}</th>
                        <th className="pb-3 font-medium pr-4">{t('farmer.tableCowchain')}</th>
                        <th className="pb-3 font-medium">{t('farmer.tableRevMo')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {herds.map((h) => (
                        <tr key={h.id} className="border-b border-border last:border-0">
                          <td className="py-4 font-medium pr-4">{t(`herds.${h.id}.name`, h.name)}</td>
                          <td className="py-4 text-sky-600 dark:text-sky-400 pr-4">{formatCurrency(h.expectedAnnualRevenueUsd)}</td>
                          <td className="py-4 font-semibold pr-4">{formatCurrency(h.totalValueUsd)}</td>
                          <td className="py-4 text-muted-foreground">{formatCurrency(Math.round(h.expectedAnnualRevenueUsd / 12))}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                        <td className="py-4 pr-4">{t('farmer.tableTotal')}</td>
                        <td className="py-4 text-sky-600 dark:text-sky-400 pr-4">{formatCurrency(totalAnnualMilk)}</td>
                        <td className="py-4 pr-4">{formatCurrency(totalNAV)}</td>
                        <td className="py-4 text-muted-foreground">{formatCurrency(totalMonthlyMilk)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity">
          <div className="space-y-6">
            {sales.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Beef className="h-4 w-4 text-primary" />
                    {t('farmer.cowSaleHistory')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] text-sm whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-3 font-medium pr-4">{t('farmer.tableFarm')}</th>
                          <th className="pb-3 font-medium pr-4">{t('farmer.tableTag')}</th>
                          <th className="pb-3 font-medium pr-4">{t('farmer.tableSalePrice')}</th>
                          <th className="pb-3 font-medium pr-4">{t('farmer.tableDivToken')}</th>
                          <th className="pb-3 font-medium">{t('farmer.tableDate')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((s) => (
                          <tr key={s.id} className="border-b border-border last:border-0">
                            <td className="py-3 font-medium pr-4">{t(`herds.${s.herdId}.name`, s.herdName)}</td>
                            <td className="py-3 font-mono text-xs text-muted-foreground pr-4">{s.cowTag}</td>
                            <td className="py-3 text-emerald-600 dark:text-emerald-400 pr-4">{formatCurrency(s.salePriceUsd)}</td>
                            <td className="py-3 pr-4">${s.dividendPerTokenUsd.toFixed(4)}</td>
                            <td className="py-3 text-muted-foreground">{new Date(s.saleDate).toLocaleDateString('en-US')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4 text-primary" />
                  {t('farmer.transactionsFeed')}
                </CardTitle>
                <CardDescription>{t('farmer.allOnChainEvents')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                  {transactions.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('farmer.noTransactionsYet')}</p>
                  )}
                  {transactions.map((tx, i) => (
                    <div key={tx.id} className={`relative flex gap-4 ${i !== transactions.length - 1 ? 'pb-6' : ''}`}>
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-border">
                        {activityIcon(tx.kind)}
                      </div>
                      <div className="flex flex-1 flex-wrap items-start justify-between gap-2 pt-1.5">
                        <div>
                          <p className="text-sm font-medium">{t(`portfolio.txns.${tx.id}`, t(`portfolio.txns.${tx.kind}`, tx.label))}</p>
                          <p className="text-xs font-mono text-muted-foreground">{shortenWallet(tx.txId)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">+{formatCurrency(tx.amountUsd)}</p>
                          <p className="text-xs text-muted-foreground">{new Date(tx.timestamp).toLocaleDateString('en-US')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* HISTORY — sales + additions unified timeline */}
        <TabsContent value="history">
          <div className="space-y-4">
            {historyEntries.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">Нет событий. Добавьте или продайте коров, чтобы увидеть историю.</p>
            )}
            {historyEntries.map((entry) => {
              if (entry.type === 'sale') {
                const s = entry.event
                const isExpanded = expandedSale === s.id
                return (
                  <Card key={s.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                            <ArrowUpRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Продажа коровы — {s.herdName}</p>
                            <p className="text-xs text-muted-foreground font-mono">{s.cowTag} · {new Date(s.saleDate).toLocaleDateString('ru-RU')}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.salePriceUsd)}</p>
                          <Coins className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-6 rounded-lg bg-muted/50 px-4 py-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Дивиденд / токен</p>
                          <p className="font-mono font-semibold text-primary">${s.dividendPerTokenUsd?.toFixed(6) ?? '0.000000'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">NAV до</p>
                          <p className="font-mono">${s.navBeforeUsd?.toFixed(2) ?? 'N/A'}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">NAV после</p>
                          <p className={`font-mono font-semibold ${s.navAfterUsd && s.navBeforeUsd && s.navAfterUsd < s.navBeforeUsd ? 'text-amber-500' : 'text-emerald-500'}`}>
                            ${s.navAfterUsd?.toFixed(2) ?? 'N/A'}
                          </p>
                        </div>
                        <div className="ml-auto text-xs text-muted-foreground">
                          {s.settlementCurrency}
                        </div>
                      </div>

                      {(s.investorDividends ?? []).length > 0 && (
                        <>
                          <button
                            onClick={() => setExpandedSale(isExpanded ? null : s.id)}
                            className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors"
                          >
                            <span className="flex items-center gap-2 font-medium">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              Выплаты инвесторам ({(s.investorDividends ?? []).length})
                            </span>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>

                          {isExpanded && (
                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                                    <th className="px-4 py-2.5 font-medium">Инвестор</th>
                                    <th className="px-4 py-2.5 font-medium">Токены</th>
                                    <th className="px-4 py-2.5 font-medium">× {s.dividendPerTokenUsd.toFixed(6)}</th>
                                    <th className="px-4 py-2.5 font-medium">Дивиденд</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(s.investorDividends ?? []).map((inv) => (
                                    <tr key={inv.investorId} className="border-b border-border last:border-0">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                            {inv.investorName.split(' ').map((n) => n[0]).join('')}
                                          </div>
                                          <span className="font-medium">{inv.investorName}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 font-mono text-xs">{formatNumber(inv.tokensOwned)}</td>
                                      <td className="px-4 py-3 text-muted-foreground text-xs">
                                        {formatNumber(inv.tokensOwned)} × ${s.dividendPerTokenUsd.toFixed(4)}
                                      </td>
                                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(inv.dividendUsd)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )
              }

              // add event
              const a = entry.event
              return (
                <Card key={a.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                          <ArrowDown className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Добавлено коров — {a.herdName}</p>
                          <p className="text-xs text-muted-foreground">{new Date(a.addDate).toLocaleDateString('ru-RU')}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">+{a.count} коров</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(a.totalCostUsd)}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-6 rounded-lg bg-muted/50 px-4 py-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Цена / корова</p>
                        <p className="font-semibold">{formatCurrency(a.costPerCowUsd)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Итого</p>
                        <p className="font-semibold">{formatCurrency(a.totalCostUsd)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">NAV до</p>
                        <p className="font-mono">${a.navBeforeUsd.toFixed(2)}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">NAV после</p>
                        <p className={`font-mono font-semibold ${a.navAfterUsd > a.navBeforeUsd ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                          ${a.navAfterUsd.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* INVESTORS */}
        <TabsContent value="investors">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="Всего инвесторов"
                value={formatNumber((investors ?? []).length)}
                change="Держатели токенов CowChain"
                changeType="neutral"
                icon={Users2}
              />
              <StatCard
                title="Токены у инвесторов"
                value={formatNumber((investors ?? []).reduce((s, i) => s + i.tokensOwned, 0))}
                change={`из ${formatNumber(platform.totalSupply)} всего`}
                changeType="neutral"
                icon={Coins}
              />
              <StatCard
                title="Ожидающие дивиденды"
                value={formatCurrency((investors ?? []).reduce((s, i) => s + i.pendingDividendsUsd, 0))}
                change="Сумма по всем инвесторам"
                changeType="positive"
                icon={Wallet}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users2 className="h-4 w-4 text-primary" />
                  Инвесторы платформы
                </CardTitle>
                <CardDescription>
                  Формула: Дивиденд = Цена продажи ÷ Всего токенов × Токены инвестора
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Инвестор</th>
                        <th className="pb-3 font-medium">Кошелёк</th>
                        <th className="pb-3 font-medium">Токены</th>
                        <th className="pb-3 font-medium">Доля</th>
                        <th className="pb-3 font-medium">Получено всего</th>
                        <th className="pb-3 font-medium">Ожидает выплаты</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(investors ?? []).map((inv) => {
                        const share = platform.totalSupply > 0 ? (inv.tokensOwned / platform.totalSupply) * 100 : 0
                        const totalEarned = inv.claimedDividendsUsd + inv.pendingDividendsUsd
                        return (
                          <tr key={inv.id} className="border-b border-border last:border-0">
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                  {inv.avatarInitials}
                                </div>
                                <span className="font-medium">{inv.name}</span>
                              </div>
                            </td>
                            <td className="py-4 font-mono text-xs text-muted-foreground">{shortenWallet(inv.walletAddress)}</td>
                            <td className="py-4 font-semibold">{formatNumber(inv.tokensOwned)}</td>
                            <td className="py-4 text-muted-foreground">{share.toFixed(2)}%</td>
                            <td className="py-4 text-sky-600 dark:text-sky-400">{formatCurrency(totalEarned)}</td>
                            <td className="py-4">
                              <span className={`font-semibold ${inv.pendingDividendsUsd > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                {formatCurrency(inv.pendingDividendsUsd)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {sales.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Beef className="h-4 w-4 text-amber-500" />
                    История выплат по продажам
                  </CardTitle>
                  <CardDescription>
                    Цена продажи ÷ Всего токенов = Дивиденд на токен → × Токены инвестора = Выплата
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sales.map((s) => (
                    <div key={s.id} className="overflow-hidden rounded-xl border border-border">
                      <div className="flex items-center justify-between gap-4 bg-muted/40 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-amber-500" />
                          <span className="font-semibold text-sm">{s.herdName} — {s.cowTag}</span>
                          <span className="text-xs text-muted-foreground">{new Date(s.saleDate).toLocaleDateString('ru-RU')}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
                            ${s.dividendPerTokenUsd.toFixed(6)}/token
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(s.salePriceUsd)}</span>
                        </div>
                      </div>
                      <div className="divide-y divide-border">
                        {(s.investorDividends ?? []).map((inv) => (
                          <div key={inv.investorId} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                                {inv.investorName.split(' ').map((n) => n[0]).join('')}
                              </div>
                              <span className="font-medium">{inv.investorName}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{formatNumber(inv.tokensOwned)} тк</span>
                              <ArrowRight className="h-3 w-3" />
                              <span className="text-sm font-bold text-foreground">{formatCurrency(inv.dividendUsd)}</span>
                            </div>
                          </div>
                        ))}
                        {(s.investorDividends ?? []).length === 0 && (
                          <p className="px-4 py-3 text-xs text-muted-foreground">Нет данных об инвесторах для этой продажи.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

      </Tabs>

      {/* Dialog: Add cows */}
      <Dialog open={modal.kind === 'add-cows'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('farmer.modalAddCows')}</DialogTitle>
            <DialogDescription>{t(`herds.${modal.herdId}.name`, herds.find((h) => h.id === modal.herdId)?.name || '')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cow-count">{t('farmer.modalNumCows')}</Label>
              <Input id="cow-count" type="number" min="1" value={cowCount} onChange={(e) => setCowCount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cow-cost">{t('farmer.modalCostPerCow')}</Label>
              <Input id="cow-cost" type="number" min="1" value={cowCost} onChange={(e) => setCowCost(e.target.value)} />
            </div>
            {feedback && <p className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{feedback.msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>{t('farmer.modalCancel')}</Button>
              <Button onClick={handleAddCows}>{t('farmer.modalAdd')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Sell cow */}
      <Dialog open={modal.kind === 'sell-cow'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('farmer.modalSellCow')}</DialogTitle>
            <DialogDescription>{t(`herds.${modal.herdId}.name`, herds.find((h) => h.id === modal.herdId)?.name || '')} · {t('farmer.modalSellCowDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sale-price">{t('farmer.modalSalePriceUsd')}</Label>
              <Input id="sale-price" type="number" min="1" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
            {feedback && <p className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{feedback.msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>{t('farmer.modalCancel')}</Button>
              <Button variant="destructive" onClick={handleSellCow}>{t('farmer.modalSellBtn')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Update revenue */}
      <Dialog open={modal.kind === 'update-revenue'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('farmer.modalUpdateMilkRev')}</DialogTitle>
            <DialogDescription>{t(`herds.${modal.herdId}.name`, herds.find((h) => h.id === modal.herdId)?.name || '')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="milk-revenue">{t('farmer.modalAnnualRevUsd')}</Label>
              <Input id="milk-revenue" type="number" min="1" value={milkRevenue} onChange={(e) => setMilkRevenue(e.target.value)} />
            </div>
            {feedback && <p className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{feedback.msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>{t('farmer.modalCancel')}</Button>
              <Button onClick={handleUpdateRevenue}>{t('farmer.modalUpdateBtn')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pay dividends */}
      <Dialog open={modal.kind === 'pay-dividends'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('farmer.modalPayDivs')}</DialogTitle>
            <DialogDescription>
              {t(`herds.${modal.herdId}.name`, herds.find((h) => h.id === modal.herdId)?.name || '')} &middot; {t('farmer.modalPayoutIn')} {wallet.preferredDividendCurrency}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const herd = herds.find((h) => h.id === modal.herdId)
              const herdPositions = positions.filter((p) => p.herdId === modal.herdId)
              const totalPending = herdPositions.reduce((s, p) => s + p.pendingDividendsUsd, 0)
              return (
                <>
                  <div className="rounded-lg bg-muted p-4 text-sm">
                    <p className="text-muted-foreground">{t('farmer.modalTotalPayout')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
                  </div>
                  {herd && herdPositions.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border text-left text-muted-foreground">
                            <th className="pb-2 font-medium">{t('farmer.tableFarm')}</th>
                            <th className="pb-2 font-medium">{t('farmer.modalTableTokens')}</th>
                            <th className="pb-2 font-medium">{t('farmer.modalTableShare')}</th>
                            <th className="pb-2 font-medium">{t('farmer.modalTablePayout')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {herdPositions.map((pos) => {
                            const share = herd.totalTokens > 0 ? pos.tokensOwned / herd.totalTokens : 0
                            const payout = totalPending * share
                            return (
                              <tr key={pos.herdId} className="border-b border-border last:border-0">
                                <td className="py-2 font-medium">{t(`herds.${pos.herdId}.name`, pos.herdName)}</td>
                                <td className="py-2">{formatNumber(pos.tokensOwned)}</td>
                                <td className="py-2 text-muted-foreground">{(share * 100).toFixed(1)}%</td>
                                <td className="py-2 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(payout)}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )
            })()}
            {feedback && <p className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{feedback.msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>{t('farmer.modalCloseBtn')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
