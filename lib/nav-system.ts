export interface Farm {
  id: string
  cowsCount: number
  averageCowPrice: number
}

// In-memory state representing the platform
let farms: Farm[] = []
let totalTokenSupply = 0
let totalPlatformValue = 0
let tokenNAV = 0
let dividendPool = 0
let dividendPerToken = 0

// Map userId -> pending dividends
const pendingDividends: Record<string, number> = {}
// Map userId -> token balance
const userTokenBalances: Record<string, number> = {}

/**
 * --------------------------------------------------
 * 10. Dashboard Data / Expose Functions
 * --------------------------------------------------
 */

export function getTotalPlatformValue() {
  return totalPlatformValue
}

export function getTotalTokenSupply() {
  return totalTokenSupply
}

export function getTokenNAV() {
  return tokenNAV
}

export function getDividendPool() {
  return dividendPool
}

export function getDividendPerToken() {
  return dividendPerToken
}

export function getUserDividend(userId: string) {
  return pendingDividends[userId] || 0
}

export function getUserShare(userId: string) {
  if (totalTokenSupply === 0) return 0
  const balance = userTokenBalances[userId] || 0
  return balance / totalTokenSupply
}

export function setUserBalance(userId: string, balance: number) {
  userTokenBalances[userId] = balance
}

/**
 * --------------------------------------------------
 * 3. Automatic NAV Recalculation
 * --------------------------------------------------
 */
export function recalculateNAV() {
  // Recompute TotalPlatformValue
  totalPlatformValue = farms.reduce(
    (sum, farm) => sum + farm.cowsCount * farm.averageCowPrice,
    0
  )

  // Recompute TokenNAV
  if (totalTokenSupply > 0) {
    tokenNAV = totalPlatformValue / totalTokenSupply
  } else {
    tokenNAV = 0
  }
}

/**
 * --------------------------------------------------
 * 4. Adding New Farms
 * --------------------------------------------------
 */
export function onFarmAdded(farm: Farm) {
  farms.push(farm)

  const farmValue = farm.cowsCount * farm.averageCowPrice

  if (totalTokenSupply === 0 || tokenNAV === 0) {
    // Initial token issuance (assume NAV = 1 if not set)
    tokenNAV = 1.0
    const newTokensIssued = farmValue / tokenNAV
    totalTokenSupply += newTokensIssued
  } else {
    const newTokensIssued = farmValue / tokenNAV
    totalTokenSupply += newTokensIssued
  }

  // totalPlatformValue is naturally updated via recalculateNAV
  recalculateNAV()
}

/**
 * --------------------------------------------------
 * 5. Cow Sale Event (Event-Driven) & 6. Dividend Pool System & 7. Platform Value Update After Sale
 * --------------------------------------------------
 */
export function onCowSold(farmId: string, cowSalePrice: number) {
  const farm = farms.find((f) => f.id === farmId)
  if (!farm || farm.cowsCount <= 0) return

  // Reduce cow count in the farm
  farm.cowsCount -= 1

  // Add sale value to dividend pool
  dividendPool += cowSalePrice

  // Update DividendPerToken
  if (totalTokenSupply > 0) {
    const dividendIncrease = cowSalePrice / totalTokenSupply
    dividendPerToken += dividendIncrease

    // Accrue to all users
    for (const [userId, balance] of Object.entries(userTokenBalances)) {
      const userDividend = balance * dividendIncrease
      pendingDividends[userId] = (pendingDividends[userId] || 0) + userDividend
    }
  }

  // Trigger NAV recalculation
  recalculateNAV()
}

/**
 * --------------------------------------------------
 * 6. Claiming Dividends
 * --------------------------------------------------
 */
export function claimDividends(userId: string) {
  const amountToClaim = pendingDividends[userId] || 0
  if (amountToClaim > 0) {
    // Deduct from DividendPool
    dividendPool -= amountToClaim
    // Reset user's pending dividends
    pendingDividends[userId] = 0
  }
  
  onDividendClaimed()
  return amountToClaim
}

export function onDividendClaimed() {
  recalculateNAV()
}

/**
 * --------------------------------------------------
 * 10. Event Hook for Token Minting
 * --------------------------------------------------
 */
export function onTokensMinted(userId: string, tokensToMint: number, depositAmount: number) {
  // If tokens are minted for cash, we could add cash to platform value,
  // but per formula, it only sums farm.cowsCount * farm.averageCowPrice.
  // Assuming the deposit is immediately used for cows or is not adding to platform value 
  // directly unless tracked as 'PlatformCashReserves'. For now, simply update logic:
  
  totalTokenSupply += tokensToMint
  userTokenBalances[userId] = (userTokenBalances[userId] || 0) + tokensToMint
  
  recalculateNAV()
}

