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
  upsertTokenMetadataWithPhantom,
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

function buildGeneratedMetadataUrl(name: string, symbol: string) {
  if (typeof window === 'undefined') {
    return ''
  }

  const url = new URL('/api/token-metadata', window.location.origin)
  url.searchParams.set('name', name.trim() || 'MilkChain Token')
  url.searchParams.set('symbol', symbol.trim().toUpperCase() || 'MILK')
  return url.toString()
}

export default function TokenAdminPage() {
  const { data: session, status } = useSession()
  const {
    state: { wallet },
    setPlatformMint,
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
    uri: '',
  })

  const [metadataForm, setMetadataForm] = useState({
    mintAddress: '',
    name: 'MilkChain Token',
    symbol: 'MILK',
    uri: '',
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
  const generatedCreateMetadataUrl = useMemo(
    () => buildGeneratedMetadataUrl(createForm.name, createForm.symbol),
    [createForm.name, createForm.symbol]
  )
  const generatedFixMetadataUrl = useMemo(
    () => buildGeneratedMetadataUrl(metadataForm.name, metadataForm.symbol),
    [metadataForm.name, metadataForm.symbol]
  )

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
        setPlatformMint(data.mintAddress as string)
        setMintForm((current) => ({ ...current, mintAddress: data.mintAddress as string }))
        setInspectForm((current) => ({ ...current, mintAddress: data.mintAddress as string }))
        setMetadataForm((current) => ({ ...current, mintAddress: data.mintAddress as string }))
      }

      if (data.metadata && typeof data.metadata === 'object') {
        const metadata = data.metadata as Record<string, unknown>
        setMetadataForm((current) => ({
          ...current,
          name: typeof metadata.name === 'string' ? metadata.name : current.name,
          symbol: typeof metadata.symbol === 'string' ? metadata.symbol : current.symbol,
          uri: typeof metadata.uri === 'string' ? metadata.uri : current.uri,
        }))
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
            Use the Phantom wallet linked to your account to create a real SPL mint, write Phantom metadata, issue supply, and lock minting.
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
                  ? `Phantom connected via profile: ${shortenWallet(linkedWalletAddress)}`
                  : `Phantom wallet is linked in your profile: ${shortenWallet(linkedWalletAddress)}`
                : 'Open Profile or Connect Wallet and link your Phantom wallet to this account.'}
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
            <p>• Fix Phantom name + avatar</p>
            <p>• Mint extra supply</p>
            <p>• Inspect holders and supply</p>
            <p>• Revoke mint authority</p>
          </CardContent>
        </Card>
      </div>

      {feedback ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{feedback}</div> : null}
      {error ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Create new SPL token
            </CardTitle>
            <CardDescription>
              Creates the mint, writes Metaplex metadata for Phantom, and optionally issues the first supply.
            </CardDescription>
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
              <Label htmlFor="token-uri">Metadata JSON URL (optional)</Label>
              <Input
                id="token-uri"
                placeholder="Leave empty to auto-generate from Name and Symbol"
                value={createForm.uri}
                onChange={(event) => setCreateForm((current) => ({ ...current, uri: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                If left empty, MilkChain will generate it automatically: {generatedCreateMetadataUrl || '—'}
              </p>
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
                    uri: createForm.uri.trim() || generatedCreateMetadataUrl || undefined,
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Fix Phantom metadata
            </CardTitle>
            <CardDescription>
              Creates or updates the Metaplex metadata so Phantom can show the token name and avatar.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="metadata-mint-address">Mint address</Label>
              <Input
                id="metadata-mint-address"
                value={metadataForm.mintAddress}
                onChange={(event) => setMetadataForm((current) => ({ ...current, mintAddress: event.target.value }))}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="metadata-name">Name</Label>
                <Input
                  id="metadata-name"
                  value={metadataForm.name}
                  onChange={(event) => setMetadataForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metadata-symbol">Symbol</Label>
                <Input
                  id="metadata-symbol"
                  value={metadataForm.symbol}
                  onChange={(event) => setMetadataForm((current) => ({ ...current, symbol: event.target.value.toUpperCase() }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata-uri">Metadata JSON URL (optional)</Label>
              <Input
                id="metadata-uri"
                placeholder="Leave empty to auto-generate from Name and Symbol"
                value={metadataForm.uri}
                onChange={(event) => setMetadataForm((current) => ({ ...current, uri: event.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                If left empty, MilkChain will use: {generatedFixMetadataUrl || '—'}
              </p>
            </div>

            <Button
              onClick={() => runAction(
                'upsertMetadata',
                async () =>
                  upsertTokenMetadataWithPhantom({
                    cluster,
                    expectedWalletAddress: linkedWalletAddress,
                    mintAddress: metadataForm.mintAddress,
                    name: metadataForm.name,
                    symbol: metadataForm.symbol,
                    uri: metadataForm.uri.trim() || generatedFixMetadataUrl || undefined,
                  }),
                'Token metadata updated. Phantom may need a refresh to show the new avatar.'
              )}
              disabled={busyAction !== null || !linkedWalletAddress || !metadataForm.mintAddress.trim()}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {busyAction === 'upsertMetadata' ? 'Updating…' : 'Apply metadata'}
            </Button>
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
