"use client"

import { BgAnimateButton } from "@/components/ui/bg-animate-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MinimalCard } from "@/components/ui/minimal-card"
import { fetchUserFortunes, type HistoryFortune } from "@/lib/solana"
import { MOCK_CARDS, generateMockInterpretation } from "@/lib/store"
import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

type EnrichedCard = {
  id: number
  name: string
  meaning: string
  inverted: boolean
}

type FortuneWithInterpretation = Omit<HistoryFortune, 'cards'> & {
  cards: EnrichedCard[]
  interpretation: string
  formattedDate: string
}

export default function HistoryPage() {
  const { connected: isWalletConnected, publicKey } = useWallet()
  const { connection } = useConnection()

  const [fortunes, setFortunes] = useState<FortuneWithInterpretation[]>([])
  const [selectedFortune, setSelectedFortune] = useState<FortuneWithInterpretation | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load fortunes when wallet connects
  useEffect(() => {
    if (isWalletConnected && publicKey) {
      loadFortunes()
    } else {
      setFortunes([])
      setError(null)
    }
  }, [isWalletConnected, publicKey])

  const loadFortunes = async () => {
    if (!publicKey) return

    setIsLoading(true)
    setError(null)

    try {
      const rawFortunes = await fetchUserFortunes(connection, publicKey, 10)

      // Map to full fortune data with card names and interpretation
      const enriched: FortuneWithInterpretation[] = rawFortunes.map((fortune) => {
        // Map parsed cards to full card data
        const cards = fortune.cards.map(({ id, inverted }) => ({
          ...MOCK_CARDS[id],
          inverted,
        }))

        return {
          ...fortune,
          cards,
          interpretation: generateMockInterpretation(cards),
          formattedDate: new Date(fortune.timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        }
      })

      setFortunes(enriched)

      if (enriched.length === 0) {
        toast.info('No fortunes found. Draw your first reading!')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load fortunes'
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Failed to load fortunes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-cyber-bg">
      {/* Simple gradient background instead of animated blob */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-bg via-cyber-surface to-cyber-bg" />

      {/* Content */}
      <div className="relative z-10 min-h-screen py-12 px-4">
        <div className="container mx-auto max-w-7xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-accent mb-4">
              Fortune History
            </h1>

            <div className="text-slate-400 text-sm">
              {isWalletConnected && !isLoading && fortunes.length > 0 && (
                <span>Showing {fortunes.length} latest fortunes</span>
              )}
              {isWalletConnected && !isLoading && fortunes.length === 0 && !error && (
                <span>No fortunes yet</span>
              )}
              {!isWalletConnected && (
                <span>Connect your wallet to view your fortunes</span>
              )}
              {isLoading && (
                <span>Loading your fortunes...</span>
              )}
            </div>
          </div>

          {/* Desktop: Table */}
          {isWalletConnected && !isLoading && !error && fortunes.length > 0 && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-cyber-primary/30">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-cyber-cyan">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-cyber-cyan">Cards</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-cyber-cyan">Fortune #</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-cyber-cyan">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fortunes.map((fortune) => (
                    <tr
                      key={fortune.mint.toBase58()}
                      onClick={() => setSelectedFortune(fortune)}
                      className="border-b border-white/5 hover:bg-cyber-surface/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-300">{fortune.formattedDate}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {fortune.cards.map((card, idx) => (
                            <div
                              key={idx}
                              className="w-10 h-14 rounded bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/40 flex items-center justify-center"
                            >
                              <span className="text-xs font-mono">{String(card.id).padStart(2, '0')}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-cyber-cyan font-mono">#{fortune.fortuneNumber}</td>
                      <td className="px-6 py-4 text-right text-sm text-cyber-primary hover:text-cyber-accent">
                        View →
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile: Cards */}
          {isWalletConnected && !isLoading && !error && fortunes.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {fortunes.map((fortune) => (
                <MinimalCard
                  key={fortune.mint.toBase58()}
                  onClick={() => setSelectedFortune(fortune)}
                  className="cursor-pointer hover:border-cyber-primary/50 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 font-mono">{fortune.formattedDate}</p>
                      <p className="text-xs text-cyber-cyan font-mono">#{fortune.fortuneNumber}</p>
                    </div>

                    {/* 3 Cards */}
                    <div className="flex gap-2">
                      {fortune.cards.map((card, idx) => (
                        <div
                          key={idx}
                          className="flex-1 aspect-[2/3] rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center"
                        >
                          <span className="text-xs font-mono text-slate-400">
                            {String(card.id).padStart(2, '0')}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Labels */}
                    <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                      <span>Past</span>
                      <span>Present</span>
                      <span>Future</span>
                    </div>
                  </div>
                </MinimalCard>
              ))}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="text-6xl mb-4 animate-pulse">🔮</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                Loading your fortunes...
              </h3>
              <p className="text-sm text-slate-500">
                Reading from the blockchain
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                Failed to load fortunes
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                {error}
              </p>
              <BgAnimateButton
                onClick={loadFortunes}
                className="px-6 py-3 rounded-lg"
              >
                Try Again
              </BgAnimateButton>
            </div>
          )}

          {/* Empty State */}
          {isWalletConnected && !isLoading && !error && fortunes.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="text-6xl mb-4">🔮</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No fortunes yet
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Draw your first reading to start your collection
              </p>
              <BgAnimateButton
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 rounded-lg"
              >
                ⚡ Draw Your Fortune
              </BgAnimateButton>
            </div>
          )}

          {/* Wallet Not Connected */}
          {!isWalletConnected && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="text-6xl mb-4">👛</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                Wallet Not Connected
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Connect your wallet to view your fortune collection
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Modal */}
      <Dialog open={!!selectedFortune} onOpenChange={() => setSelectedFortune(null)}>
        <DialogContent className="max-w-5xl bg-cyber-surface border-cyber-primary/30">
          {selectedFortune && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-accent">
                      Fortune #{selectedFortune.fortuneNumber}
                    </DialogTitle>
                    <p className="text-sm text-slate-500">{selectedFortune.formattedDate}</p>
                  </div>
                  {selectedFortune.signature && (
                    <a
                      href={`https://solana.fm/tx/${selectedFortune.signature}?cluster=devnet-solana`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyber-cyan hover:text-cyber-primary transition-colors flex items-center gap-1"
                    >
                      <span>🔍</span>
                      <span>View TX</span>
                    </a>
                  )}
                </div>
              </DialogHeader>

              {/* 3 BIG Cards */}
              <div className="flex flex-col md:flex-row gap-6 mt-6">
                {selectedFortune.cards.map((card, idx) => (
                  <div key={idx} className="flex-1 space-y-4">
                    {/* Card Image Placeholder */}
                    <div className="aspect-[2/3] rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/40 flex flex-col items-center justify-center">
                      <span className="text-6xl font-mono mb-2">{String(card.id).padStart(2, '0')}</span>
                      {card.inverted && (
                        <span className="text-xs text-cyber-accent uppercase tracking-wider">Inverted</span>
                      )}
                    </div>

                    {/* Card Info */}
                    <div className="text-center">
                      <p className="text-xs text-cyber-cyan uppercase tracking-wider mb-2">
                        {['Past', 'Present', 'Future'][idx]}
                      </p>
                      <h3 className="text-xl font-bold mb-2">{card.name}</h3>
                      <p className="text-sm text-slate-400">{card.meaning}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* TODO: remove after real AI/Oracle implementation - Oracle's Interpretation */}
              <div className="mt-6 p-4 bg-cyber-bg/50 rounded-lg border border-cyber-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🔮</span>
                  <h4 className="text-sm font-bold text-cyber-primary uppercase tracking-wider">Oracle's Message</h4>
                </div>
                <p className="text-sm text-slate-300 italic leading-relaxed">
                  {selectedFortune.interpretation}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-6">
                <BgAnimateButton
                  className="flex-1 rounded-lg"
                  onClick={() => {
                    window.open(
                      `https://solana.fm/address/${selectedFortune.mint.toBase58()}?cluster=devnet-solana`,
                      '_blank'
                    )
                  }}
                >
                  View NFT on Explorer
                </BgAnimateButton>
                <button
                  onClick={() => setSelectedFortune(null)}
                  className="px-6 py-3 border border-slate-600 rounded-lg hover:border-cyber-primary transition-colors"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
