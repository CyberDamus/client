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

# Database commands (Vercel Postgres + Prisma)
npm run db:push     # Push schema to database
npm run db:studio   # Open Prisma Studio (GUI)

# Add UI components from registries
npx shadcn@latest add @aceternity/<component-name>
npx shadcn@latest add @cult-ui/<component-name>
```

## Database Setup (Quick Start)

**Vercel Postgres** is used for storing user queries and interpretations.

**Setup (30 seconds):**
```bash
# 1. Create database in Vercel Dashboard:
#    Storage → Create Database → Postgres

# 2. Pull environment variables locally:
vercel link
vercel env pull .env.local

# 3. Push Prisma schema to database:
npm run db:push

# 4. (Optional) View database:
npm run db:studio
```

**See `DATABASE_SETUP.md` for detailed instructions.**

## Architecture

### State Management (Jotai)
- **lib/store.ts**: Global state atoms for readings and loading states
- `currentReadingAtom`: Stores the current fortune reading (cards + interpretation)
- `isGeneratingAtom`: Loading state for mint transaction
- ✅ Wallet state now handled by Solana Wallet Adapter (no longer in Jotai)

### Pages & Routing (Next.js App Router)
- **app/page.tsx**: Main oracle page with 3 states:
  1. Wallet not connected (disabled button)
  2. Connected but no reading (draw cards button with optional query input)
  3. After reading (shows 3 cards with pixel dissolve animation + interpretation)
     - Cards appear with backs visible
     - Pixel dissolve animation reveals cards sequentially (1.5s delay between cards)
     - 20x30 pixel grid (280x420px per card)
- **app/test/page.tsx**: Test page for pixel dissolve animation
  - Demonstrates card reveal animation with Start/Reset controls
  - Same animation system as main page
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

### Database & API (✅ IMPLEMENTED)
**Vercel Postgres** (Neon-powered) stores user queries and interpretations.

**Database:**
- **prisma/schema.prisma**: Fortune model with blockchain + user data
- **lib/db.ts**: Prisma client singleton
- **Schema**: `fortunes` table with status tracking
  - `pending_mint` → draft created, waiting for mint
  - `pending_interpretation` → mint succeeded, waiting for AI (Phase 2)
  - `completed` → fully processed
  - `failed` → mint failed

**API Routes:**
- `POST /api/fortune/draft` - Create draft before mint
- `PATCH /api/fortune/update` - Update after mint (success/failure)
- `GET /api/fortune/[mintAddress]` - Get fortune by mint address
- `GET /api/cron/cleanup` - Daily cleanup of old pending_mint (24+ hours)

**Flow:**
1. User clicks "Decrypt Your Fate"
2. Create draft (`POST /api/fortune/draft`) → returns `draftId`
3. Mint fortune token on blockchain
4. Update draft (`PATCH /api/fortune/update`) with cards, signature, status
5. (Phase 2) AI generates interpretation → status = `completed`

**Controlled Loading (7 steps):**
- 🔮 Preparing your reading... (draft create)
- 🌌 Connecting to the Oracle... (checkOracleStatus)
- ⚖️ Validating cosmic balance... (checkUserBalance)
- ✨ Minting fortune token... (mintFortuneToken)
- 📖 Reading blockchain prophecy... (parseCards)
- 💾 Saving to cosmic records... (update draft)
- ✅ Revelation complete!

**See `DATABASE_SETUP.md` for setup instructions.**

### Card Reveal Animation (Pixel Dissolve) (✅ IMPLEMENTED)
Implemented in **app/page.tsx** (STATE 3) and **app/test/page.tsx**

**Visual Effect:**
- Cards initially appear with backs visible (card-back.png overlay)
- Pixels dissolve from top to bottom with rotation and fade effects
- Sequential reveal: one card completes before next begins (1.5s delay)
- Each pixel falls independently with randomized timing within its row

**Technical Implementation:**
- **Pixel Grid**: 20 columns × 30 rows × 14px = 280×420px per card
- **Animation States** (useState):
  - `revealedCards: Set<number>` - tracks fully revealed cards
  - `animatingCards: Set<number>` - tracks cards currently animating
  - `showPixelAnimation: boolean` - controls animation lifecycle
- **Pixel Data** (useMemo): Pre-calculated delays for 600 pixels per card
  - Row-based delay: `row * 30ms` (top rows fall first)
  - Random variance: `+ Math.random() * 200ms` (organic effect)
- **CSS Animations**:
  ```css
  @keyframes pixelFall {
    0%: translateY(0) rotate(0deg) opacity(1)
    100%: translateY(600px) rotate(450deg) opacity(0)
  }
  @keyframes glow {
    0%, 100%: box-shadow(0 0 4px purple)
    50%: box-shadow(0 0 12px pink)
  }
  ```
- **Performance**: CSS Grid layout, `will-change: transform, opacity`
- **Auto-trigger**: useEffect watches `currentReading` changes (after mint)

**Integration Points:**
- Triggered automatically when `currentReading` is set (app/page.tsx:106-126)
- Card back overlay fades out when animation starts (opacity transition)
- Pixel grid removed from DOM after reveal completes (conditional rendering)

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
  1 // max retries - MUST be 1 (see critical note below)
)

// Returns: { signature, mint, fortuneNumber }
```

**Safety Features:**
- ✅ Balance check before transaction
- ✅ Oracle status validation
- ✅ Transaction simulation (dry-run)
- ✅ Retry logic (exponential backoff)
- ✅ User-friendly error messages via toast

