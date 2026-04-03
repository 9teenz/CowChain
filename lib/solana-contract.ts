export type SettlementCurrency = 'SOL' | 'USDC'

export const SOL_USD_RATE = 155

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

export function usdToSol(usdAmount: number) {
  return round(usdAmount / SOL_USD_RATE, 4)
}

export function solToUsd(solAmount: number) {
  return round(solAmount * SOL_USD_RATE, 2)
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
    return `Minted CowChain tokens at NAV for ${herdName}`
  }

  if (kind === 'market') {
    return `Matched P2P CowChain order on ${herdName}`
  }

  if (kind === 'claim') {
    return 'Claimed pending dividends'
  }

  return `Registered sold cow event for ${herdName}`
}