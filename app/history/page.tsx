"use client"

import { useState } from "react"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { MinimalCard } from "@/components/ui/minimal-card"
import { BgAnimateButton } from "@/components/ui/bg-animate-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// TODO: remove after real blockchain implementation - Mock NFT data
const MOCK_NFTS = [
  {
    id: "456931",
    date: "Oct 8, 2025",
    cards: [
      { id: 45, name: "Knight of Cups", meaning: "Romance and charm" },
      { id: 69, name: "Page of Pentacles", meaning: "New opportunities" },
      { id: 31, name: "Five of Wands", meaning: "Competition and conflict" }
    ],
    timestamp: 1696780800,
    interpretation: "The cosmic energies reveal a journey of transformation ahead. Your past experiences have prepared you for the challenges you now face."
  },
  {
    id: "127854",
    date: "Oct 7, 2025",
    cards: [
      { id: 12, name: "The Hanged Man", meaning: "Surrender, letting go" },
      { id: 78, name: "King of Pentacles", meaning: "Wealth and success" },
      { id: 54, name: "Four of Swords", meaning: "Rest and recovery" }
    ],
    timestamp: 1696694400,
    interpretation: "The blockchain of fate shows convergence of powerful forces in your life. What seems like conflict is actually the universe aligning opportunities."
  },
  {
    id: "334521",
    date: "Oct 6, 2025",
    cards: [
      { id: 33, name: "Seven of Wands", meaning: "Defense and perseverance" },
      { id: 45, name: "Knight of Cups", meaning: "Romance and charm" },
      { id: 21, name: "The World", meaning: "Completion and success" }
    ],
    timestamp: 1696608000,
    interpretation: "Ancient wisdom flows through the digital ether to guide you. The cards speak of balance between material and spiritual realms."
  },
  {
    id: "766012",
    date: "Oct 5, 2025",
    cards: [
      { id: 76, name: "Queen of Pentacles", meaning: "Nurturing and abundance" },
      { id: 60, name: "Six of Swords", meaning: "Transition and moving on" },
      { id: 12, name: "The Hanged Man", meaning: "Surrender, letting go" }
    ],
    timestamp: 1696521600,
    interpretation: "The oracle sees a pattern of renewal emerging from chaos. Past struggles have forged your strength, and now the universe opens doors."
  },
]

type NFT = typeof MOCK_NFTS[0]

export default function HistoryPage() {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null)

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

            <div className="flex items-center gap-2 text-slate-400">
              <AnimatedNumber
                value={MOCK_NFTS.length}
                className="text-2xl font-bold text-cyber-cyan"
              />
              <span className="text-sm">readings collected</span>
            </div>
          </div>

          {/* Desktop: Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-cyber-primary/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyber-cyan">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyber-cyan">Cards</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-cyber-cyan">NFT ID</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-cyber-cyan">Action</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_NFTS.map((nft) => (
                  <tr
                    key={nft.id}
                    onClick={() => setSelectedNFT(nft)}
                    className="border-b border-white/5 hover:bg-cyber-surface/50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-300">{nft.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {nft.cards.map((card, idx) => (
                          <div
                            key={idx}
                            className="w-10 h-14 rounded bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/40 flex items-center justify-center"
                          >
                            <span className="text-xs font-mono">{String(card.id).padStart(2, '0')}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-cyber-cyan font-mono">#{nft.id}</td>
                    <td className="px-6 py-4 text-right text-sm text-cyber-primary hover:text-cyber-accent">
                      View →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: Cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {MOCK_NFTS.map((nft) => (
              <MinimalCard
                key={nft.id}
                onClick={() => setSelectedNFT(nft)}
                className="cursor-pointer hover:border-cyber-primary/50 transition-colors"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 font-mono">{nft.date}</p>
                    <p className="text-xs text-cyber-cyan font-mono">#{nft.id}</p>
                  </div>

                  {/* 3 Cards */}
                  <div className="flex gap-2">
                    {nft.cards.map((card, idx) => (
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

          {/* Empty State */}
          {MOCK_NFTS.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <div className="text-6xl mb-4">🔮</div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No fortunes yet
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Connect your wallet and draw your first reading
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Modal */}
      <Dialog open={!!selectedNFT} onOpenChange={() => setSelectedNFT(null)}>
        <DialogContent className="max-w-5xl bg-cyber-surface border-cyber-primary/30">
          {selectedNFT && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-primary to-cyber-accent">
                  Fortune #{selectedNFT.id}
                </DialogTitle>
                <p className="text-sm text-slate-500">{selectedNFT.date}</p>
              </DialogHeader>

              {/* 3 BIG Cards */}
              <div className="flex flex-col md:flex-row gap-6 mt-6">
                {selectedNFT.cards.map((card, idx) => (
                  <div key={idx} className="flex-1 space-y-4">
                    {/* Card Image Placeholder */}
                    <div className="aspect-[2/3] rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-500/40 flex items-center justify-center">
                      <span className="text-6xl font-mono">{String(card.id).padStart(2, '0')}</span>
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
                  {selectedNFT.interpretation}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-6">
                <BgAnimateButton className="flex-1 rounded-lg">
                  View on Solana Explorer
                </BgAnimateButton>
                <button
                  onClick={() => setSelectedNFT(null)}
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
