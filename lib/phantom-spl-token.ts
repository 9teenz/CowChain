'use client'

import {
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js'
import { buildUpsertTokenMetadataInstruction } from '@/lib/token-metadata'

export type TokenCluster = 'devnet' | 'testnet' | 'mainnet-beta'

export interface PhantomCreateTokenInput {
  cluster: TokenCluster
  expectedWalletAddress?: string | null
  name: string
  symbol: string
  uri?: string
  decimals: number
  initialSupply?: string
  recipient?: string
  enableFreezeAuthority?: boolean
}

export interface PhantomMintTokenInput {
  cluster: TokenCluster
  expectedWalletAddress?: string | null
  mintAddress: string
  amount: string
  recipient?: string
}

export interface PhantomDisableMintAuthorityInput {
  cluster: TokenCluster
  expectedWalletAddress?: string | null
  mintAddress: string
}

export interface PhantomUpsertTokenMetadataInput {
  cluster: TokenCluster
  expectedWalletAddress?: string | null
  mintAddress: string
  name: string
  symbol: string
  uri?: string
}

type PhantomProvider = {
  isPhantom?: boolean
  publicKey?: {
    toString: () => string
  }
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{
    publicKey: {
      toString: () => string
    }
  }>
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string } | string>
}

function resolveRpcUrl(cluster: TokenCluster) {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || clusterApiUrl(cluster)
}

function getPhantomProvider() {
  const provider = (window as Window & { solana?: PhantomProvider }).solana

  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet extension was not found. Install Phantom and try again.')
  }

  return provider
}

async function ensureIssuerWallet(expectedWalletAddress?: string | null) {
  const provider = getPhantomProvider()
  const connected = provider.publicKey ? { publicKey: provider.publicKey } : await provider.connect()
  const walletAddress = connected.publicKey.toString()

  if (expectedWalletAddress && expectedWalletAddress !== walletAddress) {
    throw new Error(`Connected Phantom wallet does not match the wallet linked to your account (${expectedWalletAddress}).`)
  }

  return {
    provider,
    publicKey: new PublicKey(walletAddress),
    walletAddress,
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

async function ensureAssociatedTokenAccount(
  connection: Connection,
  transaction: Transaction,
  mint: PublicKey,
  owner: PublicKey,
  payer: PublicKey
) {
  const ata = getAssociatedTokenAddressSync(mint, owner)
  const accountInfo = await connection.getAccountInfo(ata)

  if (!accountInfo) {
    transaction.add(createAssociatedTokenAccountInstruction(payer, ata, owner, mint))
  }

  return ata
}

async function sendTransaction(
  connection: Connection,
  provider: PhantomProvider,
  payer: PublicKey,
  transaction: Transaction,
  partialSigners: Keypair[] = []
) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

  transaction.feePayer = payer
  transaction.recentBlockhash = blockhash

  if (partialSigners.length > 0) {
    transaction.partialSign(...partialSigners)
  }

  const response = await provider.signAndSendTransaction(transaction)
  const signature = typeof response === 'string' ? response : response.signature

  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  )

  return signature
}

export async function createTokenWithPhantom(input: PhantomCreateTokenInput) {
  const { provider, publicKey: payer, walletAddress } = await ensureIssuerWallet(input.expectedWalletAddress)
  const connection = new Connection(resolveRpcUrl(input.cluster), 'confirmed')
  const mintKeypair = Keypair.generate()
  const recipient = new PublicKey(input.recipient || walletAddress)
  const rentLamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE)

  const transaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports: rentLamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      input.decimals,
      payer,
      input.enableFreezeAuthority === false ? null : payer
    )
  )

  const { instruction: metadataInstruction, metadataAddress, metadataAction } = await buildUpsertTokenMetadataInstruction(
    connection,
    mintKeypair.publicKey,
    payer,
    {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri,
    }
  )

  transaction.add(metadataInstruction)

  const recipientTokenAccount = await ensureAssociatedTokenAccount(
    connection,
    transaction,
    mintKeypair.publicKey,
    recipient,
    payer
  )

  const requestedAmount = input.initialSupply?.trim() || '0'
  const mintedAmountBaseUnits = amountToBaseUnits(requestedAmount, input.decimals)

  if (mintedAmountBaseUnits > BigInt(0)) {
    transaction.add(createMintToInstruction(mintKeypair.publicKey, recipientTokenAccount, payer, mintedAmountBaseUnits))
  }

  const signature = await sendTransaction(connection, provider, payer, transaction, [mintKeypair])
  const mintInfo = await getMint(connection, mintKeypair.publicKey)

  return {
    action: 'create',
    cluster: input.cluster,
    rpcUrl: resolveRpcUrl(input.cluster),
    signature,
    metadataSignature: signature,
    mintAddress: mintKeypair.publicKey.toBase58(),
    metadataAddress: metadataAddress.toBase58(),
    metadataStatus: metadataAction,
    recipient: recipient.toBase58(),
    recipientTokenAccount: recipientTokenAccount.toBase58(),
    adminPublicKey: walletAddress,
    decimals: mintInfo.decimals,
    supply: formatBaseUnits(mintInfo.supply, mintInfo.decimals),
    supplyBaseUnits: mintInfo.supply.toString(),
    metadata: {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri || null,
    },
  }
}

