"use client"

import AnimatedBackground from "@/components/client/AnimatedBackground"
import { BgAnimateButton } from "@/components/ui/bg-animate-button"
import { MultiStepLoader } from "@/components/ui/multi-step-loader"
import {
  calculateMintCost,
  checkOracleStatus,
  checkUserBalance,
  getAdditionalMetadataField,
  mintFortuneTokenWithRetry,
  parseCardsFromToken,
  parseMintError,
  TOKEN_2022_PROGRAM_ID
} from "@/lib/solana"
import {
  currentReadingAtom,
  generateMockInterpretation,
  isGeneratingAtom,
  MOCK_CARDS
} from "@/lib/store"
import { getTokenMetadata } from "@solana/spl-token"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useAtom } from "jotai"
import Image from "next/image"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

const loadingSteps = [
  { text: "🔮 Preparing your reading..." },
  { text: "🌌 Connecting to the Oracle..." },
  { text: "⚖️ Validating cosmic balance..." },
  { text: "✨ Minting fortune token..." },
  { text: "📖 Reading blockchain prophecy..." },
  { text: "💾 Saving to cosmic records..." },
  { text: "✅ Revelation complete!" },
]

// Pixel grid configuration for card animation (same as test page)
const PIXEL_COLS = 20
const PIXEL_ROWS = 30
const PIXEL_SIZE = 14
const TOTAL_PIXELS = PIXEL_COLS * PIXEL_ROWS

