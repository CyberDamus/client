"use client"

import { BgAnimateButton } from "@/components/ui/bg-animate-button"
import { MultiStepLoader } from "@/components/ui/multi-step-loader"
import { SparklesCore } from "@/components/ui/sparkles"
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

export default function HomePage() {
  const { connected: isWalletConnected, publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const [currentReading, setCurrentReading] = useAtom(currentReadingAtom)
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom)
  const [mintCost, setMintCost] = useState<{ serviceFee: number; networkFee: number; total: number } | null>(null)
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({})

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

  // Calculate mint cost when connection is available
  useEffect(() => {
    if (connection) {
      calculateMintCost(connection)
        .then(setMintCost)
        .catch(err => console.error('Failed to calculate mint cost:', err))
    }
  }, [connection])

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

      // 3. Mint fortune token
      toast.info('Minting fortune token... (this may take 30-60 seconds)')
      const result = await mintFortuneTokenWithRetry(
        connection,
        publicKey,
        signTransaction,
        1
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
      {/* Simple gradient background - NO BLOB! */}
      <div className="fixed inset-0 bg-gradient-to-br from-cyber-bg via-purple-950/20 to-cyber-bg" />

      {/* Sparkles - only stars, no blob */}
      <SparklesCore
        id="tsparticles-home"
        background="transparent"
        minSize={0.6}
        maxSize={1.4}
        particleDensity={100}
        className="fixed inset-0 z-0"
        particleColor="#8b5cf6"
      />

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
          <div className="text-center space-y-6">
            <div className="text-6xl mb-4 animate-float">🔮</div>
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-accent">
              Draw Your Fortune
            </h1>
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

            {/* TODO: remove mock cards after real NFT implementation */}
            <div className="flex flex-col md:flex-row gap-6 mb-8">
              {currentReading.cards.map((card, idx) => (
                <div key={idx} className="flex-1 space-y-4">
                  {/* Card Image */}
                  <div className="aspect-[2/3] bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg overflow-hidden relative flex flex-col items-center justify-center p-6">
                    {!imageErrors[idx] ? (
                      <>
                        <div className={`relative w-full h-full ${card.inverted ? 'rotate-180' : ''}`}>
                          <Image
                            src={`/mock_imgs/${mockImages[idx]}.PNG`}
                            alt={card.name}
                            fill
                            className="object-contain"
                            onError={() => {
                              setImageErrors(prev => ({ ...prev, [idx]: true }))
                            }}
                          />
                        </div>
                        {card.inverted && (
                          <span className="absolute bottom-4 text-xs text-cyber-accent uppercase tracking-wider bg-cyber-bg/80 px-2 py-1 rounded">
                            Inverted
                          </span>
                        )}
                      </>
                    ) : (
                      /* Fallback to numbers if image fails */
                      <>
                        <span className="text-6xl font-mono text-cyber-primary mb-4">
                          {String(card.id).padStart(2, '0')}
                        </span>
                        <h3 className="text-xl font-bold text-center mb-2">{card.name}</h3>
                        {card.inverted && (
                          <span className="text-xs text-cyber-accent uppercase tracking-wider mt-2">
                            Inverted
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="text-center">
                    <p className="text-xs text-cyber-cyan uppercase tracking-wider mb-2">
                      {['Past', 'Present', 'Future'][idx]}
                    </p>
                    <h3 className="text-lg font-bold mb-1">{card.name}</h3>
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
                  <h3 className="text-xl font-bold text-cyber-primary">Oracle&apos;s Interpretation</h3>
                </div>
                <p className="text-slate-300 leading-relaxed italic">
                  {currentReading.interpretation}
                </p>
              </div>
            </div>

            {/* Draw Again Button */}
            <div className="flex justify-center pb-12">
              <BgAnimateButton
                onClick={handleDrawCards}
                disabled={isGenerating}
                className="text-xl py-8 px-16 rounded-xl font-orbitron glow-border"
              // className="text-lg py-6 px-10 rounded-xl font-orbitron"
              >
                ⚡ Decrypt Again
              </BgAnimateButton>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
