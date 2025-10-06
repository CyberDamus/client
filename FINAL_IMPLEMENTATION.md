# 🔮 CYBERDAMUS TOKEN-2022 - ФИНАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

## 📊 ТЕКУЩИЙ СТАТУС РАЗРАБОТКИ (2025-10-04)

### 🔄 МИГРАЦИЯ: NFT → TOKEN-2022
- **Предыдущая архитектура:** Metaplex NFT (deprecated)
- **Новая архитектура:** Token-2022 с Metadata Extension
- **Причины миграции:**
  - 67% дешевле (0.0057 SOL vs 0.0175 SOL per mint)
  - 100% децентрализация (метаданные on-chain)
  - Полная свобода пользователей (no freeze authority)
  - Единый cards.json для всех токенов (нет дубликатов)
  - Карты видны в имени токена (любой кошелек)

### ✅ VANILLA SOLANA + TOKEN-2022 METADATA EXTENSION (COMPLETED 2025-10-06)
- **Architecture:** Vanilla Solana (no Anchor Framework)
- **Program size:** 123KB (vs 304KB Anchor - экономия 60%)
- **Oracle structure:** ✅ Готова (IPFS hash storage, oracle-v2 seed)
- **Fisher-Yates algorithm:** ✅ Реализован
- **Token-2022 Metadata Extension:** ✅ WORKING on devnet!
  - MetadataPointer Extension ✅
  - Metadata Extension (name, symbol, uri) ✅
  - Additional metadata (fortune_number) ✅
  - All metadata fully on-chain ✅
