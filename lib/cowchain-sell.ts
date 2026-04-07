'use client'

import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token'
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js'

import { PLATFORM_TOKEN_MINT } from '@/lib/demo-data'

export type SellCluster = 'devnet' | 'testnet' | 'mainnet-beta'

export interface SellCowChainInput {
  tokenAmount: number
  cluster: SellCluster
  expectedWalletAddress?: string | null
}

export interface SellCowChainResult {
  signature: string
  seller: string
  treasury: string
  tokenAmount: number
}

type PhantomProvider = {
  isPhantom?: boolean
  publicKey?: { toString: () => string }
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>
  signAndSendTransaction: (transaction: Transaction) => Promise<{ signature: string } | string>
}

function resolveRpcUrl(cluster: SellCluster) {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL?.trim() || clusterApiUrl(cluster)
}

function getPhantomProvider(): PhantomProvider {
  const provider = (window as Window & { solana?: PhantomProvider }).solana
  if (!provider?.isPhantom) {
    throw new Error('Phantom кошелёк не найден. Установите Phantom и попробуйте снова.')
  }
  return provider
}

async function ensureWallet(expectedWalletAddress?: string | null) {
  const provider = getPhantomProvider()
  const connected = provider.publicKey
    ? { publicKey: provider.publicKey }
    : await provider.connect()
  const walletAddress = connected.publicKey.toString()

  if (expectedWalletAddress && expectedWalletAddress !== walletAddress) {
    throw new Error(
      `Подключённый Phantom кошелёк не совпадает с привязанным к аккаунту (${expectedWalletAddress}).`
    )
  }

  return { provider, publicKey: new PublicKey(walletAddress), walletAddress }
}

/**
 * Transfer SPL tokens from user's Phantom wallet to the platform treasury ATA.
 * Returns the on-chain transaction signature.
 */
export async function sellCowChainWithPhantom({
  tokenAmount,
  cluster,
  expectedWalletAddress,
}: SellCowChainInput): Promise<SellCowChainResult> {
  if (tokenAmount <= 0) {
    throw new Error('Количество токенов должно быть положительным.')
  }

  const { provider, publicKey: seller, walletAddress } = await ensureWallet(expectedWalletAddress)
  const connection = new Connection(resolveRpcUrl(cluster), 'confirmed')

  const mintPubkey = new PublicKey(PLATFORM_TOKEN_MINT)
  const treasuryAddress = (
    process.env.NEXT_PUBLIC_COWCHAIN_SOL_TREASURY || ''
  ).trim()

  if (!treasuryAddress) {
    throw new Error('NEXT_PUBLIC_COWCHAIN_SOL_TREASURY не настроен.')
  }

  const treasury = new PublicKey(treasuryAddress)

  // Derive ATAs
  const sellerAta = getAssociatedTokenAddressSync(mintPubkey, seller)
  const treasuryAta = getAssociatedTokenAddressSync(mintPubkey, treasury)

  // Get mint decimals
  const { getMint } = await import('@solana/spl-token')
  const mintInfo = await getMint(connection, mintPubkey)
  const decimals = mintInfo.decimals
  const baseUnits = BigInt(Math.round(tokenAmount * 10 ** decimals))

  // Verify seller has enough tokens
  try {
    const sellerAccount = await getAccount(connection, sellerAta)
    if (sellerAccount.amount < baseUnits) {
      const available = Number(sellerAccount.amount) / 10 ** decimals
      throw new Error(
        `Недостаточно токенов на кошельке. Доступно: ${available.toFixed(2)}, требуется: ${tokenAmount}.`
      )
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Недостаточно')) {
      throw error
    }
    throw new Error('Токен-аккаунт не найден на кошельке. Убедитесь, что у вас есть CowChain токены.')
  }

  const transaction = new Transaction()

  // Create treasury ATA if it doesn't exist
  try {
    await getAccount(connection, treasuryAta)
  } catch {
    transaction.add(
      createAssociatedTokenAccountInstruction(seller, treasuryAta, treasury, mintPubkey)
    )
  }

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(sellerAta, treasuryAta, seller, baseUnits, [], TOKEN_PROGRAM_ID)
  )

  transaction.feePayer = seller
  transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash

  // Sign and send via Phantom
  const result = await provider.signAndSendTransaction(transaction)
  const signature = typeof result === 'string' ? result : result.signature

  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed')

  return {
    signature,
    seller: walletAddress,
    treasury: treasuryAddress,
    tokenAmount,
  }
}
