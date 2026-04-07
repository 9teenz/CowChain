import type { SettlementCurrency } from '@/lib/solana-contract'

export const PLATFORM_TOKEN_MINT =
  process.env.NEXT_PUBLIC_COWCHAIN_TOKEN_MINT?.trim() || '64TieBxPwSi37Eem9GAGaab1T59nvyiPHEABrbEsH3Tp'
export const PLATFORM_TOKEN_SYMBOL = 'CowChain'

export interface PlatformToken {
  mint: string
  symbol: string
  totalSupply: number
  availableTokens: number
  navPerTokenUsd: number
  marketPriceUsd: number
}

export type WalletProviderName = 'Phantom' | 'Solflare' | 'Backpack'

export interface DemoWallet {
  connected: boolean
  provider: WalletProviderName | null
  walletAddress: string
  solBalance: number
  stablecoinBalance: number
  platformTokenBalance: number | null
  preferredDividendCurrency: SettlementCurrency
}

export interface HerdPool {
  id: string
  name: string
  location: string
  description: string
  herdSize: number
  herdAgeMonths: number
  milkProductionLitersPerDay: number
  expectedAnnualRevenueUsd: number
  totalValueUsd: number
  navPerTokenUsd: number
  marketPriceUsd: number
  projectedYieldPct: number
  healthStatus: 'Prime' | 'Strong' | 'Watch'
  totalDividendsDistributedUsd: number
  verified: boolean
}

export interface UserPosition {
  herdId: string
  herdName: string
  tokensOwned: number
  listedTokens: number
  averageCostUsd: number
  claimedDividendsUsd: number
  pendingDividendsUsd: number
}

export interface MarketplaceListing {
  id: string
  herdId: string
  herdName: string
  tokensAvailable: number
  pricePerTokenUsd: number
  sellerWallet: string
  createdAt: string
}

export interface CowSaleEvent {
  id: string
  herdId: string
  herdName: string
  cowTag: string
  salePriceUsd: number
  dividendPerTokenUsd: number
  navBeforeUsd: number
  navAfterUsd: number
  saleDate: string
  settlementCurrency: SettlementCurrency
}

export interface TransactionItem {
  id: string
  kind: 'nav-buy' | 'market-buy' | 'listing' | 'claim' | 'cow-sale' | 'withdraw'
  label: string
  amountUsd: number
  currency: SettlementCurrency
  txId: string
  timestamp: string
}

export interface TimeSeriesPoint {
  period: string
  value: number
}

export interface DemoState {
  wallet: DemoWallet
  platform: PlatformToken
  herds: HerdPool[]
  positions: UserPosition[]
  listings: MarketplaceListing[]
  sales: CowSaleEvent[]
  transactions: TransactionItem[]
  portfolioValueSeries: TimeSeriesPoint[]
  dividendSeries: TimeSeriesPoint[]
}

export const walletProviders: WalletProviderName[] = ['Phantom', 'Solflare', 'Backpack']

