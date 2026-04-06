'use client'

import { Buffer } from 'buffer'

import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token'
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from '@solana/web3.js'

import { PLATFORM_TOKEN_MINT } from '@/lib/demo-data'

export type PurchaseCluster = 'devnet' | 'testnet' | 'mainnet-beta'

export type BuyCowChainQuote = {
  ok: true
  herdId: string
  herdName: string
  symbol: string
  tokenAmount: number
  navPerTokenUsd: number
  usdTotal: number
  solUsdRate: number
  solTotal: number
  lamports: number
  maxLamports: number
  slippageBps: number
  cluster: PurchaseCluster
  expiresAt: string
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

export type BuyCowChainWithPhantomInput = {
  quote: BuyCowChainQuote
  expectedWalletAddress?: string | null
  mintAddress?: string
  programId?: string
  solTreasury?: string
}

function resolveRpcUrl(cluster: PurchaseCluster) {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || clusterApiUrl(cluster)
}

function getPhantomProvider() {
  const provider = (window as Window & { solana?: PhantomProvider }).solana

  if (!provider?.isPhantom) {
    throw new Error('Phantom wallet extension was not found. Install Phantom and try again.')
  }

  return provider
}

async function ensureWallet(expectedWalletAddress?: string | null) {
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

async function buildInstructionData(tokenAmount: number, solPriceUsdE6: number, maxLamports: number) {
  const encoder = new TextEncoder()
  const preimage = encoder.encode('global:buy_tokens_with_sol')
  const digest = await crypto.subtle.digest('SHA-256', preimage)
  const discriminator = new Uint8Array(digest).slice(0, 8)
  const data = new Uint8Array(8 + 8 + 8 + 8)
  const view = new DataView(data.buffer)

  data.set(discriminator, 0)
  view.setBigUint64(8, BigInt(tokenAmount), true)
  view.setBigUint64(16, BigInt(solPriceUsdE6), true)
  view.setBigUint64(24, BigInt(maxLamports), true)

  return Buffer.from(data)
}

export async function buyCowChainWithPhantom({
  quote,
  expectedWalletAddress,
  mintAddress,
  programId,
  solTreasury,
}: BuyCowChainWithPhantomInput) {
  const { provider, publicKey: buyer, walletAddress } = await ensureWallet(expectedWalletAddress)
  const connection = new Connection(resolveRpcUrl(quote.cluster), 'confirmed')

  const resolvedProgramId = (programId || process.env.NEXT_PUBLIC_COWCHAIN_PROGRAM_ID || 'CowChain111111111111111111111111111111111111').trim()
  const resolvedTreasury = (solTreasury || process.env.NEXT_PUBLIC_COWCHAIN_SOL_TREASURY || '').trim()

  if (!resolvedTreasury) {
    throw new Error('Missing `NEXT_PUBLIC_COWCHAIN_SOL_TREASURY`. Set the devnet SOL treasury address before sending purchases.')
  }

  const mintPublicKey = new PublicKey((mintAddress || process.env.NEXT_PUBLIC_COWCHAIN_TOKEN_MINT || PLATFORM_TOKEN_MINT).trim())
  const programPublicKey = new PublicKey(resolvedProgramId)
  const treasuryPublicKey = new PublicKey(resolvedTreasury)

  const [platformPda] = PublicKey.findProgramAddressSync([Buffer.from('platform')], programPublicKey)
  const [herdPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('herd-pool'), Buffer.from(quote.herdName, 'utf8')],
    programPublicKey
  )
  const [positionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('position'), herdPoolPda.toBuffer(), buyer.toBuffer()],
    programPublicKey
  )

  const [platformInfo, herdPoolInfo] = await connection.getMultipleAccountsInfo([platformPda, herdPoolPda])

  if (!platformInfo || !herdPoolInfo) {
    throw new Error('CowChain on-chain pool is not initialized on devnet yet. The admin must initialize the platform before purchases can settle.')
  }

  const mintInfo = await getMint(connection, mintPublicKey)
  const mintAuthority = mintInfo.mintAuthority?.toBase58() || null

  if (mintAuthority !== platformPda.toBase58()) {
    throw new Error(
      `Live purchases for CowChain mint ${mintPublicKey.toBase58()} are not activated yet. ` +
        `Current mint authority is ${mintAuthority || 'none'}; it must be transferred to ${platformPda.toBase58()} before Phantom purchases can settle real tokens.`
    )
  }

  const buyerPlatformAccount = getAssociatedTokenAddressSync(mintPublicKey, buyer)
  const transaction = new Transaction()
  const buyerTokenAccountInfo = await connection.getAccountInfo(buyerPlatformAccount)

  if (!buyerTokenAccountInfo) {
    transaction.add(createAssociatedTokenAccountInstruction(buyer, buyerPlatformAccount, buyer, mintPublicKey))
  }

  const instructionData = await buildInstructionData(
    quote.tokenAmount,
    Math.round(quote.solUsdRate * 1_000_000),
    quote.maxLamports
  )

  transaction.add(
    new TransactionInstruction({
      programId: programPublicKey,
      keys: [
        { pubkey: buyer, isSigner: true, isWritable: true },
        { pubkey: herdPoolPda, isSigner: false, isWritable: true },
        { pubkey: platformPda, isSigner: false, isWritable: true },
        { pubkey: mintPublicKey, isSigner: false, isWritable: true },
        { pubkey: treasuryPublicKey, isSigner: false, isWritable: true },
        { pubkey: buyerPlatformAccount, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    })
  )

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  transaction.feePayer = buyer
  transaction.recentBlockhash = blockhash

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

  const signatureStatus = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true })
  const status = signatureStatus.value[0]

  if (status?.err) {
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })
    const logs = tx?.meta?.logMessages?.slice(-8).join(' | ')
    throw new Error(`CowChain purchase transaction failed on-chain. ${logs || JSON.stringify(status.err)}`)
  }

  return {
    signature,
    walletAddress,
    buyerPlatformAccount: buyerPlatformAccount.toBase58(),
    herdPool: herdPoolPda.toBase58(),
    position: positionPda.toBase58(),
    cluster: quote.cluster,
  }
}
