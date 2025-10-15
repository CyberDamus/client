import {
  getGroupMemberPointerState,
  getMint,
  getTokenGroupMemberState,
  getTokenMetadata,
} from '@solana/spl-token'
import { Connection, PublicKey } from '@solana/web3.js'
import { TOKEN_2022_PROGRAM_ID } from './constants'
import { getOracleData } from './oracle'
import { parseCardsFromToken, ParsedCard } from './tokenMetadata'

/**
 * Helper: Extract value from Token-2022 additionalMetadata array
 *
 * Token-2022 stores additionalMetadata as array of [key, value] tuples:
 * [['fortune_number', '27'], ['past', 'ipfs://...'], ...]
 */
export function getAdditionalMetadataField(
  metadata: any,
  fieldName: string
): string | undefined {
  const additionalMetadata = metadata?.additionalMetadata
  if (!Array.isArray(additionalMetadata)) return undefined

  const field = additionalMetadata.find(
    ([key]: [string, string]) => key === fieldName
  )
  return field?.[1]
}

/**
 * Fortune token data for history page
 */
export interface HistoryFortune {
  mint: PublicKey
  tokenAccount: PublicKey
  fortuneNumber: number
  timestamp: number
  cards: ParsedCard[]
  metadata: {
    name: string
    symbol: string
    uri: string
  }
  cardImages?: {
    past: string
    present: string
    future: string
  }
  signature?: string // First transaction signature
}

/**
 * Fetch user's CyberDamus fortune tokens (limited to 10 latest)
 *
 * Steps:
 * 1. Get all Token-2022 tokens owned by user
 * 2. Filter by balance > 0
 * 3. Check GroupMemberPointer to verify collection membership
 * 4. Parse metadata and cards
 * 5. Sort by timestamp (newest first)
 *
 * Performance:
 * - Batch processing (5 tokens at a time)
 * - Early exit after finding 10 CyberDamus tokens
 * - Skip tokens with errors (don't break entire fetch)
 */
