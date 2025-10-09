import { atom } from 'jotai'

// TODO: remove after real blockchain implementation
export interface FortuneReading {
  cards: Array<{
    id: number
    name: string
    meaning: string
  }>
  timestamp: number
  interpretation: string
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
]

// TODO: remove after real AI/Oracle implementation
export const MOCK_INTERPRETATIONS = [
  "The cosmic energies reveal a journey of transformation ahead. Your past experiences have prepared you for the challenges you now face. Trust in the process and embrace the changes coming your way.",
  "The blockchain of fate shows convergence of powerful forces in your life. What seems like conflict is actually the universe aligning opportunities. Stay vigilant and act decisively when the moment arrives.",
  "Ancient wisdom flows through the digital ether to guide you. The cards speak of balance between material and spiritual realms. Your intuition will be your greatest asset in the days to come.",
  "The oracle sees a pattern of renewal emerging from chaos. Past struggles have forged your strength, and now the universe opens doors you thought were closed. Patience will be rewarded.",
  "Cybernetic prophecy indicates a shift in consciousness approaching. The energies surrounding you are volatile but full of potential. Embrace uncertainty as the catalyst for growth.",
  "The tarot's encryption reveals hidden opportunities masked as obstacles. Your present situation is a test of will and wisdom. Those who understand the deeper meaning will find their path illuminated.",
  "Quantum entanglement of past, present, and future converges in this reading. The universe is preparing you for a significant breakthrough. Stay open to unexpected connections and synchronicities.",
  "The digital spirits whisper of transformation through surrender. What you release now creates space for abundance. Trust that the cosmos has a greater plan unfolding.",
]

// TODO: remove after real implementation
export function generateMockInterpretation(cards: typeof MOCK_CARDS): string {
  const randomIndex = Math.floor(Math.random() * MOCK_INTERPRETATIONS.length)
  return MOCK_INTERPRETATIONS[randomIndex]
}