export default function HomePage() {
  const { connected: isWalletConnected, publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [currentReading, setCurrentReading] = useAtom(currentReadingAtom)
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom)
  const [mintCost, setMintCost] = useState<{ serviceFee: number; networkFee: number; total: number } | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})
  const [userQuery, setUserQuery] = useState<string>('')

  // Controlled loading state for real-time progress
  const [loadingState, setLoadingState] = useState({
    currentStep: 0,
    totalSteps: loadingSteps.length,
  })

  // Animation states for pixel dissolve effect
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set())
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set())
  const [showPixelAnimation, setShowPixelAnimation] = useState(false)

  // AI interpretation loading state
  const [isLoadingInterpretation, setIsLoadingInterpretation] = useState(false)

  // Ref for debouncing - prevents rapid successive calls
  const lastCallTimeRef = useRef<number>(0)

  // Generate random mock images for each card (0-3.PNG)
  const mockImages = useMemo(() => {
    return [
      Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 4),
      Math.floor(Math.random() * 4),
    ]
  }, [currentReading?.timestamp])

  // Generate pixel data with random delays for dissolve animation
  const pixelData = useMemo(() => {
    return Array.from({ length: TOTAL_PIXELS }, (_, index) => {
      const row = Math.floor(index / PIXEL_COLS)
      const col = index % PIXEL_COLS

      // Base delay for row (top rows fall first)
      const rowDelay = row * 30 // 30ms per row

      // Random delay within row for variation
      const randomDelay = Math.random() * 200

      // Total delay for this pixel
      const totalDelay = rowDelay + randomDelay

      return {
        id: index,
        row,
        col,
        delay: totalDelay,
      }
    })
  }, [])

  // Calculate mint cost when connection is available
  useEffect(() => {
    if (connection) {
      calculateMintCost(connection)
        .then(setMintCost)
        .catch(err => console.error('Failed to calculate mint cost:', err))
    }
  }, [connection])

  // Start pixel animation when reading is complete
  useEffect(() => {
    if (currentReading && !showPixelAnimation) {
      setShowPixelAnimation(true)
      setRevealedCards(new Set())
      setAnimatingCards(new Set())

      // Animate and reveal cards one by one
      currentReading.cards.forEach((_, index) => {
        setTimeout(() => {
          // Start animating this card
          setAnimatingCards(prev => new Set([...prev, index]))

          // After animation completes, mark card as revealed
          setTimeout(() => {
            setRevealedCards(prev => new Set([...prev, index]))
          }, 1200) // Wait for pixel fall animation to complete

        }, index * 1500) // 1.5 seconds between each card
      })
    }
  }, [currentReading, showPixelAnimation])

  // Reconnect protection: check for pending fortunes on mount/wallet change
  useEffect(() => {
    if (!publicKey) return

    const checkPendingFortune = async () => {
      try {
        const response = await fetch(`/api/fortune/pending?wallet=${publicKey.toBase58()}`)
        const data = await response.json()

        if (data.success && data.fortune) {
          const fortune = data.fortune
          console.log(`[Reconnect] Found pending fortune ${fortune.id}, status: ${fortune.aiStatus}`)

          // Show notification about pending fortune
          toast.info(
            'Resuming pending fortune...',
            {
              description: `Your previous reading is ${fortune.aiStatus}. Please wait.`,
              duration: 5000
            }
          )

          // Note: We don't auto-resume polling here because we don't have the cards data
          // User needs to wait for the polling to complete from the original session
          // or refresh and check history page
        }
      } catch (error) {
        console.error('[Reconnect] Failed to check pending fortune:', error)
      }
    }

    checkPendingFortune()
  }, [publicKey])

  // Open wallet connection modal
  const handleConnectWallet = () => {
    setVisible(true)
  }

  // Build cyberpunk prefix for interpretation with card orientations
  const buildInterpretationPrefix = (
    cards: Array<{ id: number; name: string; meaning: string; inverted?: boolean }>,
    userQuery: string
  ): string => {
    const positions = ['PAST', 'PRESENT', 'FUTURE']

    const cardLines = cards.map((card, index) => {
      const orientation = card.inverted ? 'INVERTED' : 'UPRIGHT'
      const position = positions[index]
      return `  ${position}: ${card.name} (${orientation})`
    }).join('\n')

    let prefix = `█▓▒░ TRANSMISSION RECEIVED ░▒▓█\n\nCards drawn from the digital deck:\n${cardLines}`

    if (userQuery.trim()) {
      prefix += `\n\nQuery intercepted: "${userQuery.trim()}"`
    }

    prefix += `\n\n█▓▒░ DECRYPTING DATA ░▒▓█`

    return prefix
  }

  // Poll for AI interpretation (triggered automatically by /api/fortune/update)
  const pollForAIInterpretation = async (
    draftId: number,
    cards: Array<{ id: number; name: string; meaning: string; inverted?: boolean }>,
    userQuery: string
  ) => {
    setIsLoadingInterpretation(true)

    try {
      console.log(`[AI] Polling for interpretation (draft ${draftId})...`)

      // Poll DB for results (5 second interval, 2 minute timeout)
      const pollStartTime = Date.now()
      const POLL_INTERVAL = 2000 // 2s
      const POLL_TIMEOUT = 120000 // 2 minutes

      while (Date.now() - pollStartTime < POLL_TIMEOUT) {
        // Wait before polling
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))

        // Check DB for results (by ID)
        const fortuneResponse = await fetch(`/api/fortune/by-id/${draftId}`)
        const fortuneData = await fortuneResponse.json()

        if (!fortuneData.success) {
          console.warn('[AI Poll] Failed to fetch fortune:', fortuneData.error)
          continue
        }

        const fortune = fortuneData.fortune

        // Check status
        if (fortune.aiStatus === 'completed' && fortune.interpretation) {
          // Success! Build prefix and show interpretation
          console.log(`[AI Poll] ✅ Completed! Received ${fortune.interpretation.length} chars`)
          const prefix = buildInterpretationPrefix(cards, userQuery)

          setCurrentReading(prev => prev ? {
            ...prev,
            interpretation: `${prefix}\n\n${fortune.interpretation}`
          } : null)

          setIsLoadingInterpretation(false)
          return
        }

        if (fortune.aiStatus === 'failed') {
          // AI failed, use fallback
          console.warn(`[AI Poll] AI failed:`, fortune.aiError)
          throw new Error(fortune.aiError || 'AI generation failed')
        }

        // Still processing, continue polling
        console.log(`[AI Poll] Status: ${fortune.aiStatus}, waiting...`)
      }

      // Timeout reached
      console.error('[AI Poll] Timeout after 2 minutes')
      throw new Error('AI generation timed out')

    } catch (error: any) {
      // Error or timeout - use fallback
      console.error('[AI] Error, using fallback:', error.message)
      const prefix = buildInterpretationPrefix(cards, userQuery)
      setCurrentReading(prev => prev ? {
        ...prev,
        interpretation: `${prefix}\n\n${generateMockInterpretation(cards)}`
      } : null)
    } finally {
      setIsLoadingInterpretation(false)
    }
  }

  // Real blockchain implementation with controlled loading and DB integration
  const handleDrawCards = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet first')
      return
    }

    // Debouncing: prevent calls within 2 seconds of each other
    const now = Date.now()
    const timeSinceLastCall = now - lastCallTimeRef.current
    if (timeSinceLastCall < 2000) {
      toast.info('Please wait a moment before drawing again')
      return
    }
    lastCallTimeRef.current = now

    setIsGenerating(true)
    setLoadingState({ currentStep: 0, totalSteps: loadingSteps.length })

    let draftId: number | null = null

    try {
      // Step 0: Create draft in database
      setLoadingState(prev => ({ ...prev, currentStep: 0 }))
      const draftResponse = await fetch('/api/fortune/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          userQuery: userQuery.trim() || null,
        }),
      })

      if (!draftResponse.ok) {
        throw new Error('Failed to create fortune draft')
      }

      const draftData = await draftResponse.json()
      draftId = (draftData.draftId as number) || 0

      // Step 1: Check Oracle status
      setLoadingState(prev => ({ ...prev, currentStep: 1 }))
      const oracleStatus = await checkOracleStatus(connection)
      if (!oracleStatus.ready) {
        throw new Error(`Oracle not ready: ${oracleStatus.error}`)
      }

      // Step 2: Check user balance
      setLoadingState(prev => ({ ...prev, currentStep: 2 }))
      const balanceCheck = await checkUserBalance(connection, publicKey)
      if (!balanceCheck.sufficient) {
        throw new Error(
          `Insufficient funds. You have ${balanceCheck.balance.toFixed(4)} SOL, need ${balanceCheck.required.toFixed(4)} SOL`
        )
      }

      // Step 3: Mint fortune token
      setLoadingState(prev => ({ ...prev, currentStep: 3 }))
      const queryToSend = userQuery.trim() || undefined
      const result = await mintFortuneTokenWithRetry(
        connection,
        publicKey,
        signTransaction,
        queryToSend,
        1 // maxRetries - MUST be 1!
      )

      // Step 4: Parse cards from token metadata
      setLoadingState(prev => ({ ...prev, currentStep: 4 }))
      const parsedCards = await parseCardsFromToken(connection, result.mint)

      // Map parsed cards to full card data with inverted flag
      const selectedCards = parsedCards.map(({ id, inverted }) => ({
        ...MOCK_CARDS[id],
        inverted
      }))

      // Get fortune number from token metadata
      const metadata = await getTokenMetadata(
        connection,
        result.mint,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      )

      const fortuneNumberStr = getAdditionalMetadataField(metadata, 'fortune_number')
      const fortuneNumber = fortuneNumberStr ? parseInt(fortuneNumberStr, 10) : result.fortuneNumber

      // Step 5: Update draft in database
      setLoadingState(prev => ({ ...prev, currentStep: 5 }))
      const updateResponse = await fetch('/api/fortune/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          mintAddress: result.mint.toBase58(),
          fortuneNumber,
          cards: parsedCards,
          signature: result.signature,
          status: 'pending_interpretation',
        }),
      })

      if (!updateResponse.ok) {
        console.error('Failed to update fortune draft (but mint succeeded)')
      }

      // Step 6: Complete
      setLoadingState(prev => ({ ...prev, currentStep: 6 }))

      toast.success(
        `Fortune #${fortuneNumber} revealed!`,
        {
          description: `Transaction: ${result.signature.slice(0, 8)}...`,
          action: {
            label: 'View on Explorer',
            onClick: () => {
              window.open(`https://solana.fm/tx/${result.signature}?cluster=devnet-solana`, '_blank')
            }
          }
        }
      )

      // Show cards immediately with empty interpretation
      setCurrentReading({
        cards: selectedCards,
        timestamp: Date.now(),
        interpretation: '', // Will be populated by AI or fallback
        signature: result.signature,
        fortuneNumber: fortuneNumber
      })

      // Poll for AI interpretation (triggered automatically by /api/fortune/update)
      pollForAIInterpretation(draftId, selectedCards, userQuery)

    } catch (error) {
      console.error('Fortune creation error:', error)
      const parsedError = parseMintError(error)

      // Update draft as failed if we have draftId
      if (draftId) {
        try {
          await fetch('/api/fortune/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              draftId,
              status: 'failed',
              errorMessage: parsedError.message,
            }),
          })
        } catch (updateError) {
          console.error('Failed to update draft status:', updateError)
        }
      }

      // User-friendly error messages
      if (parsedError.code === 'ALREADY_PROCESSED' || parsedError.code === 'SIMULATION_FAILED') {
        toast.warning('⚡ The cosmic connection flickered', {
          description: 'Your funds are safe. Give it another try!',
        })
      } else {
        toast.error('Failed to create fortune', {
          description: parsedError.message,
        })
      }

      if (parsedError.logs) {
        console.error('Transaction logs:', parsedError.logs)
      }
    } finally {
      setIsGenerating(false)
      setLoadingState({ currentStep: 0, totalSteps: loadingSteps.length })
    }
  }

  const hasReading = !!currentReading

  return (
    <div className="relative min-h-screen w-full bg-cyber-bg">
      {/* Memoized animated background - prevents re-renders on input */}
      <AnimatedBackground />

      {/* TODO: check if loader ok */}
      <MultiStepLoader
        loadingStates={loadingSteps}
        loading={isGenerating}
        duration={1000}
      />

      {/* Content */}
      <div className={`relative z-10 flex flex-col items-center px-4 ${!hasReading ? 'min-h-screen justify-center' : 'py-8'}`}>

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
              onClick={handleConnectWallet}
              className="text-xl py-6 px-12 rounded-xl font-orbitron"
            >
              Connect Wallet
            </BgAnimateButton>
          </div>
        )}

        {/* STATE 2: Wallet connected, no reading yet */}
        {isWalletConnected && !hasReading && (
          <div className="text-center space-y-6 w-full max-w-md">
            <div className="text-6xl mb-4 animate-float">🔮</div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-accent">
              Draw Your Fortune
            </h1>

            {/* User Query Input */}
            <div className="text-left space-y-2">
              <label htmlFor="userQuery" className="block text-sm text-slate-400 px-1">
                Ask the Oracle (optional)
              </label>
              <div className="relative">
                <textarea
                  id="userQuery"
                  value={userQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    // Enforce 256 character limit
                    if (value.length <= 256) {
                      setUserQuery(value)
                    }
                  }}
                  placeholder="What question weighs on your mind? The cosmos listens..."
                  maxLength={256}
                  rows={3}
                  className="w-full px-4 py-3 pr-10 bg-cyber-surface/50 border border-cyber-primary/30 rounded-lg text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-cyber-primary/60 focus:ring-2 focus:ring-cyber-primary/20 transition-all resize-none font-orbitron text-sm"
                />
                {/* Clear button - only shown when there's text */}
                {userQuery.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUserQuery('')}
                    className="absolute top-2 right-2 p-1.5 rounded-md text-slate-400 hover:text-cyber-accent hover:bg-cyber-primary/10 transition-colors"
                    aria-label="Clear text"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-slate-500">
                  Your question influences the card selection
                </span>
                <span className={`text-xs ${userQuery.length > 230 ? 'text-cyber-accent' : 'text-slate-500'}`}>
                  {userQuery.length}/256
                </span>
              </div>
            </div>

            <BgAnimateButton
              onClick={handleDrawCards}
              disabled={isGenerating}
              className="text-xl py-8 px-16 rounded-xl font-orbitron glow-border"
            >
              ⚡ Decrypt Your Fate
            </BgAnimateButton>

            {/* Cost breakdown below button */}
            {mintCost && (
              <div className="text-xs text-slate-400 opacity-70 mt-3 flex flex-col items-center">
                <div className="mb-1">💰 ~{mintCost.total.toFixed(3)} SOL per reading</div>
                <div className="text-[11px] space-y-0.5">
                  <div className="text-left">
                    <div>• Service fee: {mintCost.serviceFee.toFixed(2)} SOL</div>
                    <div>• Network fee: ~{mintCost.networkFee.toFixed(3)} SOL</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STATE 3: After reading */}
        {isWalletConnected && hasReading && currentReading && (
          <div className="w-full max-w-6xl mx-auto mt-1">
            <div className="text-center text-slate-400 text-lg mb-8 flex items-center justify-center gap-3">
              <span>
                Your Fortune
                {currentReading.fortuneNumber && ` - #${currentReading.fortuneNumber}`}
              </span>
              {currentReading.signature && (
                <a
                  href={`https://solana.fm/tx/${currentReading.signature}?cluster=devnet-solana`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyber-cyan hover:text-cyber-primary transition-colors flex items-center gap-1"
                >
                  <span>🔍</span>
                  <span>View on Explorer</span>
                </a>
              )}
            </div>

            {/* Cards with Pixel Dissolve Animation */}
            <div className="flex flex-col md:flex-row gap-6 mb-8 justify-center">
              {currentReading.cards.map((card, index) => (
                <div
                  key={index}
                  className="card-container relative mx-auto md:mx-0"
                  style={{
                    width: `${PIXEL_COLS * PIXEL_SIZE}px`,
                    height: `${PIXEL_ROWS * PIXEL_SIZE}px`,
                  }}
                >
                  {/* Card Face (always underneath) */}
                  <div className="absolute inset-0 rounded-xl overflow-hidden shadow-2xl">
                    <div className="w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur">
                      <div className="relative w-full h-full flex flex-col">
                        {/* Card Image Area */}
                        <div className="flex-1 relative p-3">
                          {!imageErrors[index] ? (
                            <>
                              <div className={`relative w-full h-full ${card.inverted ? 'rotate-180' : ''}`}>
                                <Image
                                  src={`/mock_imgs/${mockImages[index]}.PNG`}
                                  alt={card.name}
                                  fill
                                  className="object-contain"
                                  onError={() => {
                                    setImageErrors(prev => ({ ...prev, [index]: true }))
                                  }}
                                />
                              </div>
                              {card.inverted && (
                                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-cyber-accent uppercase tracking-wider bg-cyber-bg/80 px-2 py-0.5 rounded">
                                  Inverted
                                </span>
                              )}
                            </>
                          ) : (
                            /* Fallback to numbers if image fails */
                            <div className="flex flex-col items-center justify-center h-full">
                              <span className="text-5xl font-mono text-cyber-primary mb-2">
                                {String(card.id).padStart(2, '0')}
                              </span>
                              <h3 className="text-lg font-bold text-center mb-1">{card.name}</h3>
                              {card.inverted && (
                                <span className="text-[10px] text-cyber-accent uppercase tracking-wider mt-1">
                                  Inverted
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Info */}
                        <div className="p-3 bg-cyber-surface/50 backdrop-blur border-t border-cyber-primary/30">
                          <p className="text-[10px] text-cyber-cyan uppercase tracking-wider mb-1 text-center">
                            {["Past", "Present", "Future"][index]}
                          </p>
                          <h3 className="text-sm font-bold mb-0.5 text-center text-white">
                            {card.name}
                          </h3>
                          <p className="text-[11px] text-slate-400 text-center leading-tight">
                            {card.meaning}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pixel Grid Overlay (card back that dissolves) */}
                  {!revealedCards.has(index) && (
                    <div
                      className="pixel-grid absolute inset-0 rounded-xl overflow-hidden"
                      style={{
                        display: "grid",
                        gridTemplateColumns: `repeat(${PIXEL_COLS}, 1fr)`,
                        gridTemplateRows: `repeat(${PIXEL_ROWS}, 1fr)`,
                      }}
                    >
                      {pixelData.map((pixel) => (
                        <div
                          key={pixel.id}
                          className={`pixel ${animatingCards.has(index) ? "falling" : ""}`}
                          style={{
                            backgroundColor: "#8B4513",
                            border: "0.5px solid rgba(0,0,0,0.1)",
                            animationDelay: `${pixel.delay}ms`,
                            gridColumn: pixel.col + 1,
                            gridRow: pixel.row + 1,
                          }}
                        />
                      ))}

                      {/* Card back image overlay */}
                      <div
                        className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                        style={{
                          opacity: animatingCards.has(index) ? 0 : 1,
                          transition: "opacity 0.3s ease-out",
                        }}
                      >
                        <Image
                          src="/card-back.png"
                          alt="Card Back"
                          fill
                          className="object-cover"
                          sizes="280px"
                          priority
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Oracle's Interpretation (AI or Fallback) */}
            <div className="max-w-3xl mx-auto mb-20 px-4">
              <div className="bg-cyber-surface/50 backdrop-blur border border-cyber-primary/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🔮</span>
                  <h3 className="text-xl font-bold text-cyber-primary">Oracle&apos;s Interpretation</h3>
                  {isLoadingInterpretation && (
                    <span className="text-xs text-cyber-cyan animate-pulse">Consulting the AI Oracle...</span>
                  )}
                </div>

                {isLoadingInterpretation ? (
                  /* Loading skeleton */
                  <div className="space-y-3">
                    <div className="h-4 bg-cyber-primary/20 rounded animate-pulse w-full"></div>
                    <div className="h-4 bg-cyber-primary/20 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-cyber-primary/20 rounded animate-pulse w-4/6"></div>
                  </div>
                ) : currentReading.interpretation ? (
                  /* AI interpretation or fallback */
                  <p className="text-slate-300 leading-relaxed italic whitespace-pre-wrap">
                    {currentReading.interpretation}
                  </p>
                ) : (
                  /* Empty state (shouldn't happen, but just in case) */
                  <p className="text-slate-400 leading-relaxed italic">
                    Preparing your interpretation...
                  </p>
                )}
              </div>
            </div>

            {/* Draw Again Button - Returns to form (doesn't mint immediately) */}
            <div className="flex justify-center pb-12">
              <BgAnimateButton
                onClick={() => {
                  setCurrentReading(null)
                  setRevealedCards(new Set())
                  setAnimatingCards(new Set())
                  setShowPixelAnimation(false)
                }}
                disabled={isGenerating}
                className="text-xl py-8 px-16 rounded-xl font-orbitron glow-border"
              >
                ⚡ Decrypt Again
              </BgAnimateButton>
            </div>
          </div>
        )}

      </div>

      {/* Custom styles for pixel animation */}
      <style jsx global>{`
        @keyframes pixelFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          20% {
            transform: translateY(50px) rotate(90deg);
            opacity: 0.9;
          }
          40% {
            transform: translateY(150px) rotate(180deg);
            opacity: 0.7;
          }
          60% {
            transform: translateY(300px) rotate(270deg);
            opacity: 0.5;
          }
          80% {
            transform: translateY(450px) rotate(360deg);
            opacity: 0.3;
          }
          100% {
            transform: translateY(600px) rotate(450deg);
            opacity: 0;
          }
        }

        .pixel.falling {
          animation: pixelFall 1.2s cubic-bezier(0.4, 0.0, 0.8, 1) forwards;
          box-shadow: 0 0 4px rgba(139, 92, 246, 0.6);
        }

        .pixel {
          transition: all 0.1s ease;
          will-change: transform, opacity;
        }

        .pixel:hover {
          transform: scale(1.1);
          box-shadow: 0 0 8px rgba(236, 72, 153, 0.8);
        }

        /* Glow effect for falling pixels */
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 4px rgba(139, 92, 246, 0.6);
          }
          50% {
            box-shadow: 0 0 12px rgba(236, 72, 153, 0.8);
          }
        }

        .pixel.falling {
          animation: pixelFall 1.2s cubic-bezier(0.4, 0.0, 0.8, 1) forwards,
                     glow 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}
