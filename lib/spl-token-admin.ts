import {
  AuthorityType,
  createMint,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  setAuthority,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import bs58 from 'bs58'
import { buildUpsertTokenMetadataInstruction } from '@/lib/token-metadata'

export type TokenCluster = 'devnet' | 'testnet' | 'mainnet-beta'

export interface CreateManagedTokenInput {
  name: string
  symbol: string
  uri?: string
  decimals: number
  initialSupply?: string
  recipient?: string
  enableFreezeAuthority?: boolean
  cluster?: TokenCluster
}

export interface MintExistingTokenInput {
  mintAddress: string
  amount: string
  recipient?: string
  cluster?: TokenCluster
}

export interface InspectTokenMintInput {
  mintAddress: string
  holderAddress?: string
  cluster?: TokenCluster
}

export interface DisableMintAuthorityInput {
  mintAddress: string
  cluster?: TokenCluster
}

export interface UpsertTokenMetadataInput {
  mintAddress: string
  name: string
  symbol: string
  uri?: string
  cluster?: TokenCluster
}

export interface TokenAdminSummary {
  configured: boolean
  cluster: TokenCluster
  rpcUrl: string
  adminPublicKey: string | null
  setupMessage?: string
}

function resolveCluster(cluster?: string): TokenCluster {
  if (cluster === 'devnet' || cluster === 'testnet' || cluster === 'mainnet-beta') {
    return cluster
  }

  const envCluster = process.env.SOLANA_CLUSTER?.trim()
  if (envCluster === 'devnet' || envCluster === 'testnet' || envCluster === 'mainnet-beta') {
    return envCluster
  }

  return 'devnet'
}

function resolveRpcUrl(cluster: TokenCluster) {
  return process.env.SOLANA_RPC_URL?.trim() || process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || clusterApiUrl(cluster)
}

function parseSecretKey(secret: string) {
  const trimmed = secret.trim()

  if (!trimmed) {
    throw new Error('SOLANA_ADMIN_PRIVATE_KEY is empty.')
  }

  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as number[]
    return Uint8Array.from(parsed)
  }

  return Uint8Array.from(bs58.decode(trimmed))
}

function getAdminKeypair() {
  const rawSecret = process.env.SOLANA_ADMIN_PRIVATE_KEY
  if (!rawSecret) {
    throw new Error('Set SOLANA_ADMIN_PRIVATE_KEY before managing SPL tokens.')
  }

  const secretKey = parseSecretKey(rawSecret)
  return Keypair.fromSecretKey(secretKey)
}

function getConnection(cluster?: TokenCluster) {
  const resolvedCluster = resolveCluster(cluster)
  return {
    cluster: resolvedCluster,
    rpcUrl: resolveRpcUrl(resolvedCluster),
    connection: new Connection(resolveRpcUrl(resolvedCluster), 'confirmed'),
  }
}

async function sendMetadataTransaction(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  input: { name: string; symbol: string; uri?: string }
) {
  const { instruction, metadataAddress, metadataAction } = await buildUpsertTokenMetadataInstruction(
    connection,
    mint,
    payer.publicKey,
    input
  )

  const metadataSignature = await sendAndConfirmTransaction(connection, new Transaction().add(instruction), [payer], {
    commitment: 'confirmed',
  })

  return {
    metadataSignature,
    metadataAddress: metadataAddress.toBase58(),
    metadataStatus: metadataAction,
  }
}

function pow10(decimals: number) {
  let value = BigInt(1)

  for (let index = 0; index < decimals; index += 1) {
    value *= BigInt(10)
  }

  return value
}

function amountToBaseUnits(amount: string, decimals: number) {
  const normalized = amount.trim()

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error('Amount must be a positive number.')
  }

  const [wholePart, fractionPart = ''] = normalized.split('.')
  if (fractionPart.length > decimals) {
    throw new Error(`Too many decimal places. Max allowed is ${decimals}.`)
  }

  const multiplier = pow10(decimals)
  const wholeValue = BigInt(wholePart || '0') * multiplier
  const paddedFraction = (fractionPart + '0'.repeat(decimals)).slice(0, decimals)
  const fractionValue = paddedFraction ? BigInt(paddedFraction) : BigInt(0)

  return wholeValue + fractionValue
}

function formatBaseUnits(amount: bigint, decimals: number) {
  if (decimals === 0) {
    return amount.toString()
  }

  const divisor = pow10(decimals)
  const whole = amount / divisor
  const fraction = amount % divisor
  const formattedFraction = fraction.toString().padStart(decimals, '0').replace(/0+$/, '')

  return formattedFraction ? `${whole.toString()}.${formattedFraction}` : whole.toString()
}

export function getTokenAdminSummary(cluster?: TokenCluster): TokenAdminSummary {
  const resolvedCluster = resolveCluster(cluster)
  const rpcUrl = resolveRpcUrl(resolvedCluster)

  try {
    const admin = getAdminKeypair()
    return {
      configured: true,
      cluster: resolvedCluster,
      rpcUrl,
      adminPublicKey: admin.publicKey.toBase58(),
    }
  } catch (error) {
    return {
      configured: false,
      cluster: resolvedCluster,
      rpcUrl,
      adminPublicKey: null,
      setupMessage: error instanceof Error ? error.message : 'Solana admin key is not configured.',
    }
  }
}

