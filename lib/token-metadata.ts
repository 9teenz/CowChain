import {
  DataV2,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
  createUpdateMetadataAccountV2Instruction,
} from '@metaplex-foundation/mpl-token-metadata'
import { Connection, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js'

export interface TokenMetadataInput {
  name: string
  symbol: string
  uri?: string | null
}

const METADATA_NAME_LIMIT = 32
const METADATA_SYMBOL_LIMIT = 10
const METADATA_URI_LIMIT = 200

function normalizeRequiredText(value: string, field: string, maxLength: number) {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`${field} is required for token metadata.`)
  }

  if (normalized.length > maxLength) {
    throw new Error(`${field} is too long. Max allowed is ${maxLength} characters.`)
  }

  return normalized
}

function normalizeOptionalText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim() || ''

  if (normalized.length > maxLength) {
    throw new Error(`Metadata URI is too long. Max allowed is ${maxLength} characters.`)
  }

  return normalized
}

export function normalizeTokenMetadata(input: TokenMetadataInput): DataV2 {
  return {
    name: normalizeRequiredText(input.name, 'Token name', METADATA_NAME_LIMIT),
    symbol: normalizeRequiredText(input.symbol, 'Token symbol', METADATA_SYMBOL_LIMIT),
    uri: normalizeOptionalText(input.uri, METADATA_URI_LIMIT),
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  }
}

export function getTokenMetadataAddress(mint: PublicKey) {
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  )

  return metadataAddress
}

export async function buildUpsertTokenMetadataInstruction(
  connection: Connection,
  mint: PublicKey,
  authority: PublicKey,
  input: TokenMetadataInput
): Promise<{
  instruction: TransactionInstruction
  metadataAddress: PublicKey
  metadataAction: 'created' | 'updated'
}> {
  const metadataAddress = getTokenMetadataAddress(mint)
  const metadata = normalizeTokenMetadata(input)
  const existingMetadata = await connection.getAccountInfo(metadataAddress)

  if (existingMetadata) {
    return {
      instruction: createUpdateMetadataAccountV2Instruction(
        {
          metadata: metadataAddress,
          updateAuthority: authority,
        },
        {
          updateMetadataAccountArgsV2: {
            data: metadata,
            updateAuthority: authority,
            primarySaleHappened: null,
            isMutable: true,
          },
        }
      ),
      metadataAddress,
      metadataAction: 'updated',
    }
  }

  return {
    instruction: createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAddress,
        mint,
        mintAuthority: authority,
        payer: authority,
        updateAuthority: authority,
        systemProgram: SystemProgram.programId,
      },
      {
        createMetadataAccountArgsV3: {
          data: metadata,
          isMutable: true,
          collectionDetails: null,
        },
      }
    ),
    metadataAddress,
    metadataAction: 'created',
  }
}
