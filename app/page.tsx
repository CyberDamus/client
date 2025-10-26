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
  { text: "Connecting to the Oracle..." },
  { text: "Shuffling the cosmic deck..." },
  { text: "Drawing your cards from the ether..." },
  { text: "Interpreting the blockchain of fate..." },
  { text: "Minting your fortune NFT..." },
  { text: "Reading complete!" },
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

  // Animation states for pixel dissolve effect
  const [revealedCards, setRevealedCards] = useState<Set<number>>(new Set())
  const [animatingCards, setAnimatingCards] = useState<Set<number>>(new Set())
  const [showPixelAnimation, setShowPixelAnimation] = useState(false)

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

  // Open wallet connection modal
  const handleConnectWallet = () => {
    setVisible(true)
  }

  // Real blockchain implementation with debouncing
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

    try {
      // 1. Check Oracle status
      toast.info('Checking Oracle status...')
      const oracleStatus = await checkOracleStatus(connection)
      if (!oracleStatus.ready) {
        toast.error(`Oracle not ready: ${oracleStatus.error}`)
        setIsGenerating(false)
        return
      }

      // 2. Check user balance
      toast.info('Checking balance...')
      const balanceCheck = await checkUserBalance(connection, publicKey)
      if (!balanceCheck.sufficient) {
        toast.error(
          `Insufficient funds. You have ${balanceCheck.balance.toFixed(4)} SOL, need ${balanceCheck.required.toFixed(4)} SOL`
        )
        setIsGenerating(false)
        return
      }

      // 3. Mint fortune token with optional user query
      toast.info('Minting fortune token... (this may take 30-60 seconds)')
      const queryToSend = userQuery.trim() || undefined
      const result = await mintFortuneTokenWithRetry(
        connection,
        publicKey,
        signTransaction,
        queryToSend,
        3 // maxRetries
      )

      toast.success(
        `Fortune #${result.fortuneNumber} minted successfully!`,
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

      // 4. Parse real cards from token metadata
      toast.info('Reading your fortune from the blockchain...')
      const parsedCards = await parseCardsFromToken(connection, result.mint)

      // Map parsed cards to full card data with inverted flag
      const selectedCards = parsedCards.map(({ id, inverted }) => ({
        ...MOCK_CARDS[id],
        inverted
      }))

      // 5. Get fortune number from token metadata (same as history page)
      const metadata = await getTokenMetadata(
        connection,
        result.mint,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      )

      const fortuneNumberStr = getAdditionalMetadataField(metadata, 'fortune_number')
      const fortuneNumber = fortuneNumberStr ? parseInt(fortuneNumberStr, 10) : result.fortuneNumber

      setCurrentReading({
        cards: selectedCards,
        timestamp: Date.now(),
        interpretation: generateMockInterpretation(selectedCards),
        signature: result.signature,  // Save signature for explorer link
        fortuneNumber: fortuneNumber  // Save fortune number from metadata
      })

    } catch (error) {
      console.error('Mint error:', error)
      const parsedError = parseMintError(error)

      // Friendly message for "already processed" errors (RPC cache/timing issue)
      // This happens when user delays wallet confirmation or RPC sees duplicate blockhash
      if (parsedError.code === 'ALREADY_PROCESSED' || parsedError.code === 'SIMULATION_FAILED') {
        toast.warning('⚡ The cosmic connection flickered', {
          description: 'Your funds are safe. Give it another try!',
        })
      } else {
        // Regular error handling for real issues
        toast.error('Failed to mint fortune', {
          description: parsedError.message,
        })
      }

      // Log detailed error for debugging
      if (parsedError.logs) {
        console.error('Transaction logs:', parsedError.logs)
      }
    } finally {
      setIsGenerating(false)
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

            {/* TODO: remove after real AI/Oracle implementation - Oracle's Interpretation */}
            <div className="max-w-3xl mx-auto mb-20 px-4">
              <div className="bg-cyber-surface/50 backdrop-blur border border-cyber-primary/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🔮</span>
                  <h3 className="text-xl font-bold text-cyber-primary">Oracle&apos;s Interpretation</h3>
                </div>
                <p className="text-slate-300 leading-relaxed italic">
                  {currentReading.interpretation}
                </p>
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
