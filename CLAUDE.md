# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CyberDamus** is a decentralized Tarot oracle application on Solana blockchain. Users connect their Solana wallet, pay 0.01 SOL to draw 3 Tarot cards (Past/Present/Future), and receive an on-chain fortune reading minted as a **Token-2022 with Metadata Extension** (NOT a traditional NFT). The client is built with Next.js 15, TypeScript, and features a cyberpunk aesthetic with extensive animations.

**Architecture**: Vanilla Solana (NOT Anchor) + Token-2022 + Metadata Extension for fully on-chain metadata.

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint

# Add UI components from registries
npx shadcn@latest add @aceternity/<component-name>
npx shadcn@latest add @cult-ui/<component-name>
```

## Architecture

### State Management (Jotai)
- **lib/store.ts**: Global state atoms for readings and loading states
- `currentReadingAtom`: Stores the current fortune reading (cards + interpretation)
- `isGeneratingAtom`: Loading state for mint transaction
- ✅ Wallet state now handled by Solana Wallet Adapter (no longer in Jotai)

### Pages & Routing (Next.js App Router)
- **app/page.tsx**: Main oracle page with 3 states:
  1. Wallet not connected (disabled button)
  2. Connected but no reading (draw cards button)
  3. After reading (shows 3 cards + interpretation)
- **app/history/page.tsx**: NFT collection history
  - Desktop: Table view with clickable rows
  - Mobile: Card grid layout
  - Modal for detailed reading view
- **app/layout.tsx**: Root layout with Orbitron font, Header component, dark mode

### Solana Integration (✅ IMPLEMENTED)
- **lib/WalletProvider.tsx**: Solana Wallet Adapter provider
  - Supports: Phantom, Solflare, Coinbase Wallet
  - Network: Devnet
  - Auto-connect enabled
- **lib/solana/**: Complete blockchain integration
  - `constants.ts`: Program ID, PDAs, fees
  - `instructions.ts`: Borsh serialization for contract calls
  - `oracle.ts`: Oracle state reading and validation
  - `mint.ts`: Main `mintFortuneToken()` function with retry logic
  - `tokenMetadata.ts`: Parse cards from Token-2022 metadata (format: "CyberDamus #19i20!07i")
  - `history.ts`: Fetch user's fortune collection with batch processing and GroupMemberPointer filtering
- **Toast notifications**: Sonner for user feedback

### Component System
- **components/ui/**: 20+ UI components from @aceternity and @cult-ui registries
  - Aceternity: Animations and effects (sparkles, card-stack, multi-step-loader, etc.)
  - Cult-ui: Buttons, cards, typography (bg-animate-button, minimal-card, animated-number)
- **components/client/Header.tsx**: Fixed header with real Solana wallet integration
  - Shows balance, wallet address
  - Click to disconnect
- All interactive components use `"use client"` directive (Next.js 15 RSC convention)

### Styling & Design System
- **Cyberpunk color palette** in tailwind.config.ts:
  - `cyber-bg`: #0a0118 (deep dark violet)
  - `cyber-surface`: #1a0f2e (dark surface)
  - `cyber-primary`: #8b5cf6 (neon purple)
  - `cyber-accent`: #ec4899 (pink-purple)
  - `cyber-cyan`: #06b6d4 (cyberpunk cyan)
- **Font**: Orbitron (Google Fonts) for all text
- **Mobile-first responsive**: <768px (single column), 768-1024px (2 cols), >1024px (3 cols)
- Custom shadows: `shadow-glow`, `shadow-glow-lg` for neon effects

### Configuration
- **components.json**: Defines component registries (@aceternity, @cult-ui) and path aliases
- **next.config.js**: Configures IPFS image domains for NFT metadata
- Path aliases (tsconfig.json):
  - `@/components` → components/
  - `@/lib` → lib/
  - `@/app` → app/

## Important Implementation Notes

### Smart Contract Integration (✅ ACTIVE)
The Solana program is located at `/cyberdamus_nft` (parent directory, branch: `token_2022_version`).

**Contract Details:**
- **Program ID (devnet)**: `2zmR8N51Q7KYZqnzJJWaJkM3wbxwBqj2gimNPf8Ldqu7`
- **Architecture**: Vanilla Solana (NOT Anchor!) + Token-2022
- **Oracle PDA seed**: `"oracle-v4"`
- **Main instruction**: `MintFortuneToken` (enum variant 1)
  - No arguments needed - just discriminator byte
  - Generates 3 random cards on-chain using Fisher-Yates algorithm
  - Mints Token-2022 with Metadata Extension
  - All metadata stored on-chain (no external dependencies)
- **Token naming**: `"CyberDamus #AAoAAoAAo"` where:
  - AA = decimal card ID (00-77)
  - o = orientation (i=inverted, !=upright)
  - Example: "#19i20!07i" = cards [19 inverted, 20 upright, 7 inverted]
- **Fee**: 0.01 SOL (hardcoded constant `PEOPLE_FEE`)
- **Total cost**: ~0.02 SOL (0.01 fee + rent for mint account)

**Client Integration:**
```typescript
// Main mint function
import { mintFortuneTokenWithRetry } from '@/lib/solana'

