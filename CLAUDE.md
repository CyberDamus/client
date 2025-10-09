# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CyberDamus** is a decentralized Tarot oracle application on Solana blockchain. Users connect their Solana wallet, pay 0.01 SOL to draw 3 Tarot cards (Past/Present/Future), and receive an on-chain fortune reading minted as an NFT. The client is built with Next.js 15, TypeScript, and features a cyberpunk aesthetic with extensive animations.

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
- **lib/store.ts**: Global state atoms for wallet connection, readings, and loading states
- Currently uses mock data with `TODO` comments marking items for blockchain integration
- All wallet interactions (`isWalletConnectedAtom`, `walletBalanceAtom`) are temporary placeholders

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

### Component System
- **components/ui/**: 20+ UI components from @aceternity and @cult-ui registries
  - Aceternity: Animations and effects (sparkles, card-stack, multi-step-loader, etc.)
  - Cult-ui: Buttons, cards, typography (bg-animate-button, minimal-card, animated-number)
- **components/client/Header.tsx**: Fixed header with navigation and wallet button
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

### Mock Data & TODOs
The codebase is currently in Phase 1 (MVP UI) with extensive mock data. Search for `TODO:` comments to identify areas requiring blockchain integration:
- **Wallet Connection**: Replace Jotai atoms with Solana Wallet Adapter
- **Card Drawing**: Replace `generateMockInterpretation()` with Anchor client calling `mint_fortune_nft()`
- **NFT Parsing**: Extract card IDs from NFT name format "CyberDamus XXYYZZ" → [XX, YY, ZZ]
- **IPFS Metadata**: Fetch card images and interpretations from IPFS
- **History Page**: Replace MOCK_NFTS with real wallet NFT queries

### Smart Contract Integration (Phase 2)
The Solana program is located at `/cyberdamus_nft` (parent directory). Key integration points:
- Program ID location: TBD (after deploy to devnet)
- Main instruction: `mint_fortune_nft(ctx)` - mints NFT with 3 random card IDs
- NFT naming: `CyberDamus {card1}{card2}{card3}` (e.g., "CyberDamus 120734")
- Cost: 0.01 SOL per reading

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

**Current Phase**: Phase 1 Complete (MVP UI)
- ✅ Next.js 15 setup with TypeScript
- ✅ 20 UI components from @aceternity + @cult-ui
- ✅ Main oracle page with 3 states
- ✅ History page with responsive layout
- ✅ Floating navigation and wallet UI

**Next Phase**: Phase 2 (Blockchain Integration)
- [ ] Solana Wallet Adapter (@solana/wallet-adapter-react)
- [ ] Anchor client for smart contract
- [ ] Real card drawing with transaction status
- [ ] NFT metadata parsing
- [ ] IPFS image loading

**Future Phase**: Phase 3 (Polish & Features)
- [ ] Advanced animations (card shuffle, flip reveal)
- [ ] Social sharing functionality
- [ ] Error boundaries and comprehensive error handling
- [ ] WebSocket for real-time transaction updates

## Related Documentation
- **README.md**: Full project documentation with component lists and design system
- **Smart Contract**: `/cyberdamus_nft` in parent directory
- **Whitepaper**: `/WHITEPAPER.md` in parent directory
