# 🔮 CyberDamus Web Client

Децентрализованный клиент для оракула Таро на Solana blockchain.

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Откройте http://localhost:3000
```

## 📦 Технологии

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Blockchain:** Solana Web3.js + Token-2022
- **Wallet:** Solana Wallet Adapter (Phantom, Solflare, Coinbase)
- **Database:** Vercel Postgres (Neon) + Prisma ORM
- **Styling:** Tailwind CSS
- **UI Components:**
  - @aceternity (11 компонентов) - animations, effects
  - @cult-ui (9 компонентов) - buttons, cards, headings
- **Animations:** Framer Motion
- **State:** Jotai + React Server Components

## 🎨 Дизайн-система

### Цветовая палитра (Киберпанк + Мистика)

```css
--cyber-bg: #0a0118          /* Глубокий темно-фиолетовый */
--cyber-surface: #1a0f2e     /* Темная поверхность */
--cyber-primary: #8b5cf6     /* Неоновый фиолетовый */
--cyber-accent: #ec4899      /* Розово-пурпурный */
--cyber-cyan: #06b6d4        /* Киберпанк cyan */
```

### Компоненты

**@aceternity:**
- `background-gradient-animation` - Фон главной страницы
- `sparkles` - Мерцающие звезды
- `card-stack` - Стопка карт Таро
- `evervault-card` - Эффект matrix для карт
- `moving-border` - Анимированная граница кнопок
- `floating-navbar` - Плавающая навигация
- `meteors` - Эффект падающих метеоритов
- `text-generate-effect` - Анимация появления текста
- `multi-step-loader` - Loader с этапами
- `3d-card` - 3D эффект для карт
- `glowing-stars` - Светящиеся звезды

**@cult-ui:**
- `bg-animate-button` - Кнопка с анимированным фоном
- `gradient-heading` - Заголовок с градиентом
- `typewriter` - Эффект печатной машинки
- `texture-card` - Карточка с текстурой
- `minimal-card` - Минималистичная карточка
- `animated-number` - Анимация счетчика
- `shader-lens-blur` - WebGL размытие
- `floating-panel` - Плавающая панель
- `text-animate` - Анимация текста

## 📱 Mobile First

Все компоненты оптимизированы под мобильные устройства:

- **Mobile (<768px):** Single column, full-width buttons
- **Tablet (768-1024px):** 2 columns for history
- **Desktop (>1024px):** 3 columns, full navbar

## 📂 Структура проекта

```
client/
├── app/
│   ├── api/                    # API Routes (Next.js 15)
│   │   ├── fortune/
│   │   │   ├── draft/          # POST - создать draft
│   │   │   ├── update/         # PATCH - обновить draft
│   │   │   └── [mintAddress]/  # GET - получить fortune
│   │   └── cron/
│   │       └── cleanup/        # GET - cleanup old drafts
│   ├── layout.tsx              # Root layout + Header
│   ├── page.tsx                # Главная (Oracle + Mint)
│   ├── history/page.tsx        # История гаданий (NFT collection)
│   ├── test/page.tsx           # Test page (pixel animation)
│   └── globals.css             # Tailwind + кастомные стили
├── components/
│   ├── ui/                     # shadcn компоненты (20+ шт)
│   └── client/
│       ├── Header.tsx          # Header с wallet
│       └── AnimatedBackground.tsx
├── lib/
│   ├── db.ts                   # Prisma client singleton
│   ├── store.ts                # Jotai atoms (state)
│   ├── utils.ts                # Утилиты (cn)
│   ├── WalletProvider.tsx      # Solana Wallet Adapter
│   └── solana/                 # Blockchain integration
│       ├── constants.ts        # Program ID, PDAs
│       ├── instructions.ts     # Borsh serialization
│       ├── oracle.ts           # Oracle state
│       ├── mint.ts             # mintFortuneToken()
│       ├── tokenMetadata.ts    # Parse cards from token
│       └── history.ts          # Fetch user's collection
├── prisma/
│   └── schema.prisma           # Database schema (Fortune model)
├── public/
│   ├── card-back.png           # Card back texture
│   └── mock_imgs/              # Mock card images
├── components.json             # shadcn конфигурация
├── tailwind.config.ts          # Tailwind + cyber colors
├── vercel.json                 # Vercel cron config
├── DATABASE_SETUP.md           # Database setup guide
└── CLAUDE.md                   # Project context for AI
```

## 🎯 Текущий статус

### ✅ Phase 1 - UI & Design (ЗАВЕРШЕНО):

- [x] Next.js 15 setup с TypeScript
- [x] Установлены 20+ UI компонентов (@aceternity + @cult-ui)
- [x] Tailwind настроен с киберпанк палитрой
- [x] Главная страница с анимациями
- [x] Страница истории с responsive layout
- [x] Header с wallet integration
- [x] Mobile-first responsive дизайн

### ✅ Phase 2 - Blockchain Integration (ЗАВЕРШЕНО):

- [x] Solana Wallet Adapter (Phantom, Solflare, Coinbase)
- [x] Vanilla Solana + Token-2022 integration
- [x] mintFortuneToken() с retry logic
- [x] Card reveal анимация (Pixel Dissolve)
- [x] NFT parsing (Token-2022 metadata)
- [x] History page (fetch user's collection)
- [x] IPFS URI extraction from metadata
- [x] Error handling + toast notifications

### ✅ Phase 2.5 - Database & API (ЗАВЕРШЕНО):

- [x] Vercel Postgres + Prisma setup
- [x] Fortune model (draft → mint → interpretation)
- [x] API routes (draft, update, get)
- [x] Controlled loading (7 steps, real-time progress)
- [x] Cron job для cleanup (daily)
- [x] Database integration в mint flow

### ⏳ Phase 3 - AI & Polish (В РАЗРАБОТКЕ):

- [ ] AI interpretation (OpenAI/Claude API)
- [ ] Auto-trigger interpretation после mint
- [ ] Display IPFS card images
- [ ] Share to social media
- [ ] Advanced animations (shuffle, flip)
- [ ] Analytics dashboard

## 🔧 Команды

```bash
# Development
npm run dev          # Запустить dev сервер (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint проверка

