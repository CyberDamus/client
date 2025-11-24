import { atom } from 'jotai'

// TODO: remove after real blockchain implementation
export interface FortuneReading {
  cards: Array<{
    id: number
    name: string
    meaning: string
    inverted?: boolean  // Card orientation (inverted/upright)
  }>
  timestamp: number
  interpretation: string
  signature?: string  // Transaction signature for explorer link
  fortuneNumber?: number  // Fortune number from on-chain metadata
}

export const currentReadingAtom = atom<FortuneReading | null>(null)

// TODO: remove after real implementation
export const isGeneratingAtom = atom(false)

// TODO: remove mock data after real implementation
export const MOCK_CARDS = [
  { id: 0, name: "The Fool", meaning: "New beginnings and innocence" },
  { id: 1, name: "The Magician", meaning: "Manifestation and power" },
  { id: 2, name: "The High Priestess", meaning: "Intuition and mystery" },
  { id: 3, name: "The Empress", meaning: "Abundance and nurturing" },
  { id: 4, name: "The Emperor", meaning: "Authority and structure" },
  { id: 5, name: "The Hierophant", meaning: "Tradition and wisdom" },
  { id: 6, name: "The Lovers", meaning: "Love and choices" },
  { id: 7, name: "The Chariot", meaning: "Willpower and determination" },
  { id: 8, name: "Strength", meaning: "Courage and compassion" },
  { id: 9, name: "The Hermit", meaning: "Introspection and solitude" },
  { id: 10, name: "Wheel of Fortune", meaning: "Cycles and destiny" },
  { id: 11, name: "Justice", meaning: "Fairness and truth" },
  { id: 12, name: "The Hanged Man", meaning: "Surrender and letting go" },
  { id: 13, name: "Death", meaning: "Transformation and endings" },
  { id: 14, name: "Temperance", meaning: "Balance and moderation" },
  { id: 15, name: "The Devil", meaning: "Bondage and materialism" },
  { id: 16, name: "The Tower", meaning: "Upheaval and revelation" },
  { id: 17, name: "The Star", meaning: "Hope and inspiration" },
  { id: 18, name: "The Moon", meaning: "Illusion and intuition" },
  { id: 19, name: "The Sun", meaning: "Joy and success" },
  { id: 20, name: "Judgement", meaning: "Rebirth and reflection" },
  { id: 21, name: "The World", meaning: "Completion and achievement" },

  // Wands (22-35)
  { id: 22, name: "Ace of Wands", meaning: "Inspiration and new opportunities" },
  { id: 23, name: "Two of Wands", meaning: "Planning and future vision" },
  { id: 24, name: "Three of Wands", meaning: "Expansion and foresight" },
  { id: 25, name: "Four of Wands", meaning: "Celebration and harmony" },
  { id: 26, name: "Five of Wands", meaning: "Competition and conflict" },
  { id: 27, name: "Six of Wands", meaning: "Victory and recognition" },
  { id: 28, name: "Seven of Wands", meaning: "Defense and perseverance" },
  { id: 29, name: "Eight of Wands", meaning: "Swift action and movement" },
  { id: 30, name: "Nine of Wands", meaning: "Resilience and courage" },
  { id: 31, name: "Ten of Wands", meaning: "Burden and responsibility" },
  { id: 32, name: "Page of Wands", meaning: "Enthusiasm and exploration" },
  { id: 33, name: "Knight of Wands", meaning: "Energy and adventure" },
  { id: 34, name: "Queen of Wands", meaning: "Confidence and determination" },
  { id: 35, name: "King of Wands", meaning: "Leadership and vision" },

  // Cups (36-49)
  { id: 36, name: "Ace of Cups", meaning: "Love and emotional fulfillment" },
  { id: 37, name: "Two of Cups", meaning: "Partnership and unity" },
  { id: 38, name: "Three of Cups", meaning: "Friendship and celebration" },
  { id: 39, name: "Four of Cups", meaning: "Contemplation and apathy" },
  { id: 40, name: "Five of Cups", meaning: "Loss and disappointment" },
  { id: 41, name: "Six of Cups", meaning: "Nostalgia and memories" },
  { id: 42, name: "Seven of Cups", meaning: "Choices and illusions" },
  { id: 43, name: "Eight of Cups", meaning: "Withdrawal and transition" },
  { id: 44, name: "Nine of Cups", meaning: "Satisfaction and wishes" },
  { id: 45, name: "Ten of Cups", meaning: "Harmony and happiness" },
  { id: 46, name: "Page of Cups", meaning: "Creativity and intuition" },
  { id: 47, name: "Knight of Cups", meaning: "Romance and charm" },
  { id: 48, name: "Queen of Cups", meaning: "Compassion and emotional depth" },
  { id: 49, name: "King of Cups", meaning: "Emotional balance and wisdom" },

  // Swords (50-63)
  { id: 50, name: "Ace of Swords", meaning: "Clarity and breakthrough" },
  { id: 51, name: "Two of Swords", meaning: "Indecision and stalemate" },
  { id: 52, name: "Three of Swords", meaning: "Heartbreak and sorrow" },
  { id: 53, name: "Four of Swords", meaning: "Rest and recovery" },
  { id: 54, name: "Five of Swords", meaning: "Conflict and defeat" },
  { id: 55, name: "Six of Swords", meaning: "Transition and moving on" },
  { id: 56, name: "Seven of Swords", meaning: "Deception and strategy" },
  { id: 57, name: "Eight of Swords", meaning: "Restriction and limitation" },
  { id: 58, name: "Nine of Swords", meaning: "Anxiety and worry" },
  { id: 59, name: "Ten of Swords", meaning: "Painful endings and betrayal" },
  { id: 60, name: "Page of Swords", meaning: "Curiosity and mental energy" },
  { id: 61, name: "Knight of Swords", meaning: "Action and ambition" },
  { id: 62, name: "Queen of Swords", meaning: "Independence and perception" },
  { id: 63, name: "King of Swords", meaning: "Intellectual power and truth" },

  // Pentacles (64-77)
  { id: 64, name: "Ace of Pentacles", meaning: "New financial opportunity" },
  { id: 65, name: "Two of Pentacles", meaning: "Balance and adaptability" },
  { id: 66, name: "Three of Pentacles", meaning: "Teamwork and collaboration" },
  { id: 67, name: "Four of Pentacles", meaning: "Control and conservation" },
  { id: 68, name: "Five of Pentacles", meaning: "Financial loss and hardship" },
  { id: 69, name: "Six of Pentacles", meaning: "Generosity and charity" },
  { id: 70, name: "Seven of Pentacles", meaning: "Investment and patience" },
  { id: 71, name: "Eight of Pentacles", meaning: "Skill and craftsmanship" },
  { id: 72, name: "Nine of Pentacles", meaning: "Independence and luxury" },
  { id: 73, name: "Ten of Pentacles", meaning: "Wealth and legacy" },
  { id: 74, name: "Page of Pentacles", meaning: "Ambition and study" },
  { id: 75, name: "Knight of Pentacles", meaning: "Efficiency and responsibility" },
  { id: 76, name: "Queen of Pentacles", meaning: "Nurturing and practical" },
  { id: 77, name: "King of Pentacles", meaning: "Abundance and security" },
]

// Fallback interpretation (simple card listing, no AI interpretation)
// Used when Ollama API is unavailable or times out
export function generateMockInterpretation(cards: Array<{
  id: number
  name: string
  meaning: string
  inverted?: boolean
}>): string {
  const positions = ['Past', 'Present', 'Future']

  const cardDescriptions = cards.map((card, index) => {
    const orientation = card.inverted ? 'inverted' : 'upright'
    const position = positions[index] || `Card ${index + 1}`
    return `${position}: ${card.name} (${orientation})`
  }).join('\n')

  return `Your cards have been drawn:\n\n${cardDescriptions}\n\nThe AI Oracle is currently unavailable. Please try refreshing the page to receive your full interpretation.`
}
