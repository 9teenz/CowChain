'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useSession } from 'next-auth/react'
import { Sun, Moon, Wallet, Menu, X, User, Coins, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { CowIcon } from '@/components/icons/cow-icon'
import { useDemoState } from '@/components/demo-state-provider'
import { shortenWallet } from '@/lib/solana-contract'

type Cluster = 'mainnet-beta' | 'devnet' | 'testnet'
type PhantomRequestProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}
function isCluster(value: unknown): value is Cluster {
  return value === 'mainnet-beta' || value === 'devnet' || value === 'testnet'
}

const navLinks = [
  { href: '/', label: 'Dashboard' },
  { href: '/marketplace', label: 'Marketplace' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/analytics', label: 'Analytics' },
]

export function Navbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const {
    state: { wallet },
    portfolioSummary,
  } = useDemoState()
  const { data: session, status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [solBalance, setSolBalance] = useState<number | null>(null)
  const [isSolLoading, setIsSolLoading] = useState(false)

  // Show wallet address only when demo state says wallet is actively connected
  const activeWalletAddress = wallet.connected ? wallet.walletAddress : null

  const fetchSolBalance = async () => {
    if (!activeWalletAddress) return
    setIsSolLoading(true)
    try {
      let preferredCluster: Cluster | 'auto' = 'auto'
      try {
        const provider = (window as Window & { solana?: PhantomRequestProvider }).solana
        const providerCluster = await provider?.request?.({ method: 'getCluster' })
        if (isCluster(providerCluster)) preferredCluster = providerCluster
      } catch { /* fallback */ }
      const params = new URLSearchParams({ address: activeWalletAddress, cluster: preferredCluster })
      let res = await fetch(`/api/wallet/balance?${params.toString()}`, { cache: 'no-store' })
      let data = (await res.json()) as { ok: boolean; sol?: number }
      if ((!res.ok || !data.ok) && preferredCluster !== 'auto') {
        const p2 = new URLSearchParams({ address: activeWalletAddress, cluster: 'auto' })
        res = await fetch(`/api/wallet/balance?${p2.toString()}`, { cache: 'no-store' })
        data = (await res.json()) as { ok: boolean; sol?: number }
      }
      setSolBalance(data.ok && data.sol !== undefined ? data.sol : null)
    } catch {
      setSolBalance(null)
    } finally {
      setIsSolLoading(false)
    }
  }

  useEffect(() => {
    if (!activeWalletAddress) {
      setSolBalance(null)
      return
    }
    fetchSolBalance()
  }, [activeWalletAddress])

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center">
              <CowIcon className="h-8 w-8" />
            </div>
            <span className="text-xl font-bold text-foreground">CowFi</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-muted-foreground hover:text-foreground group"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 transition-transform duration-300 group-hover:rotate-45" />
                ) : (
                  <Moon className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-12" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}

            {/* Farmer Dashboard Link */}
            <Button
              variant={pathname === '/farmer' ? 'default' : 'outline'}
              size="sm"
              asChild
              className="hidden items-center gap-1.5 sm:flex"
            >
              <Link href="/farmer">
                <CowIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Farmer</span>
              </Link>
            </Button>

            {/* Profile Link */}
            <Button variant="ghost" size="icon" asChild className="hidden sm:flex">
              <Link href={isAuthenticated ? '/profile' : '/signup'}>
                <User className="h-5 w-5" />
                <span className="sr-only">Profile</span>
              </Link>
            </Button>

            {wallet.connected && (
              <div className="hidden items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm text-muted-foreground lg:flex">
                <Coins className="h-4 w-4 text-primary" />
                <span>{portfolioSummary.pendingDividendsUsd.toFixed(2)} pending</span>
              </div>
            )}

            {!activeWalletAddress && (
              <Button className="hidden gap-2 sm:flex" asChild>
                <Link href={isAuthenticated ? '/connect-wallet' : '/login'}>
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </Link>
              </Button>
            )}

            {activeWalletAddress && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="hidden items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent sm:flex">
                    <Wallet className="h-4 w-4 text-primary" />
                    {solBalance !== null ? (
                      <span>{solBalance.toFixed(4)} SOL</span>
                    ) : (
                      <span className="text-muted-foreground">Wallet</span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Wallet</span>
                    </div>
                    <div className="rounded-lg bg-muted px-3 py-2">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="mt-0.5 font-mono text-sm">{shortenWallet(activeWalletAddress)}</p>
                    </div>
                    <div className="rounded-lg bg-muted px-3 py-2">
                      <p className="text-xs text-muted-foreground">Balance SOL</p>
                      <p className="mt-0.5 text-lg font-bold">
                        {isSolLoading ? 'Loading...' : solBalance !== null ? `${solBalance.toFixed(4)} SOL` : '—'}
                      </p>
                    </div>
                    <button
                      onClick={fetchSolBalance}
                      disabled={isSolLoading}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh balance
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-border py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/farmer"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  pathname === '/farmer'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <CowIcon className="h-4 w-4" />
                Farmer
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Profile
              </Link>
              {!activeWalletAddress ? (
                <Button className="mt-2 gap-2" asChild>
                  <Link href={isAuthenticated ? '/connect-wallet' : '/login'}>
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                  </Link>
                </Button>
              ) : (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="font-mono">{shortenWallet(activeWalletAddress)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