# Database (Vercel Postgres + Prisma)
npm run db:push      # Push schema to database
npm run db:studio    # Открыть Prisma Studio (GUI для просмотра БД)

# Добавление новых компонентов
npx shadcn@latest add @aceternity/<component-name>
npx shadcn@latest add @cult-ui/<component-name>
```

## 🗄️ Database Setup

```bash
# 1. Создать Postgres в Vercel Dashboard:
#    Storage → Create Database → Postgres

# 2. Pull env vars locally
vercel link
vercel env pull .env.local

# 3. Push schema
npm run db:push

# 4. View database (GUI)
npm run db:studio
```

**См. `DATABASE_SETUP.md` для детальных инструкций.**

## 📸 Скриншоты

### Главная страница (Mobile)
- Background gradient animation
- Sparkles effect
- Card stack (3 карты)
- "Connect Wallet to Begin" button

### История (Desktop)
- 3-column grid layout
- Minimal cards с 3 картами
- Animated numbers counter

## 🎨 Кастомные CSS классы

```css
.text-glitch          /* Glitch эффект для текста */
.animate-float        /* Floating анимация */
.glow-text            /* Свечение текста */
.glow-border          /* Свечение границ */
```

## 🚀 Деплой

```bash
# Vercel (рекомендуется)
vercel

# Custom domain
devnet.cyberdamus.com -> Vercel project
```

## 🔗 Связанные проекты

- **Smart Contract:** `/cyberdamus_nft` - Solana program
- **Whitepaper:** `/WHITEPAPER.md` - Полная документация

## 📝 Следующие шаги

### Phase 3 (Приоритет):
1. ✅ ~~Setup database~~ → Добавить AI interpretation
2. Интегрировать OpenAI/Claude API для interpretation
3. Display IPFS card images (URIs уже есть)
4. Добавить History page integration с database
5. Social sharing functionality

### Future:
- Analytics dashboard (total fortunes, popular cards)
- Admin panel (manage fortunes, trigger AI)
- WebSocket для real-time updates
- Advanced animations

---

**Current Version:** 0.2.0 (Database Integration Complete)
**Last Updated:** 2025-01-30
**Dev Server:** http://localhost:3000
**Database:** Vercel Postgres (Neon)
**Blockchain:** Solana Devnet
