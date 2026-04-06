export type SettlementCurrency = 'SOL' | 'USDC'

export const SOL_USD_RATE = 155
export const LAMPORTS_PER_SOL = 1_000_000_000

export type NavPurchaseQuoteInput = {
  tokenAmount: number
  navPerTokenUsd: number
  solUsdRate?: number
}

export type NavPurchaseQuote = {
  tokenAmount: number
  navPerTokenUsd: number
  usdTotal: number
  solUsdRate: number
  solTotal: number
  lamports: number
}

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

function round(value: number, decimals = 2) {
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

export function calculateUserDividend(tokensOwned: number, totalTokens: number, cowSalePriceUsd: number) {
  if (tokensOwned <= 0 || totalTokens <= 0 || cowSalePriceUsd <= 0) {
    return 0
  }

  return round((tokensOwned / totalTokens) * cowSalePriceUsd, 2)
}

export function calculateNavAfterSale(currentNavUsd: number, totalTokens: number, cowSalePriceUsd: number) {
  if (currentNavUsd <= 0 || totalTokens <= 0 || cowSalePriceUsd <= 0) {
    return currentNavUsd
  }

  const fullAssetDrop = cowSalePriceUsd / totalTokens
  const bufferedDrop = fullAssetDrop * 0.18
  return round(Math.max(0.25, currentNavUsd - bufferedDrop), 4)
}

export function usdToSol(usdAmount: number, solUsdRate = SOL_USD_RATE) {
  if (usdAmount <= 0 || solUsdRate <= 0) {
    return 0
  }

  return round(usdAmount / solUsdRate, 4)
}

export function solToUsd(solAmount: number, solUsdRate = SOL_USD_RATE) {
  if (solAmount <= 0 || solUsdRate <= 0) {
    return 0
  }

  return round(solAmount * solUsdRate, 2)
}

export function lamportsToSol(lamports: number) {
  if (lamports <= 0) {
    return 0
  }

  return round(lamports / LAMPORTS_PER_SOL, 4)
}

export function calculateNavPurchaseQuote({ tokenAmount, navPerTokenUsd, solUsdRate = SOL_USD_RATE }: NavPurchaseQuoteInput): NavPurchaseQuote {
  const safeTokenAmount = Number.isFinite(tokenAmount) && tokenAmount > 0 ? tokenAmount : 0
  const safeNavPerTokenUsd = Number.isFinite(navPerTokenUsd) && navPerTokenUsd > 0 ? navPerTokenUsd : 0
  const safeSolUsdRate = Number.isFinite(solUsdRate) && solUsdRate > 0 ? solUsdRate : SOL_USD_RATE

  const usdTotal = round(safeTokenAmount * safeNavPerTokenUsd, 2)
  const solTotal = usdToSol(usdTotal, safeSolUsdRate)
  const lamports = Math.round(solTotal * LAMPORTS_PER_SOL)

  return {
    tokenAmount: safeTokenAmount,
    navPerTokenUsd: safeNavPerTokenUsd,
    usdTotal,
    solUsdRate: safeSolUsdRate,
    solTotal,
    lamports,
  }
}

export function generateDemoSignature(length = 24) {
  return Array.from({ length }, () => {
    const index = Math.floor(Math.random() * BASE58_ALPHABET.length)
    return BASE58_ALPHABET[index]
  }).join('')
}

export function shortenWallet(wallet: string) {
  if (wallet.length <= 10) {
    return wallet
  }

  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
}

export function listingPremiumPct(marketPriceUsd: number, navPerTokenUsd: number) {
  if (navPerTokenUsd <= 0) {
    return 0
  }

  return round(((marketPriceUsd - navPerTokenUsd) / navPerTokenUsd) * 100, 2)
}

export function projectedMarketValue(tokensOwned: number, pricePerTokenUsd: number) {
  return round(tokensOwned * pricePerTokenUsd, 2)
}

export function buildActionLabel(kind: 'nav' | 'market' | 'claim' | 'sale', herdName?: string) {
  if (kind === 'nav') {
    return `Minted CowChain tokens for ${herdName}`
  }

  if (kind === 'market') {
    return `Matched P2P CowChain order on ${herdName}`
  }

  if (kind === 'claim') {
    return 'Claimed pending dividends'
  }

  return `Registered sold cow event for ${herdName}`
}