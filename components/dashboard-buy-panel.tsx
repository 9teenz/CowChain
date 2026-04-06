'use client'

import { useEffect, useMemo, useState } from 'react'
import { Coins, Loader2, Zap } from 'lucide-react'

import { useDemoState } from '@/components/demo-state-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthGuard } from '@/hooks/use-auth-guard'
import { buyCowChainWithPhantom, type BuyCowChainQuote } from '@/lib/cowchain-purchase'
import { calculateNavPurchaseQuote } from '@/lib/solana-contract'
import { formatCurrency, formatNumber } from '@/lib/utils'

function buildLocalQuote(herdId: string, herdName: string, tokenAmount: number, navPerTokenUsd: number): BuyCowChainQuote {
  const preview = calculateNavPurchaseQuote({ tokenAmount, navPerTokenUsd })

  return {
    ok: true,
    herdId,
    herdName,
    symbol: 'CowChain',
    tokenAmount: preview.tokenAmount,
    navPerTokenUsd: preview.navPerTokenUsd,
    usdTotal: preview.usdTotal,
    solUsdRate: preview.solUsdRate,
    solTotal: preview.solTotal,
    lamports: preview.lamports,
    maxLamports: preview.lamports,
    slippageBps: 150,
    cluster: 'devnet',
    expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
  }
}

export function DashboardBuyPanel() {
  const {
    state: { herds, wallet, platform },
    buyAtNav,
  } = useDemoState()
  const { requireAuth } = useAuthGuard()

  const [tokenAmount, setTokenAmount] = useState('250')
  const [serverQuote, setServerQuote] = useState<BuyCowChainQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const purchaseHerd = herds[0] ?? null
  const tokenAmountValue = Number(tokenAmount)

  const previewQuote = useMemo(() => {
    if (!purchaseHerd || !Number.isFinite(tokenAmountValue) || tokenAmountValue <= 0) {
      return null
    }

    return serverQuote ?? buildLocalQuote(purchaseHerd.id, purchaseHerd.name, tokenAmountValue, platform.navPerTokenUsd)
  }, [platform.navPerTokenUsd, purchaseHerd, serverQuote, tokenAmountValue])

  useEffect(() => {
    if (!purchaseHerd || !Number.isFinite(tokenAmountValue) || tokenAmountValue <= 0) {
      setServerQuote(null)
      setQuoteError(null)
      return
    }

    let cancelled = false

    const fetchQuote = async () => {
      setIsLoadingQuote(true)
      setQuoteError(null)

      try {
        const response = await fetch('/api/buy-cowchain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            herdId: purchaseHerd.id,
            tokenAmount: tokenAmountValue,
            cluster: 'devnet',
          }),
        })

        const data = (await response.json()) as BuyCowChainQuote | { ok: false; error?: string }

        if (cancelled) {
          return
        }

        if (!response.ok || !data.ok) {
          throw new Error('error' in data ? data.error || 'Unable to quote CowChain purchase.' : 'Unable to quote CowChain purchase.')
        }

        setServerQuote(data)
      } catch (error) {
        if (cancelled) {
          return
        }

        setServerQuote(null)
        setQuoteError(error instanceof Error ? error.message : 'Using local CowChain price preview.')
      } finally {
        if (!cancelled) {
          setIsLoadingQuote(false)
        }
      }
    }

    void fetchQuote()

    return () => {
      cancelled = true
    }
  }, [purchaseHerd, tokenAmountValue])

  const handleBuy = () => {
    requireAuth(() => {
      void (async () => {
        if (!purchaseHerd || !previewQuote) {
          setFeedback('Enter a valid CowChain amount to generate a quote first.')
          return
        }

        setIsSubmitting(true)
        setFeedback(null)

        try {
          const receipt = await buyCowChainWithPhantom({
            quote: previewQuote,
            expectedWalletAddress: wallet.walletAddress || undefined,
          })

          const localResult = buyAtNav(purchaseHerd.id, previewQuote.tokenAmount, 'SOL')
          const txPreview = `${receipt.signature.slice(0, 8)}...${receipt.signature.slice(-8)}`

          setFeedback(
            localResult.ok
              ? `CowChain purchase sent on devnet. Tx ${txPreview} confirmed and dashboard balances were synced.`
              : `CowChain purchase sent on devnet. Tx ${txPreview} confirmed.`
          )
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : 'Unable to complete the SOL purchase right now.')
        } finally {
          setIsSubmitting(false)
        }
      })()
    })
  }

  return (
    <Card className="border-primary/20 bg-card/80 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Coins className="h-5 w-5 text-primary" />
              Buy CowChain with SOL
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Convert live NAV in USD into SOL and buy CowChain directly from the dashboard.
            </p>
          </div>
          <div className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            Devnet
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium">Token amount</label>
          <Input
            inputMode="decimal"
            min="1"
            step="1"
            value={tokenAmount}
            onChange={(event) => setTokenAmount(event.target.value)}
            placeholder="250"
          />
        </div>

        {purchaseHerd && previewQuote ? (
          <div className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">CowChain Price</p>
              <p className="mt-1 font-semibold">{formatCurrency(platform.navPerTokenUsd)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">USD total</p>
              <p className="mt-1 font-semibold">{formatCurrency(previewQuote.usdTotal)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">SOL total</p>
              <p className="mt-1 font-semibold">{formatNumber(previewQuote.solTotal)} SOL</p>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Zap className="mt-0.5 h-4 w-4 text-primary" />
            <div className="space-y-1">
              <p>
                Wallet status: <span className="font-medium text-foreground">{wallet.connected ? `Connected (${wallet.provider || 'wallet'})` : 'Connect Phantom first'}</span>
              </p>
              <p>
                {isLoadingQuote ? 'Refreshing devnet SOL quote…' : quoteError || 'Live CowChain price quote is ready for signing.'}
              </p>
              {!process.env.NEXT_PUBLIC_COWCHAIN_SOL_TREASURY ? (
                <p className="text-amber-600">
                  Set `NEXT_PUBLIC_COWCHAIN_SOL_TREASURY` to enable on-chain SOL settlement.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {feedback ? <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm">{feedback}</div> : null}

        <Button className="w-full" onClick={handleBuy} disabled={isSubmitting || !previewQuote || !wallet.connected}>
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending SOL purchase...
            </span>
          ) : (
            'Buy CowChain with SOL'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
