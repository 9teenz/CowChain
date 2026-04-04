'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { CowIcon } from '@/components/icons/cow-icon'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useDemoState } from '@/components/demo-state-provider'
import { Wallet } from 'lucide-react'

type PhantomConnectResponse = {
  publicKey: {
    toString: () => string
  }
}

type PhantomProvider = {
  isPhantom?: boolean
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<PhantomConnectResponse>
}

export default function ConnectWalletPage() {
  const router = useRouter()
  const { status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    connectWallet,
  } = useDemoState()

  const handleWalletLogin = async () => {
    setIsLoading(true)
    setError(null)

    const phantom = (window as Window & { solana?: PhantomProvider }).solana
    if (!phantom?.isPhantom) {
      setIsLoading(false)
      setError('Phantom extension not found. Install Phantom and try again.')
      return
    }

    let walletAddress = ''

    try {
      const connected = await phantom.connect()
      walletAddress = connected.publicKey.toString()
    } catch {
      setIsLoading(false)
      setError('Phantom connection was canceled.')
      return
    }

    // Keep current authenticated identity intact and only link the wallet.
    if (status === 'authenticated') {
      const linkResponse = await fetch('/api/wallet/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          walletProvider: 'Phantom',
        }),
      })

      const linkData = (await linkResponse.json()) as { error?: string; message?: string }
      setIsLoading(false)

      if (!linkResponse.ok) {
        setError(linkData.error || 'Failed to link wallet to your account.')
        return
      }

      connectWallet('Phantom', walletAddress)
      router.push('/profile')
      router.refresh()
      return
    }

    const result = await signIn('wallet', {
      walletAddress,
      walletProvider: 'Phantom',
      redirect: false,
    })

    setIsLoading(false)

    if (result?.error) {
      setError('Wallet sign-in failed. Please try again.')
      return
    }

    connectWallet('Phantom', walletAddress)
    router.push('/profile')
    router.refresh()
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-3xl">
        <CardHeader className="space-y-4 text-center">
          <CowIcon className="mx-auto h-12 w-12" />
          <div>
            <CardTitle className="text-2xl">Connect Wallet</CardTitle>
            <CardDescription>
              Choose your Solana wallet provider to continue.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <button
            type="button"
            onClick={handleWalletLogin}
            disabled={isLoading}
            className="w-full rounded-2xl border border-border p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">Phantom</p>
                <p className="mt-1 text-sm text-muted-foreground">Connect Phantom wallet.</p>
              </div>
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </button>

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <p className="text-center text-sm text-muted-foreground">
            Prefer email login?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Go to sign in
            </Link>
          </p>

          <Button variant="outline" className="w-full" asChild>
            <Link href="/signup">Create account</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
