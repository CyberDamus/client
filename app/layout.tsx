import type { Metadata } from "next"
import { Orbitron } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/client/Header"
import { WalletProvider } from "@/lib/WalletProvider"
import { Toaster } from "sonner"

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '900'],
  variable: '--font-orbitron',
})

export const metadata: Metadata = {
  title: "CyberDamus - Decentralized Tarot Oracle",
  description: "On-chain Tarot readings on Solana blockchain. Each fortune becomes a unique NFT.",
  keywords: ["tarot", "solana", "nft", "oracle", "blockchain", "web3"],
  authors: [{ name: "CyberDamus" }],
  openGraph: {
    title: "CyberDamus - Decentralized Tarot Oracle",
    description: "On-chain Tarot readings on Solana blockchain",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${orbitron.variable} font-orbitron`}>
        <WalletProvider>
          <Header />
          <div className="pt-20">
            {children}
          </div>
          <Toaster position="bottom-right" theme="dark" richColors />
        </WalletProvider>
      </body>
    </html>
  )
}
