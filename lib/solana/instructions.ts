import { serialize } from 'borsh'

/**
 * CyberDamus Instructions (Vanilla Solana + Borsh)
 *
 * Enum values:
 * 0 = InitializeOracle (admin only)
 * 1 = MintFortuneToken (main user function)
 * 2 = InitializeCollection (admin only)
 */

// Instruction discriminators
export enum CyberdamusInstruction {
  InitializeOracle = 0,
  MintFortuneToken = 1,
  InitializeCollection = 2,
}

/**
 * Serialize MintFortuneToken instruction with optional user query
 *
 * @param userQuery - Optional personalization query (max 256 UTF-8 characters)
 * @returns Borsh-serialized instruction data
 *
 * Format:
 * - [discriminator, 0] if userQuery is undefined (None)
 * - [discriminator, 1, length_u32_LE, ...utf8_bytes] if userQuery is provided (Some)
 */
export function serializeMintFortuneTokenInstruction(userQuery?: string): Buffer {
  // Validate user query length (max 256 characters as per contract)
  if (userQuery !== undefined && userQuery.length > 256) {
    throw new Error('User query must be 256 characters or less')
  }

  // Start with discriminator
  const discriminator = CyberdamusInstruction.MintFortuneToken

  // Case 1: None (no user query)
  if (userQuery === undefined || userQuery === null || userQuery === '') {
    return Buffer.from([discriminator, 0x00])
  }

  // Case 2: Some (with user query)
  const queryBytes = Buffer.from(userQuery, 'utf-8')
  const queryLength = queryBytes.length

  // Allocate buffer: discriminator (1) + Some flag (1) + length (4) + data
  const buffer = Buffer.alloc(1 + 1 + 4 + queryLength)
  let offset = 0

  // Write discriminator
  buffer[offset] = discriminator
  offset += 1

  // Write Some flag (0x01)
  buffer[offset] = 0x01
  offset += 1

  // Write string length (u32 LE)
  buffer.writeUInt32LE(queryLength, offset)
  offset += 4

  // Write UTF-8 bytes
  queryBytes.copy(buffer, offset)

  return buffer
}

/**
 * Serialize InitializeOracle instruction (for reference)
 * Not used in client, but shown for completeness
 */
export function serializeInitializeOracleInstruction(ipfsBaseHash: Uint8Array): Buffer {
  if (ipfsBaseHash.length !== 46) {
    throw new Error('IPFS hash must be exactly 46 bytes')
  }

  // Enum discriminator (0) + ipfs_base_hash[46]
  const buffer = Buffer.alloc(1 + 46)
  buffer[0] = CyberdamusInstruction.InitializeOracle
  buffer.set(ipfsBaseHash, 1)
  return buffer
}

/**
 * Serialize InitializeCollection instruction (for reference)
 * Not used in client
 */
export function serializeInitializeCollectionInstruction(
  name: string,
  symbol: string,
  uri: string
): Buffer {
  // For simplicity, using manual serialization
  // Real Borsh would be: { enum: 2, name: String, symbol: String, uri: String }
  const nameBuffer = Buffer.from(name, 'utf8')
  const symbolBuffer = Buffer.from(symbol, 'utf8')
  const uriBuffer = Buffer.from(uri, 'utf8')

  const buffer = Buffer.alloc(
    1 + // discriminator
    4 + nameBuffer.length + // u32 length + string data
    4 + symbolBuffer.length +
    4 + uriBuffer.length
  )

  let offset = 0
  buffer[offset] = CyberdamusInstruction.InitializeCollection
  offset += 1

  // name
  buffer.writeUInt32LE(nameBuffer.length, offset)
  offset += 4
  nameBuffer.copy(buffer, offset)
  offset += nameBuffer.length

  // symbol
  buffer.writeUInt32LE(symbolBuffer.length, offset)
  offset += 4
  symbolBuffer.copy(buffer, offset)
  offset += symbolBuffer.length

  // uri
  buffer.writeUInt32LE(uriBuffer.length, offset)
  offset += 4
  uriBuffer.copy(buffer, offset)

  return buffer
}
