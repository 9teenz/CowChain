import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  AuthorityType,
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  setAuthority,
} from '@solana/spl-token'

const ROOT = process.cwd()
const ENV_PATH = path.join(ROOT, '.env.local')
const DEFAULT_RPC = 'https://api.devnet.solana.com'
const DEFAULT_DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
const DEFAULT_HERD_NAME = 'Alpine Meadow Herd'
const DEFAULT_NAV_PER_TOKEN_USD = 1.106
const DEFAULT_TOTAL_SUPPLY = 100_000
const DEFAULT_TOKEN_DECIMALS = 6
const ALLOW_CREATE_MINT_FLAG = '--allow-create-mint'

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const values = {}

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) {
      continue
    }

    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!match) {
      continue
    }

    const [, key, rawValue] = match
    const trimmed = rawValue.trim()
    values[key] = trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1) : trimmed
  }

  return values
}

function parseSecretKey(secret) {
  const trimmed = secret.trim()

  if (trimmed.startsWith('[')) {
    return Uint8Array.from(JSON.parse(trimmed))
  }

  throw new Error('SOLANA_ADMIN_PRIVATE_KEY must be a JSON array in `.env.local`.')
}

function encodeU64(value) {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64LE(BigInt(value))
  return buffer
}

function encodeString(value) {
  const bytes = Buffer.from(value, 'utf8')
  const length = Buffer.alloc(4)
  length.writeUInt32LE(bytes.length)
  return Buffer.concat([length, bytes])
}

