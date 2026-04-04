'use client'

import { useMemo, useState } from 'react'
import { getAvailableTokens, useDemoState } from '@/components/demo-state-provider'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/stat-card'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { listingPremiumPct, shortenWallet } from '@/lib/solana-contract'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Coins, ArrowUpDown, Wallet, TrendingUp, Plus } from 'lucide-react'

type SortKey = 'recent' | 'price-asc' | 'price-desc' | 'return-desc'

export default function MarketplacePage() {
  const {
    state: { platform, herds, listings, positions },
    buyListing,
    listTokens,
  } = useDemoState()
  const [selectedHerd, setSelectedHerd] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('recent')
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [feedback, setFeedback] = useState<string | null>(null)
  const [sellOpen, setSellOpen] = useState(false)
  const [sellHerdId, setSellHerdId] = useState('')
  const [listingAmount, setListingAmount] = useState('250')
  const [listingPrice, setListingPrice] = useState('1.12')
  const { requireAuth } = useAuthGuard()

  const filteredListings = useMemo(() => {
    const items = listings.filter((listing) =>
      selectedHerd === 'all' ? true : listing.herdId === selectedHerd
    )

    return items.sort((left, right) => {
      if (sortKey === 'price-asc') {
        return left.pricePerTokenUsd - right.pricePerTokenUsd
      }

      if (sortKey === 'price-desc') {
        return right.pricePerTokenUsd - left.pricePerTokenUsd
      }

      if (sortKey === 'return-desc') {
        const leftHerd = herds.find((item) => item.id === left.herdId)
        const rightHerd = herds.find((item) => item.id === right.herdId)
        return (
          listingPremiumPct(right.pricePerTokenUsd, platform.navPerTokenUsd) -
          listingPremiumPct(left.pricePerTokenUsd, platform.navPerTokenUsd)
        )
      }
      return 0
    })
  }, [herds, listings, selectedHerd, sortKey])

  const activeTokens = filteredListings.reduce((sum, listing) => sum + listing.tokensAvailable, 0)
  const averagePremium = filteredListings.length
    ? filteredListings.reduce((sum, listing) => {
        const herd = herds.find((item) => item.id === listing.herdId)
        return sum + listingPremiumPct(listing.pricePerTokenUsd, platform.navPerTokenUsd)
      }, 0) / filteredListings.length
    : 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">P2P Marketplace</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Buyers fill existing listings in SOL while receiving herd tokens at the matched price. Sort by herd, price, or return spread against NAV.
          </p>
        </div>
        <Button onClick={() => requireAuth(() => setSellOpen(true))} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Sell Tokens
        </Button>
      </div>

      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sell My Tokens</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Herd</label>
              <select
                value={sellHerdId}
                onChange={(event) => setSellHerdId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select herd…</option>
                {herds.map((herd) => (
                  <option key={herd.id} value={herd.id}>{herd.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Tokens to list</label>
                <Input value={listingAmount} onChange={(event) => setListingAmount(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Price per token</label>
                <Input value={listingPrice} onChange={(event) => setListingPrice(event.target.value)} />
              </div>
            </div>
            {sellHerdId && (() => {
              const pos = positions.find((item) => item.herdId === sellHerdId)
              return (
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Unlocked tokens available: {formatNumber(getAvailableTokens(pos ?? null))}
                </div>
              )
            })()}
            <Button
              className="w-full"
              onClick={() => {
                if (!sellHerdId) { setFeedback('Please select a herd.'); setSellOpen(false); return }
                const result = listTokens(sellHerdId, Number(listingAmount), Number(listingPrice))
                setFeedback(result.message)
                setSellOpen(false)
              }}
            >
              Post sell order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Listings" value={formatNumber(filteredListings.length)} icon={ArrowUpDown} />
        <StatCard title="Tokens For Sale" value={formatNumber(activeTokens)} icon={Coins} />
        <StatCard title="Avg. vs CowChain" value={`${averagePremium.toFixed(2)}%`} icon={TrendingUp} />
        <StatCard title="Settlement Rail" value="SOL" change="Seller receives SOL on fill" changeType="neutral" icon={Wallet} />
      </div>

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Order Book</CardTitle>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedHerd}
              onChange={(event) => setSelectedHerd(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All herds</option>
              {herds.map((herd) => (
                <option key={herd.id} value={herd.id}>{herd.name}</option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="recent">Newest listings</option>
              <option value="price-asc">Lowest price</option>
              <option value="price-desc">Highest price</option>
              <option value="return-desc">Highest % return</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {feedback && (
            <div className="mb-4 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              {feedback}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Herd Name</th>
                  <th className="pb-3 font-medium">Tokens</th>
                  <th className="pb-3 font-medium">Price</th>
                  <th className="pb-3 font-medium">CowChain</th>
                  <th className="pb-3 font-medium">% Return</th>
                  <th className="pb-3 font-medium">Seller</th>
                  <th className="pb-3 font-medium">Buy Amount</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map((listing) => {
                  const herd = herds.find((item) => item.id === listing.herdId)
                  const premium = listingPremiumPct(listing.pricePerTokenUsd, platform.navPerTokenUsd)
                  const quantityValue = quantities[listing.id] ?? String(Math.min(250, listing.tokensAvailable))

                  return (
                    <tr key={listing.id} className="border-b border-border last:border-0">
                      <td className="py-4 font-medium">{listing.herdName}</td>  
                      <td className="py-4">{formatNumber(listing.tokensAvailable)}</td>
                      <td className="py-4">{formatCurrency(listing.pricePerTokenUsd)}</td>
                      <td className="py-4">{formatCurrency(platform.navPerTokenUsd)}</td>
                      <td className={`py-4 font-medium ${premium >= 0 ? 'text-primary' : 'text-chart-5'}`}>
                        {premium > 0 ? '+' : ''}{premium}%
                      </td>
                      <td className="py-4 font-mono text-muted-foreground">{shortenWallet(listing.sellerWallet)}</td>
                      <td className="py-4">
                        <Input
                          type="number"
                          min={1}
                          max={listing.tokensAvailable}
                          value={quantityValue}
                          onChange={(event) =>
                            setQuantities((current) => ({
                              ...current,
                              [listing.id]: event.target.value,
                            }))
                          }
                          className="w-28"
                        />
                      </td>
                      <td className="py-4">
                        <Button
                          size="sm"
                          onClick={() =>
                            requireAuth(() => {
                              const result = buyListing(listing.id, Number(quantityValue))
                              setFeedback(result.message)
                            })
                          }
                        >
                          Buy
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

    </div>
  )
}