/**
 * Tarot Cards Helper
 *
 * Provides card names and metadata for the 78-card Tarot deck
 * Used for AI interpretation triggers and display
 */

export const TAROT_CARDS = [
  // Major Arcana (0-21)
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World",

  // Minor Arcana - Wands (22-35)
  "Ace of Wands",
  "Two of Wands",
  "Three of Wands",
  "Four of Wands",
  "Five of Wands",
  "Six of Wands",
  "Seven of Wands",
  "Eight of Wands",
  "Nine of Wands",
  "Ten of Wands",
  "Page of Wands",
  "Knight of Wands",
  "Queen of Wands",
  "King of Wands",

  // Minor Arcana - Cups (36-49)
  "Ace of Cups",
  "Two of Cups",
  "Three of Cups",
  "Four of Cups",
  "Five of Cups",
  "Six of Cups",
  "Seven of Cups",
  "Eight of Cups",
  "Nine of Cups",
  "Ten of Cups",
  "Page of Cups",
  "Knight of Cups",
  "Queen of Cups",
  "King of Cups",

  // Minor Arcana - Swords (50-63)
  "Ace of Swords",
  "Two of Swords",
  "Three of Swords",
  "Four of Swords",
  "Five of Swords",
  "Six of Swords",
  "Seven of Swords",
  "Eight of Swords",
  "Nine of Swords",
  "Ten of Swords",
  "Page of Swords",
  "Knight of Swords",
  "Queen of Swords",
  "King of Swords",

  // Minor Arcana - Pentacles (64-77)
  "Ace of Pentacles",
  "Two of Pentacles",
  "Three of Pentacles",
  "Four of Pentacles",
  "Five of Pentacles",
  "Six of Pentacles",
  "Seven of Pentacles",
  "Eight of Pentacles",
  "Nine of Pentacles",
  "Ten of Pentacles",
  "Page of Pentacles",
  "Knight of Pentacles",
  "Queen of Pentacles",
  "King of Pentacles",
]

/**
 * Get card name by ID (0-77)
 */
export function getCardName(id: number): string {
  if (id < 0 || id >= TAROT_CARDS.length) {
    return `Unknown Card ${id}`
  }
  return TAROT_CARDS[id]
}

/**
 * Get card type (Major/Minor Arcana and suit)
 */
export function getCardType(id: number): {
  type: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
} {
  if (id <= 21) {
    return { type: 'major' }
  }

  if (id <= 35) return { type: 'minor', suit: 'wands' }
  if (id <= 49) return { type: 'minor', suit: 'cups' }
  if (id <= 63) return { type: 'minor', suit: 'swords' }
  return { type: 'minor', suit: 'pentacles' }
}

/**
 * Format card for AI interpretation
 */
export function formatCardForAI(card: {
  id: number
  inverted: boolean
}): {
  id: number
  name: string
  inverted: boolean
} {
  return {
    id: card.id,
    name: getCardName(card.id),
    inverted: card.inverted,
  }
}