const result = await mintFortuneTokenWithRetry(
  connection,
  publicKey,
  signTransaction,
  3 // max retries
)

// Returns: { signature, mint, fortuneNumber }
```

**Safety Features:**
- ✅ Balance check before transaction
- ✅ Oracle status validation
- ✅ Transaction simulation (dry-run)
- ✅ Retry logic (exponential backoff)
- ✅ User-friendly error messages via toast

### Remaining TODOs
- ✅ **Metadata parsing**: Extract real card data from Token-2022 metadata after mint (COMPLETED)
- ✅ **History Page**: Query user's Token-2022 tokens and display collection (COMPLETED)
- [ ] **Card images**: Display IPFS images (URIs already extracted from additionalMetadata)
- [ ] **Interpretation**: Real AI/Oracle interpretation (currently using mock generation)

### Animation & Performance
- Avoid using BackgroundGradientAnimation component (removed due to performance issues)
- SparklesCore is configured with `particleDensity={100}` for performance
- MultiStepLoader shows 6 steps during 6-second card generation delay
- Use Framer Motion for card reveal animations (planned Phase 3)

### Responsive Design Patterns
- Header: Truncate wallet address on mobile, show full on desktop
- History page: Table on desktop (md:block), card grid on mobile
- Modal dialogs: max-w-5xl with flex-col on mobile, flex-row on desktop
- Font sizes: Scale down on mobile (text-4xl md:text-5xl)

## Common Development Patterns

### Adding New Pages
1. Create page.tsx in app/ directory
2. Add navigation link in components/client/Header.tsx
3. Use cyberpunk color classes (`text-cyber-primary`, `bg-cyber-surface`, etc.)
4. Wrap client-side interactivity with `"use client"` directive

### Working with Mock Data
When replacing mock implementations:
1. Keep the interface/type definitions (they match the final blockchain structure)
2. Replace the data source (Jotai atom → blockchain query)
3. Add error handling and loading states
4. Update the TODO comment or remove it

### Styling New Components
- Use `cn()` utility from lib/utils.ts for conditional classes
- Follow the cyberpunk palette (purple/pink gradients, cyan accents)
- Add glow effects with `shadow-glow` and `shadow-glow-lg`
- Font: Always use `font-orbitron` class
- Borders: Use `border-cyber-primary/30` for subtle borders

## Project Status & Roadmap

**Current Phase**: Phase 2 (Blockchain Integration) - ~90% Complete
- ✅ Next.js 15 setup with TypeScript
- ✅ 20 UI components from @aceternity + @cult-ui
- ✅ Main oracle page with 3 states
- ✅ History page with responsive layout (table on desktop, cards on mobile)
- ✅ Solana Wallet Adapter integration (Phantom, Solflare, Coinbase)
- ✅ Complete Vanilla Solana + Token-2022 integration
- ✅ Real mint transaction with retry logic
- ✅ Toast notifications for user feedback
- ✅ Balance checks and error handling
- ✅ Parse Token-2022 metadata after mint (real cards from token name)
- ✅ History page: Query user's Token-2022 collection with batch processing
- ✅ Card parsing from on-chain token names (format: "CyberDamus #AAoAAoAAo")
- ✅ Transaction signatures and Solana Explorer links
- ✅ IPFS URI extraction from additionalMetadata (past/present/future)
- ✅ GroupMemberPointer extension filtering for collection membership

**Phase 2 Remaining**:
- [ ] IPFS image display (URIs already available in `cardImages` field)
- [ ] Real AI/Oracle interpretation (currently using `generateMockInterpretation()`)

**Future Phase**: Phase 3 (Polish & Features)
- [ ] Advanced animations (card shuffle, flip reveal)
- [ ] Social sharing functionality
- [ ] Error boundaries and comprehensive error handling
- [ ] WebSocket for real-time transaction updates
- [ ] Transaction confirmation modal with cost breakdown

## Common Integration Patterns

### Calling the Smart Contract
```typescript
// 1. Import mint function
import { mintFortuneTokenWithRetry } from '@/lib/solana'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'