- **Name encoding:** ✅ Decimal format "CyberDamus #AABBCC" (не HEX!)
- **SystemProgram CPI:** ✅ Fee transfer implemented
- **Devnet deployment:** ✅ Program 2zmR8N51Q7KYZqnzJJWaJkM3wbxwBqj2gimNPf8Ldqu7
- **Oracle PDA:** ✅ Gfmt7QNPu2iGf2Nugirg5hb1v2NnHXY1i1wLfwkUicsb
- **Verified Token:** ✅ AxCsTqRjpFeBibkUUWh7ErCK9LxUUjGsB92JECBUhfy7 (Fortune #4, Cards: [43,33,23])
- **⚠️ CRITICAL:** Localhost test validator НЕ поддерживает CPI reallocation! Тестирование только на devnet/mainnet!

### 🎯 СЛЕДУЮЩИЕ ШАГИ
- [x] ~~Реализовать mint_fortune_token() с Token-2022~~ ✅ DONE
- [x] ~~Написать тесты для Token-2022~~ ✅ DONE (vanilla.test.ts)
- [x] ~~Тестирование на Devnet~~ ✅ DONE (3 tokens minted)
- [ ] **BLOCKER:** Создать 78 Tarot card PNG designs (0.png - 77.png)
- [ ] Загрузить на IPFS и получить real CID
- [ ] Пере-инициализировать Oracle с real IPFS hash
- [ ] Frontend Development (парсинг decimal имени токенов)
- [ ] Mainnet Deployment (upgradeable)

## 📌 КЛЮЧЕВЫЕ РЕШЕНИЯ
✅ **Архитектура:** Token-2022 с Metadata Extension (не NFT!)
✅ **Дизайн карт:** НЕИЗМЕННЫЙ, один навсегда (78 PNG на IPFS)
✅ **Метаданные:** Единый cards.json для ВСЕХ токенов
✅ **Name encoding:** "CyberDamus #AABBCC" (карты видны сразу)
✅ **Freeze authority:** None (полная свобода пользователей)
✅ **Изменяемый параметр:** ТОЛЬКО комиссия (раз в 3-6 месяцев)
✅ **Разработка:** ЛОКАЛЬНО, не в Playground

## 🏗️ АРХИТЕКТУРА

### 1. ORACLE STRUCTURE (без изменений)
```rust
// Единственная структура данных
pub struct Oracle {
    authority: Pubkey,              // 32 bytes - администратор
    treasury: Pubkey,               // 32 bytes - кошелек комиссий
    total_fortunes: u64,            // 8 bytes - счетчик токенов
    ipfs_base_hash: [u8; 46],       // 46 bytes - базовый IPFS хеш
    is_initialized: bool,           // 1 byte - флаг
    reserved: [u8; 5],              // 5 bytes - резерв
    total_size: 132 bytes           // Общий размер (8 discriminator + 124)
}
```

### 2. IPFS СТРУКТУРА (новая)
```
Единая директория на IPFS:
├── cards.json   (ОДИН файл для ВСЕХ токенов)
├── 0.png        (The Fool)
├── 1.png        (The Magician)
├── 2.png        (The High Priestess)
├── ...
└── 77.png       (King of Pentacles)

Базовый хеш: bafybei...
Доступ к картинкам: ipfs://{base_hash}/{card_id}.png
Доступ к метаданным: ipfs://{base_hash}/cards.json
```

### 3. TOKEN-2022 METADATA EXTENSION СТРУКТУРА ✅ РЕАЛИЗОВАНО
```
On-chain хранится (Metadata Extension, ~250 bytes в Mint Account):
- MetadataPointer Extension: Self-referencing (metadata в самом минте)
- name: "CyberDamus #433323"  (пример реального токена)
  где 43, 33, 23 = 2-значные decimal ID карт (00-77)
  Пример: "#433323" = карты [43, 33, 23] (Past, Present, Future)
- symbol: "TAROT"  (visible in Token-2022 compatible tools)
- uri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3o/cards.json"
- additional_metadata: [("fortune_number", "4")]  (порядковый номер)
- mint_authority: Oracle PDA (for minting)
- freeze_authority: Oracle PDA (can be removed for immutability)

cards.json на IPFS (общий для всех токенов):
{
  "image": "ipfs://{CID}/cyberdamus_logo.png",  // Top-level logo для кошельков
  "cards": [
    {"id": 0, "name": "The Fool", "image": "ipfs://{CID}/0.png"},
    {"id": 1, "name": "The Magician", "image": "ipfs://{CID}/1.png"},
    ...
    {"id": 77, "name": "King of Pentacles", "image": "ipfs://{CID}/77.png"}
  ]
}

Компоненты Token-2022:
- Mint Account (~332 bytes):
  - Base Mint (82 bytes)
  - MetadataPointer Extension (~8 bytes)
  - Metadata Extension (~250 bytes) - TLV encoding
- Token Account (ATA, владение пользователя)
- ⚠️ Metadata встроена в Mint Account (не отдельный PDA!)

Техническая реализация:
1. Client создает mint account: space=82 bytes, lamports для ~332 bytes
2. Program инициализирует MetadataPointer (BEFORE mint init!)
3. Program инициализирует Mint (initialize_mint2)
4. Program инициализирует Metadata Extension (CPI reallocation!)
5. Program добавляет fortune_number в additional_metadata

Frontend обработка:
1. Парсинг name: "CyberDamus #433323" → [43, 33, 23]
2. Fetch cards.json по uri
3. Фильтрация: cards.filter(c => [43,33,23].includes(c.id))
4. Отображение: Past (43), Present (33), Future (23)

Verified Example (Devnet):
- Mint: AxCsTqRjpFeBibkUUWh7ErCK9LxUUjGsB92JECBUhfy7
- Name: "CyberDamus #433323"
- Symbol: "TAROT"
- Cards: [43, 33, 23]
- Fortune #: 4
- Explorer: https://explorer.solana.com/address/AxCsTqRjpFeBibkUUWh7ErCK9LxUUjGsB92JECBUhfy7?cluster=devnet
```

## 💰 ЭКОНОМИКА ПРОЕКТА (Vanilla Solana + Token-2022)

### РАЗОВЫЕ ЗАТРАТЫ (при деплое):
- Программа (BPF bytecode): 0.52 SOL ($104)
  - **Vanilla Solana:** 123KB (экономия 60% vs Anchor)
  - Без Metaplex зависимостей: экономия -80KB
  - Без Anchor overhead: экономия -60KB
- Oracle PDA (124 bytes): 0.003 SOL ($0.60)
- **ИТОГО:** 0.523 SOL (~$104.60)

### СТОИМОСТЬ ОДНОГО TOKEN-2022:
- Mint account (Token-2022): 0.002 SOL ($0.40)
- Metadata Extension (~103 bytes): 0.0012 SOL ($0.24)
- Token account: 0.002 SOL ($0.40)
- Transaction fees: 0.0005 SOL ($0.10)
- **ИТОГО:** 0.0057 SOL ($1.14)
- **ЭКОНОМИЯ vs NFT:** 67% (-0.0118 SOL)

### ЦЕНА ДЛЯ ПОЛЬЗОВАТЕЛЯ:
- Комиссия оракула: 0.05 SOL ($10) - ФИКСИРОВАННАЯ
- Покрытие Token-2022: 0.0057 SOL ($1.14)
- Gas fee: 0.0005 SOL ($0.10)
- **ИТОГО:** 0.0562 SOL (~$11.24)
- **ДЕШЕВЛЕ vs NFT:** 17% (-$2.36)

### ПРИБЫЛЬ:
- С каждого токена: 0.0443 SOL (~$8.86) чистыми
- Окупаемость: после **12 токенов** (vs 17 NFT)
- 100 токенов = **3.90 SOL ($780)** (vs 2.73 SOL для NFT)
- 1000 токенов = **43.77 SOL ($8,754)** (vs 31.98 SOL для NFT)
- ROI: **777%** на каждом токене!

## 🔧 ТЕХНИЧЕСКАЯ РЕАЛИЗАЦИЯ

### ФАЗА 1: ПОДГОТОВКА (День 1-2) ✅ ЗАВЕРШЕНА
1. Установка Rust, Solana CLI, Anchor
2. Создание проекта `anchor init cyberdamus_nft`
3. Добавление Token-2022 зависимостей
4. Конфигурация Cargo.toml с оптимизациями

### ФАЗА 2: VANILLA SOLANA + TOKEN-2022 METADATA EXTENSION (День 3-5) ✅ COMPLETED
**Реализованная архитектура:**
```rust
// Только 2 функции! (Vanilla Solana, no Anchor, no Metaplex)
pub fn process_initialize_oracle(ipfs_base_hash: [u8; 46])  // ✅ DONE
pub fn process_mint_fortune_token()                          // ✅ DONE
// УБРАЛИ: upload_cards(), update_fee(), rarity, Anchor, Metaplex
```

**Что реализовано:**
- ✅ Oracle структура (124 bytes, no Anchor discriminator)
- ✅ Oracle PDA seed: "oracle-v2" (избегает конфликта на devnet)
- ✅ Fisher-Yates алгоритм для генерации уникальных карт
- ✅ Decimal encoding: format!("CyberDamus #{:02}{:02}{:02}")
- ✅ Transfer fee to treasury через SystemProgram CPI
- ✅ Client-side Keypair для mint accounts (не PDA)
- ✅ **Token-2022 Metadata Extension ПОЛНОСТЬЮ РЕАЛИЗОВАНО:**
  - ✅ MetadataPointer Extension initialization
  - ✅ Mint initialization (initialize_mint2)
  - ✅ Metadata Extension (name, symbol, uri) via CPI
  - ✅ Additional metadata (fortune_number) via UpdateField
  - ✅ All metadata fully on-chain in Mint account
- ✅ Program size: 123KB (экономия -60% vs Anchor)

**Devnet тестирование:**
- ✅ Deployed: 2zmR8N51Q7KYZqnzJJWaJkM3wbxwBqj2gimNPf8Ldqu7
- ✅ Oracle: Gfmt7QNPu2iGf2Nugirg5hb1v2NnHXY1i1wLfwkUicsb
- ✅ 4 Fortune Tokens заминтено успешно с Metadata Extension
- ✅ Decimal формат проверен (#433323 в реальном токене)
- ✅ Verified example: AxCsTqRjpFeBibkUUWh7ErCK9LxUUjGsB92JECBUhfy7
- ⚠️ **CRITICAL:** Localhost НЕ поддерживает CPI reallocation!

**TypeScript клиент (vanilla-helper.ts):**
- ✅ Oracle PDA derivation с "oracle-v2" seed
- ✅ Client-side mint account creation с pre-funding для metadata
- ✅ Borsh serialization для instruction data
- ✅ SystemProgram.createAccount + mint instruction в одной tx
- ✅ Conservative metadata space (1000 bytes) для безопасности

### ФАЗА 3: NFT МИНТИНГ (День 11-13)
```typescript
// 1. Генерация 3 случайных карт on-chain: [5, 23, 67]
// 2. On-chain создание:
//    - SPL токен (supply=1)
//    - Metadata с Past картой как image
//    - Master Edition Account
//    - Collection verification
// 3. Off-chain (опционально):
//    - Создание metadata JSON
//    - Загрузка JSON на IPFS
//    - Update metadata URI (если нужно)
```

### ФАЗА 4: FRONTEND (День 14-17)
- React приложение
- Подключение кошельков (Phantom, Solflare)
- Визуализация расклада
- История гаданий

### ФАЗА 5: ТЕСТИРОВАНИЕ (День 18-20)
- ✅ Devnet тестирование (100+ минтов)
- ✅ Проверка в Phantom (3 карты в attributes)
- ✅ Тест на Magic Eden (collection отображается)
- ✅ Проверка Master Edition (NFT торгуется)
- ✅ Проверка фиксированной комиссии
- ✅ Security audit (bug bounty)

### ФАЗА 6: MAINNET (День 21-23)
- Деплой как upgradeable program
- Первые 10 тестовых NFT
- Запуск для сообщества
- Мониторинг стабильности

### ФАЗА 7: ФИНАЛИЗАЦИЯ (Через 6-12 месяцев)
- Анализ стабильности программы (минимум 10,000 успешных минтов)
- Команда: `solana program set-upgrade-authority <PROGRAM_ID> --final`
- Программа становится immutable навсегда
- Анонс "CyberDamus Forever" - математическая гарантия неизменности
- Публикация финального аудита безопасности

## 🔒 ГАРАНТИИ И ДОВЕРИЕ

### НЕИЗМЕНЯЕМЫЕ ЭЛЕМЕНТЫ:
✅ Комиссия: 0.05 SOL (hardcoded навсегда)
✅ Дизайн всех 78 карт (навсегда один, pre-loaded на IPFS)
✅ NFT после минта (никто не может изменить)
✅ Алгоритм генерации (Fisher-Yates)
✅ Структура данных (Oracle 132 bytes)
✅ Master Edition (каждый NFT уникален, supply=1)
✅ Collection: "CyberDamus Tarot" / Symbol: "TAROT"

### ФИЛОСОФИЯ БЕЗ ОГРАНИЧЕНИЙ:
❌ НЕТ rate limits (дневных лимитов)
✅ Экономический барьер: 0.068 SOL за гадание
✅ Свобода выбора: пользователь сам решает, сколько гаданий нужно
✅ Нет патерналистских ограничений
✅ Emergency pause только на случай технических атак

### ЭТАПЫ ДОВЕРИЯ:
🔄 **Год 1 (Upgradeable):**
- Исправление критических багов возможно
- Изменения только через upgrade authority
- Все апдейты прозрачны в блокчейне
- Сообщество контролирует через `solana program show`

🔒 **После года (Immutable):**
- Команда: `set-upgrade-authority --final`
- Программа становится неизменяемой НАВСЕГДА
- Математическая гарантия неизменности
- Невозможны никакие модификации

## 📁 СТРУКТУРА ФАЙЛОВ
```
cyberdamus_nft/
├── programs/
│   └── src/
│       ├── lib.rs          # Основной контракт (2 функции)
│       ├── state.rs        # Oracle структура (130 bytes)
│       └── instructions/   # Минтинг и инициализация
├── app/
│   ├── src/               # React frontend
│   └── public/            # Статика
├── tests/                 # Упрощенные тесты
└── scripts/
    ├── deploy.sh          # Upgradeable деплой
    └── setup_ipfs.ts      # Настройка IPFS directory
```

## 🚀 ЭВОЛЮЦИЯ USER FLOW

### MVP Devnet (СЕЙЧАС)
**devnet.cyberdamus.com**
```
Пользователь → Подключить Phantom → Нажать "Получить гадание" → Оплата 0.05 SOL → NFT в кошельке
```
- ✅ Веб-интерфейс (dApp)
- ✅ Вызов функции `mint_fortune_nft()` через Anchor
- ✅ Интеграция возможна (через IDL для разработчиков)
- ❌ Нельзя "просто отправить SOL" на адрес

**Для разработчиков:**
```typescript
await program.methods.mintFortuneNft().rpc();
```

### Mainnet v1.0 (через 1-2 недели)
**cyberdamus.com**
```
То же что devnet, но на реальной сети
```
- ✅ Проверенный код с devnet
- ✅ Настоящие IPFS картинки
- ✅ Upgrade authority = deployer (можем апгрейдить)
- 📚 Документация API для интеграторов (создаем на этом этапе)

### Mainnet v1.1 - UPGRADE (через 1-2 месяца)
**Добавляем "просто отправь SOL"**
```
Пользователь → Отправить 0.05 SOL на адрес → Автоматически получить NFT
```
- ✅ Старые интеграции работают БЕЗ изменений
- ✅ Fallback entrypoint обрабатывает простые переводы
- ✅ Работает из ЛЮБОГО кошелька (Phantom, Solflare, Backpack...)
- ✅ Интеграция в игры, приложения, другие сервисы

**Upgrade через:**
```bash
anchor upgrade target/deploy/cyberdamus_nft.so \
  --program-id 2zmR8N51Q7KYZqnzJJWaJkM3wbxwBqj2gimNPf8Ldqu7
```

### Mainnet v2.0 - IMMUTABLE (через год)
**Навсегда неизменная программа**
```bash
solana program set-upgrade-authority \
  2zmR8N51Q7KYZqnzJJWaJkM3wbxwBqj2gimNPf8Ldqu7 \
  --final
```
- ✅ Полное доверие: код нельзя изменить НИКОГДА
- ✅ Комиссия 0.05 SOL зафиксирована навсегда
- ✅ Гарантия неизменности для всех пользователей

---

## ✅ ЧЕКЛИСТ ЗАПУСКА

### Phase 2: Smart Contract ✅ COMPLETED
- [x] Программа разработана (Anchor 0.31.1)
- [x] Задеплоена на Devnet
  - [x] Program ID: `2zmR8N51Q7KYZqnzJJWaJkM3wbxwBqj2gimNPf8Ldqu7`
  - [x] Size: 304 KB (Anchor version)
  - [x] Deploy cost: 2.17 SOL
- [x] Oracle инициализирован на Devnet
  - [x] PDA: `22qT1BuA8LCXq3faEV3dbxmdmHAxwamTDFvVdsJ4eYxR`
  - [x] Authority/Treasury configured
  - [⚠️] IPFS hash: TEST placeholder (need real assets!)
- [x] Devnet scripts created
  - [x] `scripts/init_oracle_devnet.ts`
  - [x] `scripts/mint_nft_devnet.ts`

### Phase 3: IPFS Assets ⚠️ BLOCKER
- [ ] **CRITICAL:** Create 78 Tarot card designs
  - [ ] 0-21: Major Arcana (22 cards)
  - [ ] 22-35: Minor Arcana - Wands (14 cards)
  - [ ] 36-49: Minor Arcana - Cups (14 cards)
  - [ ] 50-63: Minor Arcana - Swords (14 cards)
  - [ ] 64-77: Minor Arcana - Pentacles (14 cards)
- [ ] Upload directory to IPFS (Pinata/NFT.Storage/web3.storage)
- [ ] Get real CID (base hash)
- [ ] Re-initialize Oracle OR add update function

### Phase 4: Critical Code Fixes (Before Mainnet)
- [ ] Master Edition Account добавлен
- [ ] Collection NFT создается при инициализации
- [ ] Blockhash энтропия исправлена
- [ ] Emergency pause механизм добавлен
- [ ] Metadata URI показывает Past карту

### Phase 5: Devnet Testing (After IPFS Ready)
- [x] Initialize oracle ✅
- [ ] Mint NFT с Master Edition
- [ ] Collection verification
- [ ] 100+ успешных минтов
- [ ] NFT правильно отображается:
  - [ ] В Phantom (Past карта как главное изображение)
  - [ ] Attributes содержат все 3 карты
  - [ ] На Magic Eden (collection "CyberDamus Tarot")
- [ ] Фиксированная комиссия 0.05 SOL работает
- [ ] Anchor → Vanilla Solana migration:
  - [ ] Конвертация кода
  - [ ] Тестирование
  - [ ] Сравнение размеров (200KB → 60-80KB)
- [ ] Frontend готов:
  - [ ] Подключение кошельков
  - [ ] Визуализация 3 карт
  - [ ] История гаданий
- [ ] Security audit пройден
- [ ] Upgradeable деплой на mainnet
- [ ] Первые 10 реальных NFT
- [ ] Анонс: Twitter/Discord/cyberdamus.com
- [ ] (Через год) Переход на immutable

## 🎯 ИТОГОВАЯ ОЦЕНКА
**РЕАЛИЗУЕМОСТЬ: 92%**
- Максимально простая архитектура (2 функции)
- Минимальные риски и сложности
- Оптимизированная стоимость деплоя ($104.60)
- Отличная маржа ($6.50 с NFT, ROI 265%)
- Быстрая окупаемость (17 NFT)
- Путь к полному доверию (immutable)
- Финальная оптимизация: 60-80KB (vanilla Solana)
- Философия свободы без искусственных ограничений
- Collection и Master Edition для полной совместимости с маркетплейсами

## 🚀 СЛЕДУЮЩИЕ ШАГИ (ПРИОРИТЕТ)

### ✅ Завершено (2025-10-02)
- Программа задеплоена на Devnet (Program: `2zmR8N51Q7KYZqnzJJWaJkM3wbxwBqj2gimNPf8Ldqu7`)
- Oracle инициализирован (PDA: `22qT1BuA8LCXq3faEV3dbxmdmHAxwamTDFvVdsJ4eYxR`)
- Devnet скрипты готовы

### ⚠️ Критический Блокер
1. **СОЗДАТЬ 78 TAROT CARD PNG** (0.png - 77.png)
   - Major Arcana: 0-21
   - Wands: 22-35
   - Cups: 36-49
   - Swords: 50-63
   - Pentacles: 64-77

2. **Загрузить на IPFS и получить CID**
   - Pinata / NFT.Storage / web3.storage
   - Получить реальный базовый хеш

3. **Пере-инициализировать Oracle**
   - Либо новый Oracle с реальным хешем
   - Либо добавить `update_ipfs_hash()` функцию

### Следующие Задачи
4. **Исправить критические проблемы кода:**
   - Master Edition Account
   - Blockhash энтропия
   - Collection NFT
   - Metadata URI → Past карта
   - Emergency pause механизм

5. **Devnet тестирование с реальным IPFS** (100+ минтов)

6. **Anchor → Vanilla Solana migration**

7. **Upgradeable деплой на mainnet**

8. **(Через год)** Финализация как immutable программа

---
*Документ создан: 2025-09-18*
*Последнее обновление: 2025-10-06*
*Версия: 1.5 - Token-2022 Metadata Extension WORKING*

**Ключевые изменения v1.5:**
- ✅ **TOKEN-2022 METADATA EXTENSION ПОЛНОСТЬЮ РЕАЛИЗОВАНО:**
  - MetadataPointer Extension ✅
  - Metadata Extension (name, symbol, uri) ✅
  - Additional metadata (fortune_number) ✅
  - All metadata fully on-chain ✅
- ✅ **Verified on devnet:** AxCsTqRjpFeBibkUUWh7ErCK9LxUUjGsB92JECBUhfy7
- ✅ **4 Fortune Tokens** заминтено успешно с полными метаданными
- ⚠️ **CRITICAL DISCOVERY:** Localhost test validator НЕ поддерживает CPI reallocation!
  - Error: "Failed to reallocate account data" (only on localhost)
  - Solution: ВСЕГДА тестировать на devnet/mainnet
- ✅ **Client pre-funding:** Mint account pre-funded with lamports for reallocation
- ✅ **Wallet display note:** Most wallets don't yet support Token-2022 Metadata Extension
  - Show "Unknown Token" - это временное ограничение wallet software
  - Metadata IS fully on-chain and queryable via RPC/Explorer

**Изменения v1.4 (предыдущая версия):**
- ✅ МИГРАЦИЯ: Anchor → Vanilla Solana
- ✅ Program size: 304KB → 123KB (экономия 60%)
- ✅ Oracle PDA seed: "oracle" → "oracle-v2" (devnet conflict fix)
- ✅ Token name format: HEX → Decimal (#4D1725 → #433323)