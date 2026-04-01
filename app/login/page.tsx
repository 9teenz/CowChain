'use client'

import Link from 'next/link'
import { CowIcon } from '@/components/icons/cow-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDemoState } from '@/components/demo-state-provider'
import { walletProviders } from '@/lib/demo-data'
import { formatCurrency } from '@/lib/utils'
import { Wallet, ArrowRightLeft, Coins } from 'lucide-react'

export default function LoginPage() {
  const {
    state: { wallet },
    connectWallet,
  } = useDemoState()

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <CowIcon className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="text-2xl">Connect a Solana Wallet</CardTitle>
            <CardDescription>
              Choose Phantom, Solflare, or Backpack to run the CowFi herd token demo, buy SPL herd shares, and claim dividends.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4">
            {walletProviders.map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => connectWallet(provider)}
                className="rounded-2xl border border-border p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{provider}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Connect {provider} and start buying herd shares at NAV or on the secondary market.
                    </p>
                  </div>
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </button>
            ))}

            {wallet.connected && (
              <Button asChild>
                <Link href="/profile">Go to wallet profile</Link>
              </Button>
            )}
          </div>

          <div className="space-y-4 rounded-3xl border border-border bg-muted/30 p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Demo wallet balances</p>
              <h2 className="mt-2 text-2xl font-bold">Ready-to-trade sandbox</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">SOL</p>
                <p className="mt-2 text-xl font-semibold">{wallet.solBalance.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Stablecoin</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(wallet.stablecoinBalance)}</p>
              </div>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                Buy herd tokens directly at NAV.
              </div>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-primary" />
                Fill P2P listings settled in SOL.
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Claim dividends in SOL or USDC from the profile page.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
