"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAtom } from "jotai"
import { BgAnimateButton } from "@/components/ui/bg-animate-button"
import { isWalletConnectedAtom, walletBalanceAtom } from "@/lib/store"

export function Header() {
  const pathname = usePathname()

  // TODO: remove after real wallet implementation
  const [isConnected, setIsConnected] = useAtom(isWalletConnectedAtom)
  const [balance] = useAtom(walletBalanceAtom)

  // TODO: remove after real wallet implementation - replace with actual wallet connection
  const handleConnectWallet = () => {
    setIsConnected(true)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4 backdrop-blur-md bg-cyber-bg/30 border-b border-white/5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl md:text-3xl font-bold text-cyber-primary font-orbitron tracking-wider">
            CYBERDAMUS
          </span>
        </Link>

        {/* Right side: Nav + Wallet */}
        <div className="flex items-center gap-3 md:gap-6">

          {/* History Link */}
          <Link
            href="/history"
            className={`
              text-sm md:text-base font-orbitron transition-colors
              ${pathname === '/history'
                ? 'text-cyber-primary'
                : 'text-slate-400 hover:text-cyber-primary'
              }
            `}
          >
            History
          </Link>

          {/* Wallet Button */}
          {!isConnected ? (
            <BgAnimateButton
              onClick={handleConnectWallet}
              className="text-xs md:text-sm py-2 px-4 md:py-3 md:px-6 rounded-lg font-orbitron"
            >
              Connect Wallet
            </BgAnimateButton>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyber-surface border border-cyber-primary/30">
              <span className="text-cyber-cyan font-orbitron text-sm font-semibold">
                {balance.toFixed(3)} SOL
              </span>
              <span className="text-slate-500 text-xs hidden md:inline">
                • 8NsiwW...J7gH
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
