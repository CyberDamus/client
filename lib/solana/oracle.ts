import { Connection, PublicKey } from '@solana/web3.js'
import { getOraclePDA } from './constants'

/**
 * Oracle account structure (matches Rust state.rs)
 *
 * Vanilla Solana uses Borsh for serialization (NOT Anchor discriminator!)
 * Total size: 156 bytes
 *
 * Layout:
 * - authority: Pubkey (32 bytes, offset 0)
 * - treasury: Pubkey (32 bytes, offset 32)
 * - total_fortunes: u64 (8 bytes, offset 64)
 * - ipfs_base_hash: [u8; 46] (46 bytes, offset 72)
 * - collection_mint: Pubkey (32 bytes, offset 118)
 * - is_initialized: bool (1 byte, offset 150)
 * - reserved: [u8; 5] (5 bytes, offset 151)
 */
export interface Oracle {
  authority: PublicKey // 32 bytes
  treasury: PublicKey // 32 bytes
  totalFortunes: bigint // 8 bytes (u64)
  ipfsBaseHash: Uint8Array // 46 bytes
  collectionMint: PublicKey // 32 bytes
  isInitialized: boolean // 1 byte
  reserved: Uint8Array // 5 bytes
}

/**
 * Fetch Oracle data from blockchain
 * Uses manual buffer parsing (more reliable than Borsh schema for fixed-size structs)
 */
export async function getOracleData(connection: Connection): Promise<Oracle> {
  const [oraclePDA] = getOraclePDA()

  const accountInfo = await connection.getAccountInfo(oraclePDA)
  if (!accountInfo) {
    throw new Error('Oracle account not found. Is the program initialized?')
  }

  if (accountInfo.data.length !== 156) {
    throw new Error(`Invalid Oracle account size: expected 156 bytes, got ${accountInfo.data.length}`)
  }

  // Manual buffer parsing - matches Rust Borsh layout exactly
  const data = accountInfo.data
  let offset = 0

  // Parse authority (32 bytes)
  const authority = new PublicKey(data.slice(offset, offset + 32))
  offset += 32

  // Parse treasury (32 bytes)
  const treasury = new PublicKey(data.slice(offset, offset + 32))
  offset += 32

  // Parse totalFortunes (8 bytes, u64 little-endian)
  const totalFortunes = data.readBigUInt64LE(offset)
  offset += 8

  // Parse ipfsBaseHash (46 bytes)
  const ipfsBaseHash = data.slice(offset, offset + 46)
  offset += 46

  // Parse collectionMint (32 bytes)
  const collectionMint = new PublicKey(data.slice(offset, offset + 32))
  offset += 32

  // Parse isInitialized (1 byte, bool)
  const isInitialized = data[offset] === 1
  offset += 1

  // Parse reserved (5 bytes)
  const reserved = data.slice(offset, offset + 5)

  return {
    authority,
    treasury,
    totalFortunes,
    ipfsBaseHash,
    collectionMint,
    isInitialized,
    reserved,
  }
}

/**
 * Get IPFS base URI from Oracle
 */
export function getIpfsBaseUri(oracle: Oracle): string {
  // Convert Uint8Array to string (removing trailing zeros)
  const hash = Buffer.from(oracle.ipfsBaseHash)
    .toString('utf8')
    .replace(/\0/g, '')

  return `ipfs://${hash}`
}

/**
 * Check if Oracle is ready for minting
 */
export async function checkOracleStatus(connection: Connection): Promise<{
  ready: boolean
  error?: string
}> {
  try {
    const oracle = await getOracleData(connection)

    if (!oracle.isInitialized) {
      return {
        ready: false,
        error: 'Oracle not initialized',
      }
    }

    // Check if collection is set
    if (oracle.collectionMint.equals(PublicKey.default)) {
      return {
        ready: false,
        error: 'Collection not initialized',
      }
    }

    return { ready: true }
  } catch (error) {
    return {
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
