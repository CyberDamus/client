import { Connection, PublicKey } from '@solana/web3.js'
import { getTokenMetadata } from '@solana/spl-token'
import { TOKEN_2022_PROGRAM_ID } from './constants'

export interface ParsedCard {
  id: number
  inverted: boolean
}

/**
 * Parse Tarot cards from Token-2022 metadata
 *
 * Token name format: "CyberDamus #AAoAAoAAo"
 * Where:
 * - AA = card ID (00-77) in decimal
 * - o = orientation (i=inverted, !=upright)
 *
 * Example: "CyberDamus #19i20!07i" =
 *   [card 19 inverted, card 20 upright, card 7 inverted]
 */
export async function parseCardsFromToken(
  connection: Connection,
  mintAddress: PublicKey
): Promise<ParsedCard[]> {
  try {
    // 1. Fetch Token-2022 metadata using proper API
    const metadata = await getTokenMetadata(
      connection,
      mintAddress,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    )

    if (!metadata) {
      throw new Error('Token metadata not found. This token may not have metadata extension.')
    }

    // 2. Parse token name: "CyberDamus #19i20!07i"
    const nameMatch = metadata.name.match(/#(\d{2}[i!])(\d{2}[i!])(\d{2}[i!])/)

    if (!nameMatch) {
      throw new Error(`Invalid token name format: ${metadata.name}`)
    }

    // 3. Parse each card (3 cards total)
    const cards: ParsedCard[] = [
      parseCardString(nameMatch[1]),  // Past
      parseCardString(nameMatch[2]),  // Present
      parseCardString(nameMatch[3]),  // Future
    ]

    console.log('Parsed cards from token:', cards)
    return cards

  } catch (error) {
    console.error('Failed to parse cards from token:', error)
    throw new Error(
      `Failed to read token metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Parse a single card string like "19i" or "20!"
 * @param str - Format: "AAo" where AA=id (00-77), o=orientation (i or !)
 */
function parseCardString(str: string): ParsedCard {
  if (str.length !== 3) {
    throw new Error(`Invalid card string: ${str}`)
  }

  const id = parseInt(str.slice(0, 2), 10)
  const orientationChar = str[2]

  if (isNaN(id) || id > 77) {
    throw new Error(`Invalid card ID: ${str.slice(0, 2)}`)
  }

  if (orientationChar !== 'i' && orientationChar !== '!') {
    throw new Error(`Invalid orientation: ${orientationChar}`)
  }

  return {
    id,
    inverted: orientationChar === 'i'
  }
}
