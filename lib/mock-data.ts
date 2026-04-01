export interface HerdPool {
  id: string
  name: string
  cows: number
  totalValue: number
  tokenPrice: number // NAV per token
  marketPrice: number // Market price for P2P trading
  totalTokens: number
  tokensSold: number
  apy: number
  monthlyYield: number
  location: string
  healthStatus: 'Excellent' | 'Good' | 'Fair'
  milkProduction: number
  monthlyRevenue: number
  operatingCosts: number
  netYield: number
  image: string
  totalDividendsDistributed: number
}

export interface PortfolioItem {
  herdId: string
  herdName: string
  tokensOwned: number
  sharePercent: number
  monthlyEarnings: number
  currentValue: number
  purchasePrice: number
  pendingDividends: number
  claimedDividends: number
}

export interface MarketplaceListing {
  id: string
  herdId: string
  herdName: string
  tokensForSale: number
  pricePerToken: number // Seller's asking price
  navPerToken: number // Current NAV for comparison
  sellerWallet: string
  createdAt: string
}

export interface SoldCow {
  id: string
  herdId: string
  herdName: string
  cowId: string
  salePrice: number
  saleDate: string
  dividendsDistributed: number
  totalTokensAtSale: number
}

export interface DividendHistory {
  id: string
  herdId: string
  herdName: string
  cowSaleId: string
  amount: number
  tokensHeld: number
  date: string
  status: 'pending' | 'claimed'
  txId: string | null
}

export interface PlatformStats {
  totalCows: number
  tvl: number
  averageApy: number
  totalInvestors: number
  totalDividendsDistributed: number
  totalMarketplaceVolume: number
}

export const herdPools: HerdPool[] = [
  {
    id: 'herd-1',
    name: 'Alpine Meadow Herd',
    cows: 50,
    totalValue: 50000,
    tokenPrice: 1.00,
    marketPrice: 1.05,
    totalTokens: 50000,
    tokensSold: 35000,
    apy: 24,
    monthlyYield: 1000,
    location: 'Vermont, USA',
    healthStatus: 'Excellent',
    milkProduction: 1500,
    monthlyRevenue: 4500,
    operatingCosts: 2500,
    netYield: 2000,
    image: '/herds/alpine-meadow.jpg',
    totalDividendsDistributed: 2500,
  },
  {
    id: 'herd-2',
    name: 'Sunrise Valley Farm',
    cows: 120,
    totalValue: 120000,
    tokenPrice: 1.00,
    marketPrice: 1.02,
    totalTokens: 120000,
    tokensSold: 96000,
    apy: 21,
    monthlyYield: 2100,
    location: 'Wisconsin, USA',
    healthStatus: 'Good',
    milkProduction: 3600,
    monthlyRevenue: 10800,
    operatingCosts: 6300,
    netYield: 4500,
    image: '/herds/sunrise-valley.jpg',
    totalDividendsDistributed: 4800,
  },
  {
    id: 'herd-3',
    name: 'Green Pastures Co-op',
    cows: 80,
    totalValue: 80000,
    tokenPrice: 1.00,
    marketPrice: 1.08,
    totalTokens: 80000,
    tokensSold: 48000,
    apy: 26,
    monthlyYield: 1733,
    location: 'Oregon, USA',
    healthStatus: 'Excellent',
    milkProduction: 2400,
    monthlyRevenue: 7200,
    operatingCosts: 3800,
    netYield: 3400,
    image: '/herds/green-pastures.jpg',
    totalDividendsDistributed: 1200,
  },
  {
    id: 'herd-4',
    name: 'Mountain View Dairy',
    cows: 65,
    totalValue: 65000,
    tokenPrice: 1.00,
    marketPrice: 0.98,
    totalTokens: 65000,
    tokensSold: 52000,
    apy: 22,
    monthlyYield: 1192,
    location: 'Colorado, USA',
    healthStatus: 'Good',
    milkProduction: 1950,
    monthlyRevenue: 5850,
    operatingCosts: 3450,
    netYield: 2400,
    image: '/herds/mountain-view.jpg',
    totalDividendsDistributed: 1800,
  },
  {
    id: 'herd-5',
    name: 'Prairie Gold Ranch',
    cows: 95,
    totalValue: 95000,
    tokenPrice: 1.00,
    marketPrice: 1.03,
    totalTokens: 95000,
    tokensSold: 71250,
    apy: 23,
    monthlyYield: 1821,
    location: 'Kansas, USA',
    healthStatus: 'Excellent',
    milkProduction: 2850,
    monthlyRevenue: 8550,
    operatingCosts: 4750,
    netYield: 3800,
    image: '/herds/prairie-gold.jpg',
    totalDividendsDistributed: 3200,
  },
  {
    id: 'herd-6',
    name: 'Coastal Breeze Farm',
    cows: 45,
    totalValue: 45000,
    tokenPrice: 1.00,
    marketPrice: 1.10,
    totalTokens: 45000,
    tokensSold: 27000,
    apy: 25,
    monthlyYield: 938,
    location: 'California, USA',
    healthStatus: 'Excellent',
    milkProduction: 1350,
    monthlyRevenue: 4050,
    operatingCosts: 2100,
    netYield: 1950,
    image: '/herds/coastal-breeze.jpg',
    totalDividendsDistributed: 950,
  },
]