export async function upsertTokenMetadataWithPhantom(input: PhantomUpsertTokenMetadataInput) {
  const { provider, publicKey: payer } = await ensureIssuerWallet(input.expectedWalletAddress)
  const connection = new Connection(resolveRpcUrl(input.cluster), 'confirmed')
  const mintPublicKey = new PublicKey(input.mintAddress)

  await getMint(connection, mintPublicKey)

  const { instruction, metadataAddress, metadataAction } = await buildUpsertTokenMetadataInstruction(
    connection,
    mintPublicKey,
    payer,
    {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri,
    }
  )

  const transaction = new Transaction().add(instruction)
  const signature = await sendTransaction(connection, provider, payer, transaction)

  return {
    action: 'upsertMetadata',
    cluster: input.cluster,
    rpcUrl: resolveRpcUrl(input.cluster),
    signature,
    metadataSignature: signature,
    mintAddress: mintPublicKey.toBase58(),
    metadataAddress: metadataAddress.toBase58(),
    metadataStatus: metadataAction,
    metadata: {
      name: input.name,
      symbol: input.symbol,
      uri: input.uri || null,
    },
  }
}

export async function mintTokenWithPhantom(input: PhantomMintTokenInput) {
  const { provider, publicKey: payer, walletAddress } = await ensureIssuerWallet(input.expectedWalletAddress)
  const connection = new Connection(resolveRpcUrl(input.cluster), 'confirmed')
  const mintPublicKey = new PublicKey(input.mintAddress)
  const mintInfo = await getMint(connection, mintPublicKey)
  const recipient = new PublicKey(input.recipient || walletAddress)
  const amountBaseUnits = amountToBaseUnits(input.amount, mintInfo.decimals)

  if (amountBaseUnits <= BigInt(0)) {
    throw new Error('Mint amount must be greater than zero.')
  }

  const transaction = new Transaction()
  const recipientTokenAccount = await ensureAssociatedTokenAccount(connection, transaction, mintPublicKey, recipient, payer)
  transaction.add(createMintToInstruction(mintPublicKey, recipientTokenAccount, payer, amountBaseUnits))

  const signature = await sendTransaction(connection, provider, payer, transaction)
  const refreshedMint = await getMint(connection, mintPublicKey)
  const accountInfo = await getAccount(connection, recipientTokenAccount)

  return {
    action: 'mint',
    cluster: input.cluster,
    rpcUrl: resolveRpcUrl(input.cluster),
    signature,
    mintAddress: mintPublicKey.toBase58(),
    recipient: recipient.toBase58(),
    recipientTokenAccount: recipientTokenAccount.toBase58(),
    mintedAmount: input.amount,
    mintedAmountBaseUnits: amountBaseUnits.toString(),
    totalSupply: formatBaseUnits(refreshedMint.supply, refreshedMint.decimals),
    totalSupplyBaseUnits: refreshedMint.supply.toString(),
    recipientBalance: formatBaseUnits(accountInfo.amount, refreshedMint.decimals),
    recipientBalanceBaseUnits: accountInfo.amount.toString(),
    decimals: refreshedMint.decimals,
  }
}

export async function disableMintAuthorityWithPhantom(input: PhantomDisableMintAuthorityInput) {
  const { provider, publicKey: payer } = await ensureIssuerWallet(input.expectedWalletAddress)
  const connection = new Connection(resolveRpcUrl(input.cluster), 'confirmed')
  const mintPublicKey = new PublicKey(input.mintAddress)

  const transaction = new Transaction().add(
    createSetAuthorityInstruction(mintPublicKey, payer, AuthorityType.MintTokens, null)
  )

  const signature = await sendTransaction(connection, provider, payer, transaction)
  const mintInfo = await getMint(connection, mintPublicKey)

  return {
    action: 'disableMintAuthority',
    cluster: input.cluster,
    rpcUrl: resolveRpcUrl(input.cluster),
    signature,
    mintAddress: mintPublicKey.toBase58(),
    mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
    freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
  }
}
