'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  Coins,
  ExternalLink,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  WandSparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDemoState } from '@/components/demo-state-provider'
import {
  createTokenWithPhantom,
  disableMintAuthorityWithPhantom,
  mintTokenWithPhantom,
} from '@/lib/phantom-spl-token'
import { shortenWallet } from '@/lib/solana-contract'

type Cluster = 'devnet' | 'testnet' | 'mainnet-beta'

type AdminStatus = {
  ok: boolean
  configured?: boolean
  cluster?: Cluster
  rpcUrl?: string
  adminPublicKey?: string | null
  setupMessage?: string
  error?: string
}

function explorerUrl(kind: 'address' | 'tx', value: string, cluster: Cluster) {
  const suffix = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`
  return `https://explorer.solana.com/${kind}/${value}${suffix}`
}

export default function TokenAdminPage() {
  const { data: session, status } = useSession()
  const {
    state: { wallet },
  } = useDemoState()
  const [cluster, setCluster] = useState<Cluster>('devnet')
  const [statusData, setStatusData] = useState<AdminStatus | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const [createForm, setCreateForm] = useState({
    name: 'MilkChain Token',
    symbol: 'MILK',
    decimals: '6',
    initialSupply: '1000000',
    recipient: '',
    uri: 'https://example.com/milkchain-token.json',
  })

  const [mintForm, setMintForm] = useState({
    mintAddress: '',
    amount: '1000',
    recipient: '',
  })

  const [inspectForm, setInspectForm] = useState({
    mintAddress: '',
    holder: '',
  })

  const canManageTokens = useMemo(() => {
    const role = session?.user?.role?.toLowerCase()
    return role === 'admin' || role === 'farmer'
  }, [session?.user?.role])

  const linkedWalletAddress = session?.user?.walletAddress || null
  const isLinkedWalletConnected = !!linkedWalletAddress && wallet.connected && wallet.walletAddress === linkedWalletAddress

  const loadStatus = async (targetCluster: Cluster) => {
    const response = await fetch(`/api/admin/spl-token?cluster=${targetCluster}`, { cache: 'no-store' })
    const data = (await response.json()) as AdminStatus
    setStatusData(data)

    if (!response.ok || !data.ok) {
      setError(data.error || 'Failed to load token admin status.')
      return
    }

    setError(null)
  }

  useEffect(() => {
    if (status === 'authenticated' && canManageTokens) {
      loadStatus(cluster)
    }
  }, [status, canManageTokens, cluster])

  const runAction = async (
    actionName: string,
    action: () => Promise<Record<string, unknown>>,
    successMessage: string
  ) => {
    setBusyAction(actionName)
    setFeedback(null)
    setError(null)

    try {
      const data = await action()
      setResult(data)
      setFeedback(successMessage)

      if (typeof data.mintAddress === 'string') {
        setMintForm((current) => ({ ...current, mintAddress: data.mintAddress as string }))
        setInspectForm((current) => ({ ...current, mintAddress: data.mintAddress as string }))
      }

      await loadStatus(cluster)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Token action failed.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleInspect = async () => {
    if (!inspectForm.mintAddress.trim()) {
      setError('Enter a mint address first.')
      return
    }

    setBusyAction('inspect')
    setFeedback(null)
    setError(null)

    try {
      const params = new URLSearchParams({ mint: inspectForm.mintAddress.trim(), cluster })
      if (inspectForm.holder.trim()) {
        params.set('holder', inspectForm.holder.trim())
      }

      const response = await fetch(`/api/admin/spl-token?${params.toString()}`, { cache: 'no-store' })
      const data = (await response.json()) as { ok?: boolean; error?: string } & Record<string, unknown>

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to inspect mint.')
      }

      setResult(data)
      setFeedback('Mint information refreshed.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to inspect mint.')
    } finally {
      setBusyAction(null)
    }
  }

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading token admin access…</CardContent>
        </Card>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>SPL Token Admin</CardTitle>
            <CardDescription>Sign in before creating and minting Solana tokens.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">Go to login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!canManageTokens) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              The token issuer dashboard is available for `admin` and `farmer` roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your current role is <strong>{session?.user?.role || 'unknown'}</strong>.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Token Admin
            </Badge>
            <Badge variant="outline">{cluster}</Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">SPL Token Issuer Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use the Phantom wallet linked to your account to create a real SPL mint, issue supply, and lock minting.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={cluster}
            onChange={(event) => setCluster(event.target.value as Cluster)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="devnet">devnet</option>
            <option value="testnet">testnet</option>
            <option value="mainnet-beta">mainnet-beta</option>
          </select>
          <Button variant="outline" onClick={() => loadStatus(cluster)} disabled={busyAction !== null}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Issuer wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground">
              <Wallet className="h-4 w-4 text-primary" />
              <p className="font-mono break-all">{linkedWalletAddress || 'Link Phantom wallet first'}</p>
            </div>
            <p>
              {linkedWalletAddress
                ? isLinkedWalletConnected
                  ? `Phantom connected: ${shortenWallet(linkedWalletAddress)}`
                  : 'Phantom wallet is linked to your account. Reconnect it in the browser before minting.'
                : 'Open Connect Wallet and link your Phantom wallet to this account.'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">RPC endpoint</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p className="break-all">{statusData?.rpcUrl || '—'}</p>
            <p>Cluster: {statusData?.cluster || cluster}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">What you can do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>• Create SPL mint + supply</p>
            <p>• Mint extra supply</p>
            <p>• Inspect holders and supply</p>
            <p>• Revoke mint authority</p>
          </CardContent>
        </Card>
      </div>

      {!linkedWalletAddress ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex flex-col gap-3 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Phantom wallet not linked</p>
              <p>Before minting, link the same Phantom wallet to your account.</p>
            </div>
            <Button asChild>
              <Link href="/connect-wallet">Connect Wallet</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {feedback ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{feedback}</div> : null}
      {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Create new SPL token
            </CardTitle>
            <CardDescription>Creates the mint and optionally issues the first supply to a wallet.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="token-name">Name</Label>
                <Input id="token-name" value={createForm.name} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token-symbol">Symbol</Label>
                <Input id="token-symbol" value={createForm.symbol} onChange={(event) => setCreateForm((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))} />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="token-decimals">Decimals</Label>
                <Input id="token-decimals" type="number" min={0} max={9} value={createForm.decimals} onChange={(event) => setCreateForm((current) => ({ ...current, decimals: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="token-supply">Initial supply</Label>
                <Input id="token-supply" value={createForm.initialSupply} onChange={(event) => setCreateForm((current) => ({ ...current, initialSupply: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-recipient">Recipient wallet</Label>
              <Input id="token-recipient" placeholder="Defaults to linked Phantom wallet" value={createForm.recipient} onChange={(event) => setCreateForm((current) => ({ ...current, recipient: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="token-uri">Metadata / project URI</Label>
              <Input id="token-uri" value={createForm.uri} onChange={(event) => setCreateForm((current) => ({ ...current, uri: event.target.value }))} />
            </div>

            <Button
              onClick={() => runAction(
                'create',
                async () =>
                  createTokenWithPhantom({
                    cluster,
                    expectedWalletAddress: linkedWalletAddress,
                    name: createForm.name,
                    symbol: createForm.symbol,
                    decimals: Number(createForm.decimals),
                    initialSupply: createForm.initialSupply,
                    recipient: createForm.recipient || undefined,
                    uri: createForm.uri || undefined,
                    enableFreezeAuthority: true,
                  }),
                'SPL token mint created successfully.'
              )}
              disabled={busyAction !== null || !linkedWalletAddress}
            >
              <Plus className="mr-2 h-4 w-4" />
              {busyAction === 'create' ? 'Creating…' : 'Create token'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              Mint more supply
            </CardTitle>
            <CardDescription>Issue additional tokens to the treasury wallet or a specific investor wallet.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="mint-address">Mint address</Label>
              <Input id="mint-address" value={mintForm.mintAddress} onChange={(event) => setMintForm((current) => ({ ...current, mintAddress: event.target.value }))} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mint-amount">Amount</Label>
                <Input id="mint-amount" value={mintForm.amount} onChange={(event) => setMintForm((current) => ({ ...current, amount: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mint-recipient">Recipient wallet</Label>
                <Input id="mint-recipient" placeholder="Defaults to linked Phantom wallet" value={mintForm.recipient} onChange={(event) => setMintForm((current) => ({ ...current, recipient: event.target.value }))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => runAction(
                  'mint',
                  async () =>
                    mintTokenWithPhantom({
                      cluster,
                      expectedWalletAddress: linkedWalletAddress,
                      mintAddress: mintForm.mintAddress,
                      amount: mintForm.amount,
                      recipient: mintForm.recipient || undefined,
                    }),
                  'Additional supply minted successfully.'
                )}
                disabled={busyAction !== null || !linkedWalletAddress}
              >
                <WandSparkles className="mr-2 h-4 w-4" />
                {busyAction === 'mint' ? 'Minting…' : 'Mint tokens'}
              </Button>

              <Button
                variant="outline"
                onClick={() => runAction(
                  'disableMintAuthority',
                  async () =>
                    disableMintAuthorityWithPhantom({
                      cluster,
                      expectedWalletAddress: linkedWalletAddress,
                      mintAddress: mintForm.mintAddress,
                    }),
                  'Mint authority revoked. Supply is now capped.'
                )}
                disabled={busyAction !== null || !mintForm.mintAddress.trim() || !linkedWalletAddress}
              >
                {busyAction === 'disableMintAuthority' ? 'Locking…' : 'Revoke mint authority'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inspect a mint</CardTitle>
          <CardDescription>Check current supply, authorities, and an optional holder balance.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="inspect-mint-address">Mint address</Label>
            <Input id="inspect-mint-address" value={inspectForm.mintAddress} onChange={(event) => setInspectForm((current) => ({ ...current, mintAddress: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inspect-holder">Holder wallet</Label>
            <Input id="inspect-holder" value={inspectForm.holder} onChange={(event) => setInspectForm((current) => ({ ...current, holder: event.target.value }))} />
          </div>
          <div className="flex items-end">
            <Button className="w-full md:w-auto" variant="outline" onClick={handleInspect} disabled={busyAction !== null}>
              {busyAction === 'inspect' ? 'Loading…' : 'Inspect'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Latest result</CardTitle>
            <CardDescription>Use the explorer links below to verify the on-chain state.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {typeof result.mintAddress === 'string' ? (
                <a
                  href={explorerUrl('address', result.mintAddress, cluster)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 hover:bg-accent"
                >
                  View mint
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}

              {['signature', 'mintSignature', 'metadataSignature'].map((key) => {
                const value = result[key]
                if (typeof value !== 'string' || !value) {
                  return null
                }

                return (
                  <a
                    key={key}
                    href={explorerUrl('tx', value, cluster)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 hover:bg-accent"
                  >
                    {key}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )
              })}
            </div>

            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs text-muted-foreground">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