// 2. Get wallet context
const { publicKey, signTransaction } = useWallet()
const { connection } = useConnection()

// 3. Call mint function
try {
  const result = await mintFortuneTokenWithRetry(
    connection,
    publicKey,
    signTransaction,
    3 // max retries
  )

  console.log('Minted!', result.signature)
  console.log('Mint address:', result.mint.toBase58())
  console.log('Fortune #:', result.fortuneNumber)
} catch (error) {
  const parsedError = parseMintError(error)
  toast.error(parsedError.message)
}
```

### Reading Oracle State
```typescript
import { getOracleData, checkOracleStatus } from '@/lib/solana'

// Check if Oracle is ready
const status = await checkOracleStatus(connection)
if (!status.ready) {
  console.error('Oracle not ready:', status.error)
}

// Get Oracle data
const oracle = await getOracleData(connection)
console.log('Treasury:', oracle.treasury.toBase58())
console.log('Total fortunes:', oracle.totalFortunes)
console.log('Collection mint:', oracle.collectionMint.toBase58())
```

### Borsh Serialization
The contract uses Borsh (NOT Anchor IDL). All instructions are manually serialized:
```typescript
import { serializeMintFortuneTokenInstruction } from '@/lib/solana'

// MintFortuneToken = enum variant 1
const instructionData = serializeMintFortuneTokenInstruction()
// Returns: Buffer.from([1])
```

### Fetching Fortune History
```typescript
import { fetchUserFortunes } from '@/lib/solana'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'

// Get wallet and connection
const { publicKey } = useWallet()
const { connection } = useConnection()

// Fetch user's fortune collection (limit: 10 latest)
const fortunes = await fetchUserFortunes(connection, publicKey, 10)

// Returns array of HistoryFortune:
// {
//   mint: PublicKey,
//   tokenAccount: PublicKey,
//   fortuneNumber: number,
//   timestamp: number,
//   cards: ParsedCard[],  // [{id: 19, inverted: true}, ...]
//   metadata: { name, symbol, uri },
//   cardImages?: { past, present, future },  // IPFS URIs
//   signature?: string  // Transaction signature for explorer
// }

// Features:
// - Batch processing (5 tokens at a time) for performance
// - GroupMemberPointer filtering (verifies collection membership)
// - Fallback to metadata name check if GroupMemberPointer unavailable
// - Sorted by timestamp (newest first)
// - Extracts IPFS URIs from additionalMetadata
```

## Related Documentation
- **README.md**: Full project documentation with component lists and design system
- **Smart Contract**: `/cyberdamus_nft` (parent directory, branch: `token_2022_version`)
- **Whitepaper**: `/WHITEPAPER.md` (parent directory) - detailed Token-2022 architecture
- **FINAL_IMPLEMENTATION.md**: (parent directory) - contract implementation details