export const userPortfolio: PortfolioItem[] = [
  {
    herdId: 'herd-1',
    herdName: 'Alpine Meadow Herd',
    tokensOwned: 5000,
    sharePercent: 10,
    monthlyEarnings: 100,
    currentValue: 5250,
    purchasePrice: 5000,
    pendingDividends: 125,
    claimedDividends: 250,
  },
  {
    herdId: 'herd-2',
    herdName: 'Sunrise Valley Farm',
    tokensOwned: 12000,
    sharePercent: 10,
    monthlyEarnings: 210,
    currentValue: 12600,
    purchasePrice: 12000,
    pendingDividends: 240,
    claimedDividends: 480,
  },
  {
    herdId: 'herd-3',
    herdName: 'Green Pastures Co-op',
    tokensOwned: 8000,
    sharePercent: 10,
    monthlyEarnings: 173,
    currentValue: 8400,
    purchasePrice: 8000,
    pendingDividends: 60,
    claimedDividends: 120,
  },
]

export const marketplaceListings: MarketplaceListing[] = [
  {
    id: 'listing-1',
    herdId: 'herd-1',
    herdName: 'Alpine Meadow Herd',
    tokensForSale: 500,
    pricePerToken: 1.08,
    navPerToken: 1.00,
    sellerWallet: '7GhK...92kL',
    createdAt: '2025-03-28T10:00:00Z',
  },
  {
    id: 'listing-2',
    herdId: 'herd-1',
    herdName: 'Alpine Meadow Herd',
    tokensForSale: 1000,
    pricePerToken: 1.05,
    navPerToken: 1.00,
    sellerWallet: '3xYz...8mNp',
    createdAt: '2025-03-27T14:30:00Z',
  },
  {
    id: 'listing-3',
    herdId: 'herd-2',
    herdName: 'Sunrise Valley Farm',
    tokensForSale: 2500,
    pricePerToken: 1.03,
    navPerToken: 1.00,
    sellerWallet: '9aBc...2dEf',
    createdAt: '2025-03-29T09:15:00Z',
  },
  {
    id: 'listing-4',
    herdId: 'herd-3',
    herdName: 'Green Pastures Co-op',
    tokensForSale: 1500,
    pricePerToken: 1.12,
    navPerToken: 1.00,
    sellerWallet: '5pQr...1mNo',
    createdAt: '2025-03-26T16:45:00Z',
  },
  {
    id: 'listing-5',
    herdId: 'herd-4',
    herdName: 'Mountain View Dairy',
    tokensForSale: 800,
    pricePerToken: 0.95,
    navPerToken: 1.00,
    sellerWallet: '2yZa...5bCd',
    createdAt: '2025-03-29T11:00:00Z',
  },
  {
    id: 'listing-6',
    herdId: 'herd-5',
    herdName: 'Prairie Gold Ranch',
    tokensForSale: 3000,
    pricePerToken: 1.04,
    navPerToken: 1.00,
    sellerWallet: '6sTu...9vWx',
    createdAt: '2025-03-28T08:20:00Z',
  },
  {
    id: 'listing-7',
    herdId: 'herd-6',
    herdName: 'Coastal Breeze Farm',
    tokensForSale: 600,
    pricePerToken: 1.15,
    navPerToken: 1.00,
    sellerWallet: '4jKl...3gHi',
    createdAt: '2025-03-25T13:00:00Z',
  },
]