export async function fetchUserFortunes(
  connection: Connection,
  userPublicKey: PublicKey,
  limit: number = 10
): Promise<HistoryFortune[]> {
  try {
    // 1. Get Oracle data (for collection mint)
    const oracle = await getOracleData(connection)
    const collectionMint = oracle.collectionMint

    // 2. Get all Token-2022 token accounts owned by user
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      userPublicKey,
      { programId: TOKEN_2022_PROGRAM_ID }
    )

    // 3. Filter tokens with balance > 0
    const ownedTokens = tokenAccounts.value.filter((account) => {
      const amount = account.account.data.parsed.info.tokenAmount.uiAmount
      return amount > 0
    })

    console.log(`\n📊 Found ${ownedTokens.length} Token-2022 tokens`)
    console.log(`🎯 CyberDamus collection: ${collectionMint.toBase58()}\n`)

    const fortunes: HistoryFortune[] = []
    const BATCH_SIZE = 5

    // 4. Process tokens in batches
    for (let i = 0; i < ownedTokens.length; i += BATCH_SIZE) {
      // Early exit if we found enough
      if (fortunes.length >= limit) {
        break
      }

      const batch = ownedTokens.slice(i, i + BATCH_SIZE)

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(({ account, pubkey: tokenAccount }) =>
          processToken(
            connection,
            tokenAccount,
            new PublicKey(account.data.parsed.info.mint),
            collectionMint
          )
        )
      )

      // Collect successful results
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          fortunes.push(result.value)

          // Stop if we reached limit
          if (fortunes.length >= limit) {
            break
          }
        }
      }
    }

    // 5. Sort by timestamp (newest first)
    fortunes.sort((a, b) => b.timestamp - a.timestamp)

    console.log(`\n✅ Found ${fortunes.length} CyberDamus fortunes`)

    return fortunes

  } catch (error) {
    console.error('Failed to fetch user fortunes:', error)
    throw new Error(
      `Failed to load fortune history: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Process a single token and check if it's a CyberDamus fortune
 * Returns null if token is not part of collection or has errors
 */
async function processToken(
  connection: Connection,
  tokenAccount: PublicKey,
  mintAddress: PublicKey,
  collectionMint: PublicKey
): Promise<HistoryFortune | null> {
  const mintStr = mintAddress.toBase58()

  try {
    // 1. Get mint info with extensions
    const mintInfo = await getMint(
      connection,
      mintAddress,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    )

    // 2. Check GroupMemberPointer extension
    const memberPointer = getGroupMemberPointerState(mintInfo)

    if (!memberPointer) {
      // Fallback: Try to filter by metadata name
      return await processTokenByMetadata(connection, tokenAccount, mintAddress)
    }

    // 3. Get group member data
    const memberData = getTokenGroupMemberState(mintInfo)

    if (!memberData || !memberData.group) {
      // Fallback: Try to filter by metadata name
      return await processTokenByMetadata(connection, tokenAccount, mintAddress)
    }

    // 4. Verify this token belongs to CyberDamus collection
    const isCorrectCollection = memberData.group.equals(collectionMint)

    if (!isCorrectCollection) {
      return null
    }

    // 5. Get token metadata
    const metadata = await getTokenMetadata(
      connection,
      mintAddress,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    )

    if (!metadata) {
      console.warn(`No metadata found for token ${mintAddress.toBase58()}`)
      return null
    }

    // 6. Extract fortune number from additionalMetadata
    const fortuneNumberStr = getAdditionalMetadataField(metadata, 'fortune_number')
    const fortuneNumber = fortuneNumberStr
      ? parseInt(fortuneNumberStr, 10)
      : Number(memberData.memberNumber)

    // 7. Extract card images from additionalMetadata
    const pastUri = getAdditionalMetadataField(metadata, 'past')
    const presentUri = getAdditionalMetadataField(metadata, 'present')
    const futureUri = getAdditionalMetadataField(metadata, 'future')

    const cardImages = pastUri && presentUri && futureUri ? {
      past: pastUri,
      present: presentUri,
      future: futureUri,
    } : undefined

    // 8. Parse cards from token name
    const cards = await parseCardsFromToken(connection, mintAddress)

    // 9. Get timestamp from first transaction
    let timestamp = Date.now()
    let signature: string | undefined

    try {
      const signatures = await connection.getSignaturesForAddress(mintAddress, {
        limit: 1,
      })

      if (signatures.length > 0 && signatures[0].blockTime) {
        timestamp = signatures[0].blockTime * 1000
        signature = signatures[0].signature
      }
    } catch (err) {
      // Non-critical error, use current time
    }

    // 10. Return fortune data
    return {
      mint: mintAddress,
      tokenAccount,
      fortuneNumber,
      timestamp,
      cards,
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
      },
      cardImages,
      signature,
    }
  } catch (error) {
    // Log error but don't throw - skip this token
    console.error(`  ❌ Error processing ${mintStr}:`, error)
    return null
  }
}

/**
 * Fallback: Process token by checking metadata name
 * Used when GroupMemberPointer extension is not available
 */
async function processTokenByMetadata(
  connection: Connection,
  tokenAccount: PublicKey,
  mintAddress: PublicKey
): Promise<HistoryFortune | null> {
  const mintStr = mintAddress.toBase58()

  try {
    // 1. Get token metadata
    const metadata = await getTokenMetadata(
      connection,
      mintAddress,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    )

    if (!metadata) {
      return null
    }

    // 2. Check if it's a CyberDamus token
    if (!metadata.name.startsWith('CyberDamus #')) {
      return null
    }

    // 3. Extract fortune number from additionalMetadata
    const fortuneNumberStr = getAdditionalMetadataField(metadata, 'fortune_number')
    const fortuneNumber = fortuneNumberStr
      ? parseInt(fortuneNumberStr, 10)
      : 0

    // 4. Extract card images from additionalMetadata
    const pastUri = getAdditionalMetadataField(metadata, 'past')
    const presentUri = getAdditionalMetadataField(metadata, 'present')
    const futureUri = getAdditionalMetadataField(metadata, 'future')

    const cardImages = pastUri && presentUri && futureUri ? {
      past: pastUri,
      present: presentUri,
      future: futureUri,
    } : undefined

    // 5. Parse cards from token name
    const cards = await parseCardsFromToken(connection, mintAddress)

    // 6. Get timestamp from first transaction
    let timestamp = Date.now()
    let signature: string | undefined

    try {
      const signatures = await connection.getSignaturesForAddress(mintAddress, {
        limit: 1,
      })

      if (signatures.length > 0 && signatures[0].blockTime) {
        timestamp = signatures[0].blockTime * 1000
        signature = signatures[0].signature
      }
    } catch (err) {
      // Non-critical error, use current time
    }

    return {
      mint: mintAddress,
      tokenAccount,
      fortuneNumber,
      timestamp,
      cards,
      metadata: {
        name: metadata.name,
        symbol: metadata.symbol,
        uri: metadata.uri,
      },
      cardImages,
      signature,
    }
  } catch (error) {
    console.error(`  ❌ Fallback error for ${mintStr}:`, error)
    return null
  }
}
