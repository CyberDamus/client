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
 * Serialize MintFortuneToken instruction
 * No arguments needed - just the discriminator byte
 */
export function serializeMintFortuneTokenInstruction(): Buffer {
  // MintFortuneToken is enum variant 1
  // In Borsh, enum is serialized as u8 discriminator + variant data
  // MintFortuneToken has no data, so just [1]
  return Buffer.from([CyberdamusInstruction.MintFortuneToken])
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