export const soldCowsHistory: SoldCow[] = [
  {
    id: 'sale-1',
    herdId: 'herd-1',
    herdName: 'Alpine Meadow Herd',
    cowId: 'COW-001',
    salePrice: 1200,
    saleDate: '2025-03-15T10:00:00Z',
    dividendsDistributed: 1200,
    totalTokensAtSale: 50000,
  },
  {
    id: 'sale-2',
    herdId: 'herd-1',
    herdName: 'Alpine Meadow Herd',
    cowId: 'COW-002',
    salePrice: 1300,
    saleDate: '2025-02-20T14:30:00Z',
    dividendsDistributed: 1300,
    totalTokensAtSale: 50000,
  },
  {
    id: 'sale-3',
    herdId: 'herd-2',
    herdName: 'Sunrise Valley Farm',
    cowId: 'COW-101',
    salePrice: 1500,
    saleDate: '2025-03-10T09:00:00Z',
    dividendsDistributed: 1500,
    totalTokensAtSale: 120000,
  },
  {
    id: 'sale-4',
    herdId: 'herd-2',
    herdName: 'Sunrise Valley Farm',
    cowId: 'COW-102',
    salePrice: 1650,
    saleDate: '2025-02-28T11:45:00Z',
    dividendsDistributed: 1650,
    totalTokensAtSale: 120000,
  },
  {
    id: 'sale-5',
    herdId: 'herd-2',
    herdName: 'Sunrise Valley Farm',
    cowId: 'COW-103',
    salePrice: 1650,
    saleDate: '2025-01-15T16:00:00Z',
    dividendsDistributed: 1650,
    totalTokensAtSale: 120000,
  },
  {
    id: 'sale-6',
    herdId: 'herd-3',
    herdName: 'Green Pastures Co-op',
    cowId: 'COW-201',
    salePrice: 1200,
    saleDate: '2025-03-05T10:30:00Z',
    dividendsDistributed: 1200,
    totalTokensAtSale: 80000,
  },
]