**⚠️ CRITICAL - Retry Configuration:**
> **maxRetries MUST ALWAYS be set to 1** (NOT 2 or 3!)
>
> Automatic retries with short intervals on devnet cause "already processed" errors due to RPC blockhash caching (5-10 seconds). When maxRetries > 1:
> - Attempt 1 fails → waits 5s → Attempt 2 starts
> - Attempt 2 gets same cached blockhash → RPC sees duplicate transaction → "already processed" error
>
> With maxRetries = 1, user manually retries after seeing error (10-20s delay), ensuring fresh blockhash.
>
> **Do NOT change this value without thorough testing on devnet!**

### Remaining TODOs
- ✅ **Metadata parsing**: Extract real card data from Token-2022 metadata after mint (COMPLETED)
- ✅ **History Page**: Query user's Token-2022 tokens and display collection (COMPLETED)
- ✅ **Database integration**: Store user queries and fortune data (COMPLETED - Vercel Postgres)
- ✅ **API Routes**: Draft creation, updates, and retrieval (COMPLETED)
- ✅ **Controlled loading**: Real-time progress with 7 steps (COMPLETED)
- [ ] **Card images**: Display IPFS images (URIs already extracted from additionalMetadata)
- [ ] **Interpretation**: Real AI/Oracle interpretation (currently using mock generation - Phase 2)

### Animation & Performance
- Avoid using BackgroundGradientAnimation component (removed due to performance issues)
- SparklesCore is configured with `particleDensity={100}` for performance
- MultiStepLoader shows 7 steps with controlled progress (real-time, not timer-based)
- ✅ **Pixel Dissolve Animation** (implemented):
  - CSS Grid-based layout (20×30 = 600 pixels per card)
  - CSS keyframes (`pixelFall`, `glow`) for hardware-accelerated animations
  - `will-change: transform, opacity` for optimization
  - Pre-calculated delays (useMemo) to avoid runtime computation
  - Conditional rendering removes pixel grid from DOM after animation
  - No external animation libraries (pure CSS + React state)

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

**Current Phase**: Phase 2.5 (Database Integration) - COMPLETE ✅
**Next Phase**: Phase 3 (AI Interpretation)
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
- ✅ Pixel dissolve card reveal animation (main page + test page)

**Phase 2.5 COMPLETE** (Database Integration):
- ✅ Vercel Postgres + Prisma setup
- ✅ Fortune model with status tracking (pending_mint → pending_interpretation → completed)
- ✅ API routes: draft creation, update, retrieval, cleanup
- ✅ Controlled loading with 7 real-time steps
- ✅ Database integration in mint flow
- ✅ Daily cron job for cleanup

**Phase 3** (AI & Polish - IN PROGRESS):
- [ ] AI interpretation (OpenAI/Claude API integration)
- [ ] Auto-trigger interpretation after mint
- [ ] IPFS image display (URIs already available in `cardImages` field)
- [ ] History page integration with database queries

**Future Phase**: Phase 4 (Advanced Features)
- [ ] Additional animation variations (card shuffle, alternative reveal effects)
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
    1 // max retries - CRITICAL: MUST be 1 (NOT 2 or 3!)
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
- **DATABASE_SETUP.md**: Complete guide for Vercel Postgres setup
- **Smart Contract**: `/cyberdamus_nft` (parent directory, branch: `token_2022_version`)
- **Whitepaper**: `/WHITEPAPER.md` (parent directory) - detailed Token-2022 architecture
- **FINAL_IMPLEMENTATION.md**: (parent directory) - contract implementation details

---

## 📅 Recent Updates (January 30, 2025)

### Phase 2.5 - Database Integration (COMPLETED)

**What was implemented:**

1. **Database Setup (Vercel Postgres + Prisma)**
   - Created `prisma/schema.prisma` with Fortune model
   - Setup `lib/db.ts` (Prisma client singleton)
   - Database tracks: wallet, query, cards, mint address, status, interpretation

2. **API Routes (4 endpoints)**
   - `POST /api/fortune/draft` - Create draft before mint
   - `PATCH /api/fortune/update` - Update after mint (success/failure)
   - `GET /api/fortune/[mintAddress]` - Get fortune by mint address
   - `GET /api/cron/cleanup` - Daily cleanup of old pending_mint records

3. **UI Integration (Controlled Loading)**
   - Updated `app/page.tsx` with 7-step controlled loader
   - Real-time progress (not timer-based)
   - Steps: Prepare → Oracle → Balance → Mint → Parse → Save → Complete
   - Database calls integrated into mint flow

4. **Status Tracking System**
   - `pending_mint` - draft created, waiting for mint
   - `pending_interpretation` - mint succeeded, ready for AI
   - `completed` - fully processed (Phase 3)
   - `failed` - mint failed, error logged

5. **Vercel Configuration**
   - Created `vercel.json` with daily cron job (midnight UTC)
   - Automatic cleanup of orphaned drafts (24+ hours old)
   - Environment variables auto-configured via Vercel Postgres

6. **Documentation**
   - Complete `DATABASE_SETUP.md` guide
   - Updated `CLAUDE.md` with database architecture
   - Updated `README.md` with new commands and status

**Key Features:**
- ✅ User queries saved to database (optional, always stored if provided)
- ✅ Cards and fortune data persisted for future AI interpretation
- ✅ Error handling with fallback (failed mints recorded)
- ✅ Prisma Studio for easy database inspection (`npm run db:studio`)

**Quick Commands:**
```bash
# View database
npm run db:studio

# Push schema changes
npm run db:push

# Deploy to Vercel
vercel --prod
```

**Next Steps (Phase 3):**
- AI interpretation integration (OpenAI/Claude API)
- Auto-trigger interpretation after successful mint
- Display IPFS card images
- History page integration with database queries