export async function createManagedToken(input: CreateManagedTokenInput) {
  const { connection, cluster, rpcUrl } = getConnection(input.cluster)
  const payer = getAdminKeypair()
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey,
    input.enableFreezeAuthority === false ? null : payer.publicKey,
    input.decimals
  )

  const metadataResult = await sendMetadataTransaction(connection, payer, mint, {
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
  })

  const recipient = new PublicKey(input.recipient || payer.publicKey.toBase58())
  const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient)

  let mintSignature: string | null = null
  const requestedAmount = input.initialSupply?.trim() || '0'
  const mintedAmountBaseUnits = amountToBaseUnits(requestedAmount, input.decimals)

  if (mintedAmountBaseUnits > BigInt(0)) {
    mintSignature = await mintTo(connection, payer, mint, tokenAccount.address, payer, mintedAmountBaseUnits)
  }

  const mintInfo = await getMint(connection, mint)

  return {
    cluster,
    rpcUrl,
    mintAddress: mint.toBase58(),
    recipient: recipient.toBase58(),
    recipientTokenAccount: tokenAccount.address.toBase58(),
    adminPublicKey: payer.publicKey.toBase58(),
    decimals: mintInfo.decimals,
    supply: formatBaseUnits(mintInfo.supply, mintInfo.decimals),
    supplyBaseUnits: mintInfo.supply.toString(),
    ...metadataResult,
    metadata: {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri || null,
    },
    mintSignature,
  }
}

export async function upsertTokenMetadata(input: UpsertTokenMetadataInput) {
  const { connection, cluster, rpcUrl } = getConnection(input.cluster)
  const payer = getAdminKeypair()
  const mintPublicKey = new PublicKey(input.mintAddress)

  await getMint(connection, mintPublicKey)

  const metadataResult = await sendMetadataTransaction(connection, payer, mintPublicKey, {
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
  })

  return {
    cluster,
    rpcUrl,
    mintAddress: mintPublicKey.toBase58(),
    adminPublicKey: payer.publicKey.toBase58(),
    ...metadataResult,
    metadata: {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri || null,
    },
  }
}

export async function mintExistingToken(input: MintExistingTokenInput) {
  const { connection, cluster, rpcUrl } = getConnection(input.cluster)
  const payer = getAdminKeypair()
  const mintPublicKey = new PublicKey(input.mintAddress)
  const mintInfo = await getMint(connection, mintPublicKey)
  const recipient = new PublicKey(input.recipient || payer.publicKey.toBase58())
  const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mintPublicKey, recipient)
  const amountBaseUnits = amountToBaseUnits(input.amount, mintInfo.decimals)

  if (amountBaseUnits <= BigInt(0)) {
    throw new Error('Mint amount must be greater than zero.')
  }

  const signature = await mintTo(connection, payer, mintPublicKey, tokenAccount.address, payer, amountBaseUnits)
  const refreshedMint = await getMint(connection, mintPublicKey)
  const accountInfo = await getAccount(connection, tokenAccount.address)

  return {
    cluster,
    rpcUrl,
    signature,
    mintAddress: mintPublicKey.toBase58(),
    recipient: recipient.toBase58(),
    recipientTokenAccount: tokenAccount.address.toBase58(),
    mintedAmount: input.amount,
    mintedAmountBaseUnits: amountBaseUnits.toString(),
    totalSupply: formatBaseUnits(refreshedMint.supply, refreshedMint.decimals),
    totalSupplyBaseUnits: refreshedMint.supply.toString(),
    recipientBalance: formatBaseUnits(accountInfo.amount, refreshedMint.decimals),
    recipientBalanceBaseUnits: accountInfo.amount.toString(),
    decimals: refreshedMint.decimals,
  }
}

export async function inspectTokenMint(input: InspectTokenMintInput) {
  const { connection, cluster, rpcUrl } = getConnection(input.cluster)
  const mintPublicKey = new PublicKey(input.mintAddress)
  const mintInfo = await getMint(connection, mintPublicKey)

  const response: Record<string, string | number | boolean | null> = {
    cluster,
    rpcUrl,
    mintAddress: mintPublicKey.toBase58(),
    decimals: mintInfo.decimals,
    isInitialized: mintInfo.isInitialized,
    supply: formatBaseUnits(mintInfo.supply, mintInfo.decimals),
    supplyBaseUnits: mintInfo.supply.toString(),
    mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
    freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
  }

  if (input.holderAddress) {
    const holder = new PublicKey(input.holderAddress)
    const account = await getOrCreateAssociatedTokenAccount(connection, getAdminKeypair(), mintPublicKey, holder)
    response.holderAddress = holder.toBase58()
    response.holderTokenAccount = account.address.toBase58()
    response.holderBalance = formatBaseUnits(account.amount, mintInfo.decimals)
    response.holderBalanceBaseUnits = account.amount.toString()
  }

  return response
}

export async function disableMintAuthority(input: DisableMintAuthorityInput) {
  const { connection, cluster, rpcUrl } = getConnection(input.cluster)
  const payer = getAdminKeypair()
  const mintPublicKey = new PublicKey(input.mintAddress)

  const signature = await setAuthority(
    connection,
    payer,
    mintPublicKey,
    payer.publicKey,
    AuthorityType.MintTokens,
    null
  )

  const mintInfo = await getMint(connection, mintPublicKey)

  return {
    cluster,
    rpcUrl,
    signature,
    mintAddress: mintPublicKey.toBase58(),
    mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
    freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
  }
}