export const initialDemoState: DemoState = {
  wallet: {
    connected: false,
    provider: null,
    walletAddress: '7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL',
    solBalance: 82.46,
    stablecoinBalance: 18640,
    platformTokenBalance: null,
    preferredDividendCurrency: 'USDC',
  },
  platform: {
    mint: PLATFORM_TOKEN_MINT,
    symbol: PLATFORM_TOKEN_SYMBOL,
    totalSupply: 100000,
    availableTokens: 75400,
    navPerTokenUsd: 1.106,
    marketPriceUsd: 1.08,
  },
  herds: [
    {
      id: 'alpine-meadow',
      name: 'Alpine Meadow Herd',
      location: 'Vermont, USA',
      description: 'Premium dairy herd with high milk output, low disease incidents, and consistent offtake contracts.',
      herdSize: 52,
      herdAgeMonths: 33,
      milkProductionLitersPerDay: 1580,
      expectedAnnualRevenueUsd: 226000,
      totalValueUsd: 61200,
      navPerTokenUsd: 1.02,
      marketPriceUsd: 1.08,
      projectedYieldPct: 18.4,
      healthStatus: 'Prime',
      totalDividendsDistributedUsd: 4820,
      verified: true,
    },
    {
      id: 'sunrise-valley',
      name: 'Sunrise Valley Farm',
      location: 'Wisconsin, USA',
      description: 'Large-volume herd pool with strong operating efficiency and long-running regional processor demand.',
      herdSize: 118,
      herdAgeMonths: 40,
      milkProductionLitersPerDay: 3625,
      expectedAnnualRevenueUsd: 498000,
      totalValueUsd: 139200,
      navPerTokenUsd: 1.16,
      marketPriceUsd: 1.13,
      projectedYieldPct: 16.9,
      healthStatus: 'Strong',
      totalDividendsDistributedUsd: 9630,
      verified: true,
    },
    {
      id: 'green-pastures',
      name: 'Green Pastures Co-op',
      location: 'Oregon, USA',
      description: 'Mid-sized co-op with above-market milk pricing and strong member reinvestment into herd genetics.',
      herdSize: 81,
      herdAgeMonths: 28,
      milkProductionLitersPerDay: 2440,
      expectedAnnualRevenueUsd: 312000,
      totalValueUsd: 91500,
      navPerTokenUsd: 1.11,
      marketPriceUsd: 1.18,
      projectedYieldPct: 19.7,
      healthStatus: 'Prime',
      totalDividendsDistributedUsd: 5380,
      verified: true,
    },
    {
      id: 'coastal-breeze',
      name: 'Coastal Breeze Farm',
      location: 'California, USA',
      description: 'Smaller coastal herd with premium organic positioning and more volatile but higher upside secondary pricing.',
      herdSize: 47,
      herdAgeMonths: 25,
      milkProductionLitersPerDay: 1390,
      expectedAnnualRevenueUsd: 184000,
      totalValueUsd: 56400,
      navPerTokenUsd: 1.07,
      marketPriceUsd: 1.14,
      projectedYieldPct: 20.6,
      healthStatus: 'Watch',
      totalDividendsDistributedUsd: 2710,
      verified: false,
    },
  ],
  positions: [
    {
      herdId: 'alpine-meadow',
      herdName: 'Alpine Meadow Herd',
      tokensOwned: 2000,
      listedTokens: 200,
      averageCostUsd: 1,
      claimedDividendsUsd: 0,
      pendingDividendsUsd: 0,
    },
    {
      herdId: 'sunrise-valley',
      herdName: 'Sunrise Valley Farm',
      tokensOwned: 5000,
      listedTokens: 0,
      averageCostUsd: 1.08,
      claimedDividendsUsd: 0,
      pendingDividendsUsd: 0,
    },
    {
      herdId: 'green-pastures',
      herdName: 'Green Pastures Co-op',
      tokensOwned: 3000,
      listedTokens: 300,
      averageCostUsd: 1.03,
      claimedDividendsUsd: 0,
      pendingDividendsUsd: 0,
    },
  ],
  listings: [
    {
      id: 'listing-1',
      herdId: 'alpine-meadow',
      herdName: 'Alpine Meadow Herd',
      tokensAvailable: 900,
      pricePerTokenUsd: 1.08,
      sellerWallet: '7GhK9m2x4nLp3qRt5vWy8zAb1cDe6fHj92kL',
      createdAt: '2026-03-28T09:00:00.000Z',
    },
    {
      id: 'listing-2',
      herdId: 'alpine-meadow',
      herdName: 'Alpine Meadow Herd',
      tokensAvailable: 1500,
      pricePerTokenUsd: 1.12,
      sellerWallet: '9mY2W3b4bM3zH7i5pK2L6aAaFJw1cP7b',
      createdAt: '2026-03-30T13:45:00.000Z',
    },
    {
      id: 'listing-3',
      herdId: 'sunrise-valley',
      herdName: 'Sunrise Valley Farm',
      tokensAvailable: 2400,
      pricePerTokenUsd: 1.1,
      sellerWallet: '4jRt8sQ1xUz5mPk3vYh6BcTn1Ko7Lm2Q',
      createdAt: '2026-03-29T16:10:00.000Z',
    },
    {
      id: 'listing-4',
      herdId: 'green-pastures',
      herdName: 'Green Pastures Co-op',
      tokensAvailable: 1750,
      pricePerTokenUsd: 1.19,
      sellerWallet: '5eNa7mPx2qWu9aBh7Vv1TsKz4Cb6Yq8N',
      createdAt: '2026-03-31T08:25:00.000Z',
    },
    {
      id: 'listing-5',
      herdId: 'coastal-breeze',
      herdName: 'Coastal Breeze Farm',
      tokensAvailable: 700,
      pricePerTokenUsd: 1.09,
      sellerWallet: '2pLs9dQr7uYn8eTf5hJm3kLo6Az4Cx1V',
      createdAt: '2026-03-27T11:12:00.000Z',
    },
  ],
  sales: [
    {
      id: 'sale-1',
      herdId: 'alpine-meadow',
      herdName: 'Alpine Meadow Herd',
      cowTag: 'ALP-021',
      salePriceUsd: 1540,
      dividendPerTokenUsd: 0.0257,
      navBeforeUsd: 1.0246,
      navAfterUsd: 1.02,
      saleDate: '2026-03-22T14:00:00.000Z',
      settlementCurrency: 'USDC',
    },
    {
      id: 'sale-2',
      herdId: 'sunrise-valley',
      herdName: 'Sunrise Valley Farm',
      cowTag: 'SUN-104',
      salePriceUsd: 1875,
      dividendPerTokenUsd: 0.0156,
      navBeforeUsd: 1.165,
      navAfterUsd: 1.16,
      saleDate: '2026-03-15T09:30:00.000Z',
      settlementCurrency: 'SOL',
    },
    {
      id: 'sale-3',
      herdId: 'green-pastures',
      herdName: 'Green Pastures Co-op',
      cowTag: 'GRN-018',
      salePriceUsd: 1390,
      dividendPerTokenUsd: 0.0174,
      navBeforeUsd: 1.114,
      navAfterUsd: 1.11,
      saleDate: '2026-03-10T10:20:00.000Z',
      settlementCurrency: 'USDC',
    },
  ],
  transactions: [
    {
      id: 'txn-1',
      kind: 'claim',
      label: 'Claimed pending dividends',
      amountUsd: 295,
      currency: 'USDC',
      txId: '59Yv3dNPr1q8xL4bTc7VmA2e',
      timestamp: '2026-03-20T12:05:00.000Z',
    },
    {
      id: 'txn-2',
      kind: 'market-buy',
      label: 'Matched P2P order on Sunrise Valley Farm',
      amountUsd: 880,
      currency: 'SOL',
      txId: '7Li3qDf8Wr2uBx5zPn9MdQ1y',
      timestamp: '2026-03-18T15:40:00.000Z',
    },
    {
      id: 'txn-3',
      kind: 'nav-buy',
      label: 'Minted herd shares at NAV for Green Pastures Co-op',
      amountUsd: 1110,
      currency: 'USDC',
      txId: '4Ts9kNv1Pb8xQc2yLm6VrD7e',
      timestamp: '2026-03-12T08:10:00.000Z',
    },
  ],
  portfolioValueSeries: [
    { period: 'Oct', value: 24400 },
    { period: 'Nov', value: 26180 },
    { period: 'Dec', value: 27840 },
    { period: 'Jan', value: 30120 },
    { period: 'Feb', value: 32280 },
    { period: 'Mar', value: 35620 },
  ],
  dividendSeries: [
    { period: 'Oct', value: 120 },
    { period: 'Nov', value: 210 },
    { period: 'Dec', value: 185 },
    { period: 'Jan', value: 260 },
    { period: 'Feb', value: 315 },
    { period: 'Mar', value: 496 },
  ],
}