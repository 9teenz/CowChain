'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  buildActionLabel,
  calculateNavAfterSale,
  calculateUserDividend,
  generateDemoSignature,
  listingPremiumPct,
  projectedMarketValue,
  usdToSol,
} from '@/lib/solana-contract'
import type {
  CowSaleEvent,
  DemoState,
  HerdPool,
  MarketplaceListing,
  TransactionItem,
  UserPosition,
  WalletProviderName,
} from '@/lib/demo-data'
import { initialDemoState } from '@/lib/demo-data'

const STORAGE_KEY = 'cowfi-demo-state'

type ActionResult = {
  ok: boolean
  message: string
  txId?: string
}

type BuyCurrency = 'SOL' | 'USDC'

interface DemoStateContextValue {
  isHydrated: boolean
  state: DemoState
  connectWallet: (provider: WalletProviderName, walletAddress?: string) => ActionResult
  disconnectWallet: () => void
  setPreferredDividendCurrency: (currency: BuyCurrency) => void
  buyAtNav: (herdId: string, tokenAmount: number, currency: BuyCurrency) => ActionResult
  listTokens: (herdId: string, tokenAmount: number, pricePerTokenUsd: number) => ActionResult
  buyListing: (listingId: string, tokenAmount: number) => ActionResult
  claimDividends: (currency: BuyCurrency) => ActionResult
  simulateCowSale: (herdId: string, salePriceUsd: number, currency: BuyCurrency) => ActionResult
  portfolioSummary: {
    totalTokensOwned: number
    totalHerdShares: number
    currentNavValueUsd: number
    marketValueUsd: number
    totalDividendsEarnedUsd: number
    pendingDividendsUsd: number
  }
}

const DemoStateContext = createContext<DemoStateContextValue | null>(null)

function syncMarketMetrics(herds: HerdPool[], listings: MarketplaceListing[]) {
  return herds.map((herd) => {
    const herdListings = listings
      .filter((listing) => listing.herdId === herd.id && listing.tokensAvailable > 0)
      .sort((left, right) => left.pricePerTokenUsd - right.pricePerTokenUsd)

    const cheapestListing = herdListings[0]
    const marketPriceUsd = cheapestListing?.pricePerTokenUsd ?? herd.navPerTokenUsd

    return {
      ...herd,
      marketPriceUsd,
    }
  })
}

function pushTransaction(state: DemoState, transaction: TransactionItem) {
  return {
    ...state,
    transactions: [transaction, ...state.transactions].slice(0, 12),
  }
}

function updateSeriesValue(series: DemoState['portfolioValueSeries'], value: number) {
  return series.map((point, index) =>
    index === series.length - 1 ? { ...point, value: Math.round(value) } : point
  )
}

function updateDividendSeries(series: DemoState['dividendSeries'], delta: number) {
  return series.map((point, index) =>
    index === series.length - 1 ? { ...point, value: Math.round(point.value + delta) } : point
  )
}

export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialDemoState)
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setState(JSON.parse(raw) as DemoState)
      }
    } catch {
      setState(initialDemoState)
    } finally {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [isHydrated, state])

  const connectWallet = (provider: WalletProviderName, walletAddress?: string): ActionResult => {
    setState((current) => ({
      ...current,
      wallet: {
        ...current.wallet,
        connected: true,
        provider,
        walletAddress: walletAddress || current.wallet.walletAddress,
      },
    }))

    return {
      ok: true,
      message: `${provider} connected to CowFi demo`,
    }
  }

  const disconnectWallet = () => {
    setState((current) => ({
      ...current,
      wallet: {
        ...current.wallet,
        connected: false,
        provider: null,
        walletAddress: '',
      },
    }))
  }

  const setPreferredDividendCurrency = (currency: BuyCurrency) => {
    setState((current) => ({
      ...current,
      wallet: {
        ...current.wallet,
        preferredDividendCurrency: currency,
      },
    }))
  }

  const buyAtNav = (herdId: string, tokenAmount: number, currency: BuyCurrency): ActionResult => {
    if (!state.wallet.connected) {
      return { ok: false, message: 'Connect a wallet before buying herd shares.' }
    }

    if (tokenAmount <= 0) {
      return { ok: false, message: 'Choose a positive token amount.' }
    }

    const herd = state.herds.find((item) => item.id === herdId)
    if (!herd) {
      return { ok: false, message: 'Herd not found.' }
    }

    if (tokenAmount > herd.availableDirectTokens) {
      return { ok: false, message: 'Requested amount exceeds direct platform inventory.' }
    }

    const totalUsd = tokenAmount * herd.navPerTokenUsd
    const totalSol = usdToSol(totalUsd)

    if (currency === 'USDC' && state.wallet.stablecoinBalance < totalUsd) {
      return { ok: false, message: 'Not enough stablecoin balance for this NAV purchase.' }
    }

    if (currency === 'SOL' && state.wallet.solBalance < totalSol) {
      return { ok: false, message: 'Not enough SOL balance for this NAV purchase.' }
    }

    const txId = generateDemoSignature()

    setState((current) => {
      const herds = current.herds.map((item) =>
        item.id === herdId
          ? {
              ...item,
              availableDirectTokens: item.availableDirectTokens - tokenAmount,
            }
          : item
      )

      const existingPosition = current.positions.find((position) => position.herdId === herdId)
      const positions = existingPosition
        ? current.positions.map((position) =>
            position.herdId === herdId
              ? {
                  ...position,
                  tokensOwned: position.tokensOwned + tokenAmount,
                  averageCostUsd: Number(
                    (
                      (position.averageCostUsd * position.tokensOwned + totalUsd) /
                      (position.tokensOwned + tokenAmount)
                    ).toFixed(4)
                  ),
                }
              : position
          )
        : [
            ...current.positions,
            {
              herdId,
              herdName: herd.name,
              tokensOwned: tokenAmount,
              listedTokens: 0,
              averageCostUsd: herd.navPerTokenUsd,
              claimedDividendsUsd: 0,
              pendingDividendsUsd: 0,
            },
          ]

      const transaction: TransactionItem = {
        id: `txn-${txId}`,
        kind: 'nav-buy',
        label: buildActionLabel('nav', herd.name),
        amountUsd: Number(totalUsd.toFixed(2)),
        currency,
        txId,
        timestamp: new Date().toISOString(),
      }

      const nextState = pushTransaction(
        {
          ...current,
          wallet: {
            ...current.wallet,
            solBalance: currency === 'SOL' ? Number((current.wallet.solBalance - totalSol).toFixed(4)) : current.wallet.solBalance,
            stablecoinBalance:
              currency === 'USDC'
                ? Number((current.wallet.stablecoinBalance - totalUsd).toFixed(2))
                : current.wallet.stablecoinBalance,
          },
          herds,
          positions,
        },
        transaction
      )

      const marketValue = positions.reduce((sum, position) => {
        const currentHerd = herds.find((item) => item.id === position.herdId)
        return sum + projectedMarketValue(position.tokensOwned, currentHerd?.marketPriceUsd ?? 0)
      }, 0)

      return {
        ...nextState,
        portfolioValueSeries: updateSeriesValue(nextState.portfolioValueSeries, marketValue),
      }
    })

    return {
      ok: true,
      message: `${tokenAmount.toLocaleString()} ${herd.tokenSymbol} minted at NAV.`,
      txId,
    }
  }

  const listTokens = (herdId: string, tokenAmount: number, pricePerTokenUsd: number): ActionResult => {
    if (!state.wallet.connected) {
      return { ok: false, message: 'Connect a wallet before listing herd tokens.' }
    }

    if (tokenAmount <= 0 || pricePerTokenUsd <= 0) {
      return { ok: false, message: 'Listing quantity and price must both be positive.' }
    }

    const herd = state.herds.find((item) => item.id === herdId)
    const position = state.positions.find((item) => item.herdId === herdId)

    if (!herd || !position) {
      return { ok: false, message: 'You do not hold this herd token yet.' }
    }

    const availableTokens = position.tokensOwned - position.listedTokens
    if (tokenAmount > availableTokens) {
      return { ok: false, message: 'Not enough unlocked tokens available for listing.' }
    }

    const txId = generateDemoSignature()

    setState((current) => {
      const listings = [
        {
          id: `listing-${generateDemoSignature(10)}`,
          herdId,
          herdName: herd.name,
          tokensAvailable: tokenAmount,
          pricePerTokenUsd: Number(pricePerTokenUsd.toFixed(4)),
          sellerWallet: current.wallet.walletAddress,
          createdAt: new Date().toISOString(),
        },
        ...current.listings,
      ]

      const positions = current.positions.map((item) =>
        item.herdId === herdId
          ? {
              ...item,
              listedTokens: item.listedTokens + tokenAmount,
            }
          : item
      )

      const herds = syncMarketMetrics(current.herds, listings)

      return pushTransaction(
        {
          ...current,
          positions,
          listings,
          herds,
        },
        {
          id: `txn-${txId}`,
          kind: 'listing',
          label: `Listed ${tokenAmount.toLocaleString()} ${herd.tokenSymbol} for P2P sale`,
          amountUsd: Number((tokenAmount * pricePerTokenUsd).toFixed(2)),
          currency: 'SOL',
          txId,
          timestamp: new Date().toISOString(),
        }
      )
    })

    return {
      ok: true,
      message: 'Listing posted to the marketplace order book.',
      txId,
    }
  }

  const buyListing = (listingId: string, tokenAmount: number): ActionResult => {
    if (!state.wallet.connected) {
      return { ok: false, message: 'Connect a wallet before using the marketplace.' }
    }

    const listing = state.listings.find((item) => item.id === listingId)
    if (!listing) {
      return { ok: false, message: 'Listing no longer exists.' }
    }

    if (tokenAmount <= 0 || tokenAmount > listing.tokensAvailable) {
      return { ok: false, message: 'Choose a token amount inside the available order size.' }
    }

    const herd = state.herds.find((item) => item.id === listing.herdId)
    if (!herd) {
      return { ok: false, message: 'Linked herd pool not found.' }
    }

    const totalUsd = tokenAmount * listing.pricePerTokenUsd
    const totalSol = usdToSol(totalUsd)
    if (state.wallet.solBalance < totalSol) {
      return { ok: false, message: 'Marketplace fills settle in SOL. Increase your SOL balance first.' }
    }

    const txId = generateDemoSignature()

    setState((current) => {
      const listings = current.listings
        .map((item) =>
          item.id === listingId
            ? {
                ...item,
                tokensAvailable: item.tokensAvailable - tokenAmount,
              }
            : item
        )
        .filter((item) => item.tokensAvailable > 0)

      const sellerIsCurrentWallet = listing.sellerWallet === current.wallet.walletAddress
      const positions = (() => {
        const buyerPosition = current.positions.find((item) => item.herdId === listing.herdId)
        const withBuyer = buyerPosition
          ? current.positions.map((item) =>
              item.herdId === listing.herdId
                ? {
                    ...item,
                    tokensOwned: item.tokensOwned + tokenAmount,
                    averageCostUsd: Number(
                      (
                        (item.averageCostUsd * item.tokensOwned + totalUsd) /
                        (item.tokensOwned + tokenAmount)
                      ).toFixed(4)
                    ),
                    listedTokens: sellerIsCurrentWallet
                      ? Math.max(0, item.listedTokens - tokenAmount)
                      : item.listedTokens,
                  }
                : item
            )
          : [
              ...current.positions,
              {
                herdId: herd.id,
                herdName: herd.name,
                tokensOwned: tokenAmount,
                listedTokens: 0,
                averageCostUsd: listing.pricePerTokenUsd,
                claimedDividendsUsd: 0,
                pendingDividendsUsd: 0,
              },
            ]

        return withBuyer
      })()

      const herds = syncMarketMetrics(current.herds, listings)

      const nextWallet = {
        ...current.wallet,
        solBalance: Number(
          (
            current.wallet.solBalance - totalSol + (sellerIsCurrentWallet ? totalSol : 0)
          ).toFixed(4)
        ),
      }

      const nextState = pushTransaction(
        {
          ...current,
          wallet: nextWallet,
          positions,
          listings,
          herds,
        },
        {
          id: `txn-${txId}`,
          kind: 'market-buy',
          label: buildActionLabel('market', herd.name),
          amountUsd: Number(totalUsd.toFixed(2)),
          currency: 'SOL',
          txId,
          timestamp: new Date().toISOString(),
        }
      )

      const marketValue = positions.reduce((sum, position) => {
        const currentHerd = herds.find((item) => item.id === position.herdId)
        return sum + projectedMarketValue(position.tokensOwned, currentHerd?.marketPriceUsd ?? 0)
      }, 0)

      return {
        ...nextState,
        portfolioValueSeries: updateSeriesValue(nextState.portfolioValueSeries, marketValue),
      }
    })

    return {
      ok: true,
      message: `${tokenAmount.toLocaleString()} tokens matched on-chain against seller ${listing.sellerWallet.slice(0, 4)}...`,
      txId,
    }
  }

  const claimDividends = (currency: BuyCurrency): ActionResult => {
    if (!state.wallet.connected) {
      return { ok: false, message: 'Connect a wallet before claiming dividends.' }
    }

    const pendingUsd = state.positions.reduce((sum, item) => sum + item.pendingDividendsUsd, 0)
    if (pendingUsd <= 0) {
      return { ok: false, message: 'No pending dividends are available to claim.' }
    }

    const txId = generateDemoSignature()

    setState((current) => {
      const positions = current.positions.map((item) => ({
        ...item,
        claimedDividendsUsd: Number((item.claimedDividendsUsd + item.pendingDividendsUsd).toFixed(2)),
        pendingDividendsUsd: 0,
      }))

      return pushTransaction(
        {
          ...current,
          wallet: {
            ...current.wallet,
            solBalance: currency === 'SOL' ? Number((current.wallet.solBalance + usdToSol(pendingUsd)).toFixed(4)) : current.wallet.solBalance,
            stablecoinBalance:
              currency === 'USDC'
                ? Number((current.wallet.stablecoinBalance + pendingUsd).toFixed(2))
                : current.wallet.stablecoinBalance,
            preferredDividendCurrency: currency,
          },
          positions,
        },
        {
          id: `txn-${txId}`,
          kind: 'claim',
          label: buildActionLabel('claim'),
          amountUsd: Number(pendingUsd.toFixed(2)),
          currency,
          txId,
          timestamp: new Date().toISOString(),
        }
      )
    })

    return {
      ok: true,
      message: `Claimed ${pendingUsd.toFixed(2)} in ${currency}.`,
      txId,
    }
  }

  const simulateCowSale = (herdId: string, salePriceUsd: number, currency: BuyCurrency): ActionResult => {
    if (salePriceUsd <= 0) {
      return { ok: false, message: 'Sale price must be positive.' }
    }

    const herd = state.herds.find((item) => item.id === herdId)
    if (!herd) {
      return { ok: false, message: 'Herd not found.' }
    }

    const txId = generateDemoSignature()

    setState((current) => {
      const targetHerd = current.herds.find((item) => item.id === herdId)
      if (!targetHerd) {
        return current
      }

      const navAfterUsd = calculateNavAfterSale(targetHerd.navPerTokenUsd, targetHerd.totalTokens, salePriceUsd)
      const dividendPerTokenUsd = Number((salePriceUsd / targetHerd.totalTokens).toFixed(6))

      const positions = current.positions.map((item) =>
        item.herdId === herdId
          ? {
              ...item,
              pendingDividendsUsd: Number(
                (
                  item.pendingDividendsUsd +
                  calculateUserDividend(item.tokensOwned, targetHerd.totalTokens, salePriceUsd)
                ).toFixed(2)
              ),
            }
          : item
      )

      const herds = syncMarketMetrics(
        current.herds.map((item) =>
          item.id === herdId
            ? {
                ...item,
                herdSize: Math.max(0, item.herdSize - 1),
                totalValueUsd: Number(Math.max(0, item.totalValueUsd - salePriceUsd).toFixed(2)),
                navPerTokenUsd: navAfterUsd,
                totalDividendsDistributedUsd: Number((item.totalDividendsDistributedUsd + salePriceUsd).toFixed(2)),
              }
            : item
        ),
        current.listings
      )

      const saleEvent: CowSaleEvent = {
        id: `sale-${generateDemoSignature(8)}`,
        herdId,
        herdName: targetHerd.name,
        cowTag: `${targetHerd.tokenSymbol.slice(0, 3)}-${String(targetHerd.herdSize).padStart(3, '0')}`,
        salePriceUsd: Number(salePriceUsd.toFixed(2)),
        dividendPerTokenUsd,
        navBeforeUsd: targetHerd.navPerTokenUsd,
        navAfterUsd,
        saleDate: new Date().toISOString(),
        settlementCurrency: currency,
      }

      const nextState = pushTransaction(
        {
          ...current,
          positions,
          herds,
          sales: [saleEvent, ...current.sales],
          dividendSeries: updateDividendSeries(current.dividendSeries, salePriceUsd),
        },
        {
          id: `txn-${txId}`,
          kind: 'cow-sale',
          label: buildActionLabel('sale', targetHerd.name),
          amountUsd: Number(salePriceUsd.toFixed(2)),
          currency,
          txId,
          timestamp: new Date().toISOString(),
        }
      )

      return nextState
    })

    return {
      ok: true,
      message: `Cow sale registered. Dividends streamed to token holders and NAV repriced slightly.`,
      txId,
    }
  }

  const portfolioSummary = useMemo(() => {
    const totalTokensOwned = state.positions.reduce((sum, position) => sum + position.tokensOwned, 0)

    const totalHerdShares = state.positions.reduce((sum, position) => {
      const herd = state.herds.find((item) => item.id === position.herdId)
      if (!herd) {
        return sum
      }

      return sum + (position.tokensOwned / herd.totalTokens) * herd.herdSize
    }, 0)

    const currentNavValueUsd = state.positions.reduce((sum, position) => {
      const herd = state.herds.find((item) => item.id === position.herdId)
      return sum + position.tokensOwned * (herd?.navPerTokenUsd ?? 0)
    }, 0)

    const marketValueUsd = state.positions.reduce((sum, position) => {
      const herd = state.herds.find((item) => item.id === position.herdId)
      return sum + projectedMarketValue(position.tokensOwned, herd?.marketPriceUsd ?? 0)
    }, 0)

    const totalDividendsEarnedUsd = state.positions.reduce(
      (sum, position) => sum + position.claimedDividendsUsd + position.pendingDividendsUsd,
      0
    )

    const pendingDividendsUsd = state.positions.reduce((sum, position) => sum + position.pendingDividendsUsd, 0)

    return {
      totalTokensOwned,
      totalHerdShares: Number(totalHerdShares.toFixed(2)),
      currentNavValueUsd: Number(currentNavValueUsd.toFixed(2)),
      marketValueUsd: Number(marketValueUsd.toFixed(2)),
      totalDividendsEarnedUsd: Number(totalDividendsEarnedUsd.toFixed(2)),
      pendingDividendsUsd: Number(pendingDividendsUsd.toFixed(2)),
    }
  }, [state.herds, state.positions])

  const value = useMemo<DemoStateContextValue>(
    () => ({
      isHydrated,
      state,
      connectWallet,
      disconnectWallet,
      setPreferredDividendCurrency,
      buyAtNav,
      listTokens,
      buyListing,
      claimDividends,
      simulateCowSale,
      portfolioSummary,
    }),
    [isHydrated, state, portfolioSummary]
  )

  return <DemoStateContext.Provider value={value}>{children}</DemoStateContext.Provider>
}

export function useDemoState() {
  const context = useContext(DemoStateContext)

  if (!context) {
    throw new Error('useDemoState must be used inside DemoStateProvider')
  }

  return context
}

export function useListingPremium(listing: MarketplaceListing, herd: HerdPool | undefined) {
  return listingPremiumPct(listing.pricePerTokenUsd, herd?.navPerTokenUsd ?? 0)
}

export function getAvailableTokens(position: UserPosition | undefined) {
  if (!position) {
    return 0
  }

  return Math.max(0, position.tokensOwned - position.listedTokens)
}