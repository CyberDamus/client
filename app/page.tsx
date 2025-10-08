"use client"

import { useAtom } from "jotai"
import { SparklesCore } from "@/components/ui/sparkles"
import { BgAnimateButton } from "@/components/ui/bg-animate-button"
import { MultiStepLoader } from "@/components/ui/multi-step-loader"
import {
  isWalletConnectedAtom,
  currentReadingAtom,
  isGeneratingAtom,
  MOCK_CARDS,
  generateMockInterpretation
} from "@/lib/store"

const loadingSteps = [
  { text: "Connecting to the Oracle..." },
  { text: "Shuffling the cosmic deck..." },
  { text: "Drawing your cards from the ether..." },
  { text: "Interpreting the blockchain of fate..." },
  { text: "Minting your fortune NFT..." },
  { text: "Reading complete!" },
]

export default function HomePage() {
  // TODO: remove after real wallet + blockchain implementation
  const [isWalletConnected] = useAtom(isWalletConnectedAtom)
  const [currentReading, setCurrentReading] = useAtom(currentReadingAtom)
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom)

  // TODO: remove after real blockchain implementation - replace with actual NFT minting
  const handleDrawCards = async () => {
    setIsGenerating(true)

    // Simulate blockchain transaction delay
    await new Promise(resolve => setTimeout(resolve, 6000))

    // Generate 3 random cards
    const shuffled = [...MOCK_CARDS].sort(() => Math.random() - 0.5)
    const selectedCards = shuffled.slice(0, 3)

    setCurrentReading({
      cards: selectedCards,
      timestamp: Date.now(),
      interpretation: generateMockInterpretation(selectedCards)
    })

    setIsGenerating(false)
  }

  const hasReading = !!currentReading

  return (
    <div className="relative h-screen w-full overflow-hidden bg-cyber-bg">
      {/* Simple gradient background - NO BLOB! */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-bg via-purple-950/20 to-cyber-bg" />

      {/* Sparkles - only stars, no blob */}
      <SparklesCore
        id="tsparticles-home"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={100}
        className="absolute inset-0 z-0"
        particleColor="#8b5cf6"
      />

      {/* TODO: remove after real implementation - Loader during generation */}
      <MultiStepLoader
        loadingStates={loadingSteps}
        loading={isGenerating}
        duration={1000}
      />

      {/* Content - Full viewport, centered */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">

        {/* STATE 1: Wallet not connected */}
        {!isWalletConnected && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4">🔮</div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-accent">
              Consult the Oracle
            </h1>
            <p className="text-slate-400 text-lg">
              Connect your wallet to begin
            </p>
            <BgAnimateButton
              disabled
              className="opacity-50 cursor-not-allowed text-xl py-6 px-12 rounded-xl font-orbitron"
            >
              Connect Wallet First
            </BgAnimateButton>
          </div>
        )}

        {/* STATE 2: Wallet connected, no reading yet */}
        {isWalletConnected && !hasReading && (
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4 animate-float">🔮</div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-accent">
              Draw Your Fortune
            </h1>
            <p className="text-slate-400 text-lg">
              3 cards • 0.01 SOL
            </p>
            <BgAnimateButton
              onClick={handleDrawCards}
              className="text-xl py-8 px-16 rounded-xl font-orbitron glow-border"
            >
              🔮 Draw 3 Cards
            </BgAnimateButton>
          </div>
        )}

        {/* STATE 3: After reading */}
        {isWalletConnected && hasReading && currentReading && (
          <div className="w-full max-w-6xl mx-auto">
            <div className="text-center text-slate-400 text-lg mb-8">
              Your Fortune
            </div>

            {/* TODO: remove mock cards after real NFT implementation */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              {currentReading.cards.map((card, idx) => (
                <div key={idx} className="flex-1 space-y-4">
                  {/* Card Image Placeholder */}
                  <div className="aspect-[2/3] bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg flex flex-col items-center justify-center p-6">
                    <span className="text-6xl font-mono text-cyber-primary mb-4">
                      {String(card.id).padStart(2, '0')}
                    </span>
                    <h3 className="text-xl font-bold text-center mb-2">{card.name}</h3>
                  </div>

                  {/* Card Info */}
                  <div className="text-center">
                    <p className="text-xs text-cyber-cyan uppercase tracking-wider mb-2">
                      {['Past', 'Present', 'Future'][idx]}
                    </p>
                    <p className="text-sm text-slate-400">{card.meaning}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* TODO: remove after real AI/Oracle implementation - Oracle's Interpretation */}
            <div className="max-w-3xl mx-auto mb-20 px-4">
              <div className="bg-cyber-surface/50 backdrop-blur border border-cyber-primary/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🔮</span>
                  <h3 className="text-xl font-bold text-cyber-primary">Oracle's Interpretation</h3>
                </div>
                <p className="text-slate-300 leading-relaxed italic">
                  {currentReading.interpretation}
                </p>
              </div>
            </div>

            {/* Draw Again Button */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
              <BgAnimateButton
                onClick={handleDrawCards}
                className="text-lg py-6 px-10 rounded-xl font-orbitron"
              >
                🔄 Draw Again
              </BgAnimateButton>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