export const dividendHistory: DividendHistory[] = [
  {
    id: 'div-1',
    herdId: 'herd-1',
    herdName: 'Alpine Meadow Herd',
    cowSaleId: 'sale-1',
    amount: 120,
    tokensHeld: 5000,
    date: '2025-03-15T10:00:00Z',
    status: 'pending',
    txId: null,
  },
  {
    id: 'div-2',
    herdId: 'herd-1',
    herdName: 'Alpine Meadow Herd',
    cowSaleId: 'sale-2',
    amount: 130,
    tokensHeld: 5000,
    date: '2025-02-20T14:30:00Z',
    status: 'claimed',
    txId: '5xYz...8mNp',
  },
  {
    id: 'div-3',
    herdId: 'herd-2',
    herdName: 'Sunrise Valley Farm',
    cowSaleId: 'sale-3',
    amount: 150,
    tokensHeld: 12000,
    date: '2025-03-10T09:00:00Z',
    status: 'pending',
    txId: null,
  },
  {
    id: 'div-4',
    herdId: 'herd-2',
    herdName: 'Sunrise Valley Farm',
    cowSaleId: 'sale-4',
    amount: 165,
    tokensHeld: 12000,
    date: '2025-02-28T11:45:00Z',
    status: 'claimed',
    txId: '9aBc...2dEf',
  },
  {
    id: 'div-5',
    herdId: 'herd-2',
    herdName: 'Sunrise Valley Farm',
    cowSaleId: 'sale-5',
    amount: 165,
    tokensHeld: 12000,
    date: '2025-01-15T16:00:00Z',
    status: 'claimed',
    txId: '3gHi...7jKl',
  },
  {
    id: 'div-6',
    herdId: 'herd-3',
    herdName: 'Green Pastures Co-op',
    cowSaleId: 'sale-6',
    amount: 120,
    tokensHeld: 8000,
    date: '2025-03-05T10:30:00Z',
    status: 'pending',
    txId: null,
  },
]

export const platformStats: PlatformStats = {
  totalCows: 455,
  tvl: 455000,
  averageApy: 23.5,
  totalInvestors: 1247,
  totalDividendsDistributed: 14450,
  totalMarketplaceVolume: 125000,
}

export const milkProductionData = [
  { month: 'Jan', production: 12500 },
  { month: 'Feb', production: 11800 },
  { month: 'Mar', production: 13200 },
  { month: 'Apr', production: 14100 },
  { month: 'May', production: 15200 },
  { month: 'Jun', production: 14800 },
  { month: 'Jul', production: 13900 },
  { month: 'Aug', production: 14500 },
  { month: 'Sep', production: 15100 },
  { month: 'Oct', production: 14200 },
  { month: 'Nov', production: 13500 },
  { month: 'Dec', production: 12800 },
]

export const yieldHistoryData = [
  { month: 'Jan', yield: 22 },
  { month: 'Feb', yield: 21 },
  { month: 'Mar', yield: 23 },
  { month: 'Apr', yield: 24 },
  { month: 'May', yield: 25 },
  { month: 'Jun', yield: 24 },
  { month: 'Jul', yield: 23 },
  { month: 'Aug', yield: 24 },
  { month: 'Sep', yield: 25 },
  { month: 'Oct', yield: 24 },
  { month: 'Nov', yield: 23 },
  { month: 'Dec', yield: 22 },
]

export const platformGrowthData = [
  { month: 'Jan', tvl: 280000, investors: 850 },
  { month: 'Feb', tvl: 310000, investors: 920 },
  { month: 'Mar', tvl: 335000, investors: 980 },
  { month: 'Apr', tvl: 365000, investors: 1050 },
  { month: 'May', tvl: 395000, investors: 1120 },
  { month: 'Jun', tvl: 420000, investors: 1180 },
  { month: 'Jul', tvl: 455000, investors: 1247 },
]

export const yieldDistributionData = [
  { range: '18-20%', count: 45 },
  { range: '20-22%', count: 120 },
  { range: '22-24%', count: 280 },
  { range: '24-26%', count: 195 },
  { range: '26-28%', count: 85 },
]

// Portfolio value over time (for charts)
export const portfolioValueData = [
  { month: 'Oct', value: 20000 },
  { month: 'Nov', value: 22500 },
  { month: 'Dec', value: 24000 },
  { month: 'Jan', value: 25000 },
  { month: 'Feb', value: 25800 },
  { month: 'Mar', value: 26250 },
]

// Dividends earned over time
export const dividendsOverTimeData = [
  { month: 'Oct', dividends: 0 },
  { month: 'Nov', dividends: 165 },
  { month: 'Dec', dividends: 0 },
  { month: 'Jan', dividends: 165 },
  { month: 'Feb', dividends: 295 },
  { month: 'Mar', dividends: 390 },
]
