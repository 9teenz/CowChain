'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Activity,
  ArrowUpRight,
  Award,
  Banknote,
  BarChart3,
  Beef,
  Calendar,
  Check,
  Copy,
  DollarSign,
  Milk,
  Plus,
  RefreshCw,
  TrendingUp,
  Users,
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

function healthBadgeClass(health: 'Prime' | 'Strong' | 'Watch') {
  return {
    Prime: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    Strong: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
    Watch: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  }[health]
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

const INCOME_MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']

export default function FarmerProfilePage() {
  const { data: session } = useSession()
  const {
    state: { herds, positions, sales, transactions, wallet },
    simulateCowSale,
    addCowsToHerd,
    updateMilkRevenue,
    claimDividends,
  } = useDemoState()

  const [copied, setCopied] = useState(false)
  const [modal, setModal] = useState<ModalState>({ kind: null, herdId: '' })
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

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

  const incomeChartData = INCOME_MONTHS.map((month, i) => {
    const row: Record<string, number | string> = { month }
    herds.forEach((h) => {
      const base  = Math.round(h.expectedAnnualRevenueUsd / 12)
      const noise = Math.round(base * 0.08 * Math.sin(i * 1.3 + h.herdSize))
      row[h.name.split(' ')[0]] = Math.max(0, base + noise)
    })
    return row
  })

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
                  Farmer
                </Badge>
                <Badge variant="secondary">{herds.length} {herds.length === 1 ? 'farm' : 'farms'}</Badge>
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
                  <Users className="h-4 w-4" />
                  {formatNumber(investorCount)} investors
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  {transactions.length} transactions
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Farm
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Cows"
          value={formatNumber(totalCows)}
          change={`${herds.length} ${herds.length === 1 ? 'farm' : 'farms'}`}
          changeType="positive"
          icon={Beef}
        />
        <StatCard
          title="Total NAV"
          value={formatCurrency(totalNAV)}
          change="Value of all assets"
          changeType="positive"
          icon={BarChart3}
        />
        <StatCard
          title="Milk Revenue / mo"
          value={formatCurrency(totalMonthlyMilk)}
          change="Current month forecast"
          changeType="positive"
          icon={Milk}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="farms">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="farms" className="gap-1.5">
            <Beef className="h-4 w-4" /> Farms
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5">
            <DollarSign className="h-4 w-4" /> Finance
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5">
            <Activity className="h-4 w-4" /> Activity
          </TabsTrigger>

        </TabsList>

        {/* FARMS */}
        <TabsContent value="farms">
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {herds.map((herd) => (
              <Card key={herd.id} className="flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{herd.name}</CardTitle>
                      <CardDescription className="text-xs">{herd.location}</CardDescription>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${healthBadgeClass(herd.healthStatus)}`}>
                      {herd.healthStatus}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Cows</p>
                      <p className="text-lg font-bold">{formatNumber(herd.herdSize)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">NAV</p>
                      <p className="text-lg font-bold">{formatCurrency(herd.totalValueUsd)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Milk / year</p>
                      <p className="text-lg font-bold">{formatCurrency(herd.expectedAnnualRevenueUsd)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Dividends paid</p>
                      <p className="text-lg font-bold">{formatCurrency(herd.totalDividendsDistributedUsd)}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Tokens sold</span>
                      <span>{formatNumber(herd.totalTokens - herd.availableDirectTokens)} / {formatNumber(herd.totalTokens)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${((herd.totalTokens - herd.availableDirectTokens) / herd.totalTokens) * 100}%` }}
                      />
                    </div>
                    <p className="text-right text-xs text-muted-foreground">
                      {(((herd.totalTokens - herd.availableDirectTokens) / herd.totalTokens) * 100).toFixed(1)}% sold
                    </p>
                  </div>

                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openModal('add-cows', herd.id)}>
                      <Plus className="h-3 w-3" /> Add Cows
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openModal('sell-cow', herd.id)}>
                      <ArrowUpRight className="h-3 w-3" /> Sell Cow
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openModal('update-revenue', herd.id)}>
                      <RefreshCw className="h-3 w-3" /> Update Revenue
                    </Button>
                    <Button variant="default" size="sm" className="gap-1 text-xs" onClick={() => openModal('pay-dividends', herd.id)}>
                      <Banknote className="h-3 w-3" /> Pay Out
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
              <StatCard title="Annual Milk Revenue" value={formatCurrency(totalAnnualMilk)} change="All farms — forecast" changeType="positive" icon={Milk} />
              <StatCard title="Revenue / month" value={formatCurrency(totalMonthlyMilk)} change="Current month forecast" changeType="positive" icon={TrendingUp} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Milk Revenue by Month
                </CardTitle>
                <CardDescription>Breakdown by farm · last 7 months</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={incomeChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`$${v.toLocaleString()}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {herds.map((herd, i) => {
                      const colors = ['hsl(var(--primary))', '#22d3ee', '#34d399', '#f59e0b']
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
              <CardHeader><CardTitle className="text-base">Farm Financials</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Farm</th>
                        <th className="pb-3 font-medium">Revenue (yr)</th>
                        <th className="pb-3 font-medium">NAV</th>
                        <th className="pb-3 font-medium">Revenue / mo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {herds.map((h) => (
                        <tr key={h.id} className="border-b border-border last:border-0">
                          <td className="py-4 font-medium">{h.name}</td>
                          <td className="py-4 text-sky-600 dark:text-sky-400">{formatCurrency(h.expectedAnnualRevenueUsd)}</td>
                          <td className="py-4 font-semibold">{formatCurrency(h.totalValueUsd)}</td>
                          <td className="py-4 text-muted-foreground">{formatCurrency(Math.round(h.expectedAnnualRevenueUsd / 12))}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                        <td className="py-4">Total</td>
                        <td className="py-4 text-sky-600 dark:text-sky-400">{formatCurrency(totalAnnualMilk)}</td>
                        <td className="py-4">{formatCurrency(totalNAV)}</td>
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
                    Cow Sale History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="pb-3 font-medium">Farm</th>
                          <th className="pb-3 font-medium">Tag</th>
                          <th className="pb-3 font-medium">Sale Price</th>
                          <th className="pb-3 font-medium">Dividend / token</th>
                          <th className="pb-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((s) => (
                          <tr key={s.id} className="border-b border-border last:border-0">
                            <td className="py-3 font-medium">{s.herdName}</td>
                            <td className="py-3 font-mono text-xs text-muted-foreground">{s.cowTag}</td>
                            <td className="py-3 text-emerald-600 dark:text-emerald-400">{formatCurrency(s.salePriceUsd)}</td>
                            <td className="py-3">${s.dividendPerTokenUsd.toFixed(4)}</td>
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
                  Transaction Feed
                </CardTitle>
                <CardDescription>All on-chain events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative space-y-0">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
                  {transactions.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
                  )}
                  {transactions.map((tx, i) => (
                    <div key={tx.id} className={`relative flex gap-4 ${i !== transactions.length - 1 ? 'pb-6' : ''}`}>
                      <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background ring-2 ring-border">
                        {activityIcon(tx.kind)}
                      </div>
                      <div className="flex flex-1 flex-wrap items-start justify-between gap-2 pt-1.5">
                        <div>
                          <p className="text-sm font-medium">{tx.label}</p>
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

      </Tabs>

      {/* Dialog: Add cows */}
      <Dialog open={modal.kind === 'add-cows'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cows</DialogTitle>
            <DialogDescription>{herds.find((h) => h.id === modal.herdId)?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cow-count">Number of cows</Label>
              <Input id="cow-count" type="number" min="1" value={cowCount} onChange={(e) => setCowCount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cow-cost">Cost per cow (USD)</Label>
              <Input id="cow-cost" type="number" min="1" value={cowCost} onChange={(e) => setCowCost(e.target.value)} />
            </div>
            {feedback && <p className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{feedback.msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleAddCows}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Sell cow */}
      <Dialog open={modal.kind === 'sell-cow'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell Cow</DialogTitle>
            <DialogDescription>{herds.find((h) => h.id === modal.herdId)?.name} · NAV will be recalculated and dividends distributed to investors</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sale-price">Sale price (USD)</Label>
              <Input id="sale-price" type="number" min="1" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
            {feedback && <p className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{feedback.msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button variant="destructive" onClick={handleSellCow}>Sell</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Update revenue */}
      <Dialog open={modal.kind === 'update-revenue'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Milk Revenue</DialogTitle>
            <DialogDescription>{herds.find((h) => h.id === modal.herdId)?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="milk-revenue">Annual revenue (USD)</Label>
              <Input id="milk-revenue" type="number" min="1" value={milkRevenue} onChange={(e) => setMilkRevenue(e.target.value)} />
            </div>
            {feedback && <p className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{feedback.msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleUpdateRevenue}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Pay dividends */}
      <Dialog open={modal.kind === 'pay-dividends'} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay Dividends</DialogTitle>
            <DialogDescription>All pending dividends will be distributed to investors in {wallet.preferredDividendCurrency}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="text-muted-foreground">Total payout</p>
              <p className="text-2xl font-bold">{formatCurrency(positions.reduce((s, p) => s + p.pendingDividendsUsd, 0))}</p>
            </div>
            {feedback && <p className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{feedback.msg}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
              <Button onClick={handlePayDividends}>Pay Out</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
