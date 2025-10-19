import { PublicKey } from '@solana/web3.js'
import { getMintLen, ExtensionType } from '@solana/spl-token'

// CyberDamus Program ID (devnet)
export const PROGRAM_ID = new PublicKey('2zmR8N51Q7KYZqnzJJWaJkM3wbxwBqj2gimNPf8Ldqu7')

// Oracle PDA seed (version 4 with collection support)
export const ORACLE_SEED = 'oracle-v4'

// Fee amount (0.01 SOL = 10,000,000 lamports)
export const MINT_FEE_LAMPORTS = 10_000_000

// Token-2022 Program ID
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')

// Associated Token Program ID
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')

// System Program ID
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111')

// Rent Sysvar ID
export const RENT_SYSVAR_ID = new PublicKey('SysvarRent111111111111111111111111111111111')

// SlotHashes Sysvar ID (used for entropy in card generation)
export const SLOT_HASHES_SYSVAR_ID = new PublicKey('SysvarS1otHashes111111111111111111111111111')

// Memo Program ID (official Solana program for adding text notes to transactions)
// Used to make each transaction unique even with identical blockhash
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

/**
 * Calculate exact size for Token-2022 Mint with extensions
 * Includes MetadataPointer and GroupPointer extensions
 */
export function getMintAccountSize(): number {
  return getMintLen([
    ExtensionType.MetadataPointer,
    ExtensionType.GroupPointer,
  ])
}

/**
 * Estimated metadata extension space for rent calculation
 * Conservative estimate to ensure enough lamports for CPI reallocation
 */
export const METADATA_EXTENSION_SPACE = 1000

// Derive Oracle PDA
export function getOraclePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ORACLE_SEED)],
    PROGRAM_ID
  )
}
