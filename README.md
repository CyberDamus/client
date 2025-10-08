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
- **Styling:** Tailwind CSS
- **UI Components:**
  - @aceternity (11 компонентов) - animations, effects
  - @cult-ui (9 компонентов) - buttons, cards, headings
- **Animations:** Framer Motion
- **State:** React Server Components (where possible)

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
│   ├── layout.tsx              # Root layout + Navigation
│   ├── page.tsx                # Главная (Oracle)
│   ├── history/page.tsx        # История гаданий
│   └── globals.css             # Tailwind + кастомные стили
├── components/
│   ├── ui/                     # shadcn компоненты (20 шт)
│   ├── client/
│   │   └── Navigation.tsx      # Floating навигация
│   └── server/                 # Server components (будущее)
├── lib/
│   ├── utils.ts                # Утилиты (cn)
│   └── solana/                 # Solana integration (будущее)
├── public/
│   └── cards/                  # Placeholder изображения
├── components.json             # shadcn конфигурация
├── tailwind.config.ts          # Tailwind + cyber colors
└── next.config.js              # Next.js конфигурация
```

## 🎯 Текущий статус

### ✅ Завершено (Phase 1):

- [x] Next.js 15 setup с TypeScript
- [x] Установлены 20 UI компонентов (@aceternity + @cult-ui)
- [x] Tailwind настроен с киберпанк палитрой
- [x] Главная страница с анимациями
- [x] Страница истории с grid layout
- [x] Floating навигация между страницами
- [x] Mobile-first responsive дизайн
- [x] Dev server работает на localhost:3000

### ⏳ В разработке (Phase 2):

- [ ] Solana Wallet Adapter интеграция
- [ ] Anchor client для mint_fortune_nft()
- [ ] Card reveal анимация
- [ ] NFT parsing (CyberDamus XXYYZZ → [XX, YY, ZZ])
- [ ] IPFS metadata fetch
- [ ] Real-time transaction status

### 📋 Планируется (Phase 3):

- [ ] Fortune interpretation component
- [ ] Error handling + loading states
- [ ] Share to social media
- [ ] Advanced animations (shuffle, flip)
- [ ] WebSocket для real-time updates

## 🔧 Команды

```bash
# Development
npm run dev          # Запустить dev сервер (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint проверка

# Добавление новых компонентов
npx shadcn@latest add @aceternity/<component-name>
npx shadcn@latest add @cult-ui/<component-name>
```

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

1. Интегрировать Solana Wallet Adapter
2. Подключить Anchor client к devnet программе
3. Реализовать mint flow с loading states
4. Добавить card reveal анимации
5. Fetch NFTs из wallet для history страницы

---

**Current Version:** 0.1.0 (MVP)
**Last Updated:** 2025-10-08
**Dev Server:** http://localhost:3000
