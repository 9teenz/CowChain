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

/**
 * Step 1 of the buy flow: User sends correct SOL amount to treasury via Phantom.
 * Uses SystemProgram.transfer (not the Anchor instruction) so the amount matches the frontend NAV.
 * Step 2 (server-side token minting) is handled by /api/buy-cowchain/mint.
 */
export async function buyCowChainWithPhantom({
  quote,
  expectedWalletAddress,
  solTreasury,
}: BuyCowChainWithPhantomInput) {
  const { provider, publicKey: buyer, walletAddress } = await ensureWallet(expectedWalletAddress)
  const connection = new Connection(resolveRpcUrl(quote.cluster), 'confirmed')

  const resolvedTreasury = (solTreasury || process.env.NEXT_PUBLIC_COWCHAIN_SOL_TREASURY || '').trim()

  if (!resolvedTreasury) {
    throw new Error('Missing `NEXT_PUBLIC_COWCHAIN_SOL_TREASURY`. Set the devnet SOL treasury address before sending purchases.')
  }

  const treasuryPublicKey = new PublicKey(resolvedTreasury)

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: buyer,
      toPubkey: treasuryPublicKey,
      lamports: quote.lamports,
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
    throw new Error(`SOL transfer transaction failed on-chain. ${JSON.stringify(status.err)}`)
  }

  return {
    signature,
    walletAddress,
    cluster: quote.cluster,
  }
}