function discriminator(name) {
  return crypto.createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

function updateEnvValue(filePath, key, value) {
  const current = fs.readFileSync(filePath, 'utf8')
  const escaped = value.replace(/[$]/g, '$$$$')
  const next = current.match(new RegExp(`^${key}=.*$`, 'm'))
    ? current.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${escaped}`)
    : `${current.trimEnd()}\n${key}=${escaped}\n`

  fs.writeFileSync(filePath, `${next.endsWith('\n') ? next : `${next}\n`}`)
}

function formatSol(lamports) {
  return `${(lamports / 1_000_000_000).toFixed(6)} SOL`
}

async function main() {
  const env = parseEnvFile(ENV_PATH)
  const rpcUrl = env.NEXT_PUBLIC_SOLANA_RPC_URL || env.SOLANA_RPC_URL || DEFAULT_RPC
  const admin = Keypair.fromSecretKey(parseSecretKey(env.SOLANA_ADMIN_PRIVATE_KEY || ''))
  const programId = new PublicKey(env.NEXT_PUBLIC_COWCHAIN_PROGRAM_ID)
  const connection = new Connection(rpcUrl, 'confirmed')

  const [platformPda] = PublicKey.findProgramAddressSync([Buffer.from('platform')], programId)
  const herdName = env.COWCHAIN_PRIMARY_HERD_NAME || DEFAULT_HERD_NAME
  const [herdPoolPda] = PublicKey.findProgramAddressSync([Buffer.from('herd-pool'), Buffer.from(herdName, 'utf8')], programId)

  const adminBalanceBefore = await connection.getBalance(admin.publicKey)
  console.log(`Admin wallet: ${admin.publicKey.toBase58()} (${formatSol(adminBalanceBefore)})`)
  console.log(`Program: ${programId.toBase58()}`)
  console.log(`Platform PDA: ${platformPda.toBase58()}`)
  console.log(`Herd pool PDA: ${herdPoolPda.toBase58()}`)

  let platformMint
  let mintInfo = null
  const currentMintValue = env.NEXT_PUBLIC_COWCHAIN_TOKEN_MINT?.trim()
  const allowCreateMint = process.argv.includes(ALLOW_CREATE_MINT_FLAG)

  if (currentMintValue) {
    try {
      platformMint = new PublicKey(currentMintValue)
      mintInfo = await getMint(connection, platformMint)
    } catch {
      platformMint = undefined
      mintInfo = null
    }
  }

  if (!platformMint || !mintInfo) {
    if (!allowCreateMint) {
      throw new Error(
        'Configured `NEXT_PUBLIC_COWCHAIN_TOKEN_MINT` is missing or unreadable. ' +
          `Set it to the real CowChain mint first, or rerun with ${ALLOW_CREATE_MINT_FLAG} if you explicitly want a replacement devnet mint.`
      )
    }

    console.log('Creating a new CowChain mint controlled by the admin wallet...')
    platformMint = await createMint(connection, admin, admin.publicKey, null, DEFAULT_TOKEN_DECIMALS)
    mintInfo = await getMint(connection, platformMint)
    updateEnvValue(ENV_PATH, 'NEXT_PUBLIC_COWCHAIN_TOKEN_MINT', platformMint.toBase58())
    console.log(`New CowChain mint: ${platformMint.toBase58()} (decimals: ${mintInfo.decimals})`)
  } else {
    console.log(`Using existing CowChain mint: ${platformMint.toBase58()} (decimals: ${mintInfo.decimals})`)
  }

  const quoteMint = new PublicKey(env.COWCHAIN_QUOTE_MINT || DEFAULT_DEVNET_USDC_MINT)
  const quoteVault = await getOrCreateAssociatedTokenAccount(
    connection,
    admin,
    quoteMint,
    herdPoolPda,
    true,
    'confirmed'
  )

  const platformAccountInfo = await connection.getAccountInfo(platformPda)

  if (!platformAccountInfo) {
    console.log('Initializing platform account...')
    const initPlatformIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: quoteMint, isSigner: false, isWritable: false },
        { pubkey: platformMint, isSigner: false, isWritable: false },
        { pubkey: platformPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator('initialize_platform'), encodeU64(DEFAULT_TOTAL_SUPPLY)]),
    })

    const signature = await sendAndConfirmTransaction(connection, new Transaction().add(initPlatformIx), [admin], {
      commitment: 'confirmed',
    })
    console.log(`initialize_platform tx: ${signature}`)
  } else {
    console.log('Platform PDA already initialized.')
  }

  mintInfo = await getMint(connection, platformMint)
  let mintAuthority = mintInfo.mintAuthority?.toBase58() || null

  if (mintAuthority !== platformPda.toBase58()) {
    if (mintAuthority !== admin.publicKey.toBase58()) {
      console.warn(
        `CowChain mint authority is ${mintAuthority}, not the admin wallet ${admin.publicKey.toBase58()}. ` +
          `Skipping authority transfer. Live purchases stay blocked until the token owner transfers mint authority to ${platformPda.toBase58()}.`
      )
    } else {
      console.log('Transferring CowChain mint authority to the platform PDA...')
      const signature = await setAuthority(
        connection,
        admin,
        platformMint,
        admin.publicKey,
        AuthorityType.MintTokens,
        platformPda,
        undefined,
        { commitment: 'confirmed' }
      )
      console.log(`setAuthority tx: ${signature}`)
      mintInfo = await getMint(connection, platformMint)
      mintAuthority = mintInfo.mintAuthority?.toBase58() || null
    }
  } else {
    console.log('CowChain mint authority already points to the platform PDA.')
  }

  const herdPoolAccountInfo = await connection.getAccountInfo(herdPoolPda)

  if (!herdPoolAccountInfo) {
    console.log('Initializing herd pool account...')
    const navPerTokenE6 = Math.round(DEFAULT_NAV_PER_TOKEN_USD * 1_000_000)
    const initHerdPoolIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: admin.publicKey, isSigner: true, isWritable: true },
        { pubkey: platformPda, isSigner: false, isWritable: true },
        { pubkey: quoteVault.address, isSigner: false, isWritable: true },
        { pubkey: herdPoolPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        discriminator('initialize_herd_pool'),
        encodeString(herdName),
        encodeU64(navPerTokenE6),
      ]),
    })

    const signature = await sendAndConfirmTransaction(connection, new Transaction().add(initHerdPoolIx), [admin], {
      commitment: 'confirmed',
    })
    console.log(`initialize_herd_pool tx: ${signature}`)
  } else {
    console.log('Herd pool PDA already initialized.')
  }

  if (process.argv.includes('--test-buy')) {
    if (mintAuthority !== platformPda.toBase58()) {
      throw new Error(
        `Cannot run --test-buy because mint authority is ${mintAuthority || 'none'} instead of ${platformPda.toBase58()}.`
      )
    }

    console.log('Running a devnet smoke test purchase...')
    const buyer = Keypair.generate()
    const treasuryBefore = await connection.getBalance(admin.publicKey)

    const fundSignature = await sendAndConfirmTransaction(
      connection,
      new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: admin.publicKey,
          toPubkey: buyer.publicKey,
          lamports: 1_500_000_000,
        })
      ),
      [admin],
      { commitment: 'confirmed' }
    )

    const buyerAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      platformMint,
      buyer.publicKey,
      false,
      'confirmed'
    )

    const [positionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('position'), herdPoolPda.toBuffer(), buyer.publicKey.toBuffer()],
      programId
    )

    const tokenAmount = 5
    const solPriceUsdE6 = Math.round(Number(env.NEXT_PUBLIC_SOL_USD_RATE || '155') * 1_000_000)
    const rawLamports = Math.ceil((tokenAmount * DEFAULT_NAV_PER_TOKEN_USD * 1_000_000_000) / Number(env.NEXT_PUBLIC_SOL_USD_RATE || '155'))
    const maxLamports = Math.ceil(rawLamports * 1.02)

    const buyIx = new TransactionInstruction({
      programId,
      keys: [
        { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
        { pubkey: herdPoolPda, isSigner: false, isWritable: true },
        { pubkey: platformPda, isSigner: false, isWritable: true },
        { pubkey: platformMint, isSigner: false, isWritable: true },
        { pubkey: admin.publicKey, isSigner: false, isWritable: true },
        { pubkey: buyerAta.address, isSigner: false, isWritable: true },
        { pubkey: positionPda, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        discriminator('buy_tokens_with_sol'),
        encodeU64(tokenAmount),
        encodeU64(solPriceUsdE6),
        encodeU64(maxLamports),
      ]),
    })

    const buySignature = await sendAndConfirmTransaction(connection, new Transaction().add(buyIx), [buyer], {
      commitment: 'confirmed',
    })

    const buyerTokenAccount = await getAccount(connection, buyerAta.address)
    const treasuryAfter = await connection.getBalance(admin.publicKey)

    console.log(`fund test buyer tx: ${fundSignature}`)
    console.log(`buy CowChain tx: ${buySignature}`)
    console.log(`buyer wallet: ${buyer.publicKey.toBase58()}`)
    console.log(`buyer token balance (raw): ${buyerTokenAccount.amount.toString()}`)
    console.log(`treasury delta: ${treasuryAfter - treasuryBefore} lamports`)
  }

  console.log('CowChain devnet initialization complete.')
  console.log(`Treasury wallet: ${admin.publicKey.toBase58()}`)
  console.log(`Active CowChain mint: ${platformMint.toBase58()}`)
  if (mintAuthority !== platformPda.toBase58()) {
    console.log(`Mint authority still needs to be transferred to ${platformPda.toBase58()} before live dashboard purchases can settle.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
