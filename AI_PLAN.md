# План замены MOCK_INTERPRETATIONS на AI модель для Таро

## 🎯 РЕКОМЕНДАЦИЯ: Двухфазный подход

### ФАЗА 1: Быстрый старт (Начнем с этого) ✅

**Модель:** `barissglc/tinyllama-tarot-v1` (1.1B параметров)
- ✅ Готовая к использованию (уже обучена на 5,769 расклада Таро)
- ✅ Open Source (Apache 2.0 лицензия)
- ✅ Минимальные требования (CPU с 4GB RAM)
- ✅ Inference: 1-3 секунды на CPU
- ✅ Формат датасета: 3 карты → интерпретация

**Источники данных:**
- 🔗 Модель: https://huggingface.co/barissglc/tinyllama-tarot-v1
- 🔗 Датасет (для обучения): https://huggingface.co/datasets/barissglc/tarot (5,769 примеров)
- 🔗 Альтернативный датасет: https://huggingface.co/datasets/Dendory/tarot (5,770 примеров)

**Инфраструктура:**
- VPS с 4-8GB RAM (без GPU) - ~$10-20/мес
- Примеры: DigitalOcean ($12/мес), Hetzner CPX21 ($7/мес)
- Ollama для деплоя (самый простой способ)

**Архитектура:**
```
Next.js Client → Node.js API Server → Ollama → TinyLlama-Tarot
                 (lib/api/tarot.ts)     (localhost:11434)
```

**Что сделаем:**
1. Установить Ollama на сервер
2. Конвертировать модель `barissglc/tinyllama-tarot-v1` в GGUF (4-bit квантование)
3. Создать Modelfile для Ollama с промптом для Таро
4. Создать API endpoint `/api/tarot/interpret` (POST)
   - Input: 3 карты + позиции (Past/Present/Future) + query (опционально)
   - Output: интерпретация в стиле CyberDamus
5. Заменить `generateMockInterpretation()` на реальный API вызов
6. Добавить error handling и retry логику
7. Тестирование и оптимизация промпта

**Преимущества:**
- Запустим за 1-2 часа
- Низкие затраты на инфраструктуру
- Сразу увидим качество модели
- Легко заменить модель позже

---

### ФАЗА 2: Апгрейд (Опционально, если захотим улучшить) 🚀

**Модель:** Fine-tuned Qwen2.5-1.5B или Llama 3.2-3B
- 🔥 Современная архитектура (2025)
- 🔥 Выше качество интерпретаций
- 🔥 1.5B конкурирует с 7B моделями по точности
- 🔥 Inference: 2-4 секунды на CPU

**Альтернативные модели (по производительности):**
1. **Qwen2.5-1.5B** - самая быстрая, конкурирует с 7B моделями
2. **Llama 3.2-3B** - баланс скорости и качества
3. **Phi-3 (3.8B)** - лучшая точность в классе 3B
4. **MobileLLaMA-2.7B** - на 40% быстрее TinyLlama

**Процесс:**
1. Fine-tune на Google Colab (бесплатный T4 GPU, 3-6 часов обучения)
2. Использовать датасет `barissglc/tarot` (те же 5,769 примеров)
3. LoRA/QLoRA для эффективного обучения
4. Квантование в 4-bit (GGUF Q4_K_M)
5. Загрузить в Ollama (замена существующей модели)

**Когда делать:**
- После тестирования Фазы 1
- Если текущее качество не устраивает
- Когда будет время на эксперименты

---

## 📋 Детальный план ФАЗЫ 1

### 1. Backend Setup

#### 1.1 Создать серверную структуру
```bash
mkdir -p server/src/{routes,controllers,services}
cd server
npm init -y
npm install express typescript @types/node @types/express cors dotenv ollama
npm install -D nodemon ts-node
```

#### 1.2 Настроить TypeScript
Создать `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true
  }
}
```

#### 1.3 Создать API endpoint
Файл: `server/src/routes/tarot.ts`
```typescript
import express from 'express';
import { interpretTarotReading } from '../controllers/tarotController';

const router = express.Router();
router.post('/interpret', interpretTarotReading);

export default router;
```

Файл: `server/src/controllers/tarotController.ts`
```typescript
import { Request, Response } from 'express';
import { generateTarotInterpretation } from '../services/ollamaService';

export async function interpretTarotReading(req: Request, res: Response) {
  try {
    const { cards, query } = req.body;
    const interpretation = await generateTarotInterpretation(cards, query);
    res.json({ interpretation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate interpretation' });
  }
}
```

Файл: `server/src/services/ollamaService.ts`
```typescript
import ollama from 'ollama';

interface TarotCard {
  id: number;
  inverted: boolean;
}

export async function generateTarotInterpretation(
  cards: TarotCard[],
  query?: string
): Promise<string> {
  const prompt = buildPrompt(cards, query);

  const response = await ollama.chat({
    model: 'cyberdamus-tarot',
    messages: [{ role: 'user', content: prompt }],
    options: {
      temperature: 0.8,
      top_p: 0.9,
    }
  });

  return response.message.content;
}

function buildPrompt(cards: TarotCard[], query?: string): string {
  // TODO: Построить промпт на основе карт
  return `...`;
}
```

---

### 2. Ollama Setup

#### 2.1 Установить Ollama
```bash
# Linux/Mac
curl -fsSL https://ollama.com/install.sh | sh

# Запустить сервис
ollama serve
```

#### 2.2 Конвертировать модель в GGUF

**Вариант A: Использовать HuggingFace Space (ЛЕГКО)**
1. Открыть https://huggingface.co/spaces/ggml-org/gguf-my-repo
2. Ввести: `barissglc/tinyllama-tarot-v1`
3. Выбрать квантование: `Q4_K_M` (4-bit, оптимальный баланс)
4. Скачать GGUF файл

**Вариант B: Конвертировать локально**
```bash
# Клонировать llama.cpp
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Установить зависимости
pip install -r requirements.txt

# Скачать модель
huggingface-cli download barissglc/tinyllama-tarot-v1 --local-dir ./models/tinyllama-tarot

# Конвертировать в GGUF
python convert_hf_to_gguf.py ./models/tinyllama-tarot

# Квантовать в 4-bit
./llama-quantize ./models/tinyllama-tarot/ggml-model-f16.gguf \
                 ./models/tinyllama-tarot/ggml-model-q4_k_m.gguf Q4_K_M
```

#### 2.3 Создать Modelfile

Файл: `Modelfile`
```
FROM ./tinyllama-tarot-q4_k_m.gguf

TEMPLATE """{{ .System }}

User: {{ .Prompt }}
Assistant:"""

SYSTEM """You are CyberDamus, a mystical AI oracle specializing in Tarot readings.
Your interpretations blend ancient wisdom with cyberpunk aesthetics.
You provide insightful, personalized readings based on the cards drawn.

Guidelines:
- Be mystical yet practical
- Use cyberpunk-themed language when appropriate
- Focus on Past, Present, Future structure
- Consider card orientations (upright/inverted)
- Be concise but meaningful (2-3 paragraphs)
- Match the CyberDamus aesthetic and tone"""

PARAMETER temperature 0.8
PARAMETER top_p 0.9
PARAMETER top_k 40
```

#### 2.4 Загрузить модель в Ollama
```bash
ollama create cyberdamus-tarot -f Modelfile
ollama list  # Проверить, что модель загружена
```

#### 2.5 Тестовый запрос
```bash
ollama run cyberdamus-tarot "Give me a tarot reading for cards: The Fool, The Magician, The High Priestess"
```

---

### 3. Client Integration

#### 3.1 Создать API клиент

Файл: `lib/api/tarotClient.ts`
```typescript
interface TarotCard {
  id: number;
  inverted: boolean;
}

interface InterpretationRequest {
  cards: TarotCard[];
  query?: string;
}

interface InterpretationResponse {
  interpretation: string;
}

export async function generateInterpretation(
  cards: TarotCard[],
  query?: string
): Promise<string> {
  const response = await fetch('/api/tarot/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cards, query }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate interpretation');
  }

  const data: InterpretationResponse = await response.json();
  return data.interpretation;
}
```

#### 3.2 Обновить lib/store.ts

Заменить:
```typescript
// СТАРЫЙ КОД (УДАЛИТЬ)
import { MOCK_INTERPRETATIONS } from './mockData'

export function generateMockInterpretation(): string {
  const randomIndex = Math.floor(Math.random() * MOCK_INTERPRETATIONS.length)
  return MOCK_INTERPRETATIONS[randomIndex]
}
```

На:
```typescript
// НОВЫЙ КОД
import { generateInterpretation } from './api/tarotClient'

export async function generateAIInterpretation(
  cards: ParsedCard[],
  query?: string
): Promise<string> {
  try {
    return await generateInterpretation(cards, query);
  } catch (error) {
    console.error('AI interpretation failed:', error);
    // Fallback to mock if AI fails
    return generateFallbackInterpretation();
  }
}

function generateFallbackInterpretation(): string {
  return "The cosmic circuits align mysteriously. Your reading reveals a path through the digital realm...";
}
```

#### 3.3 Обновить lib/solana/mint.ts

В функции `mintFortuneTokenWithRetry`, после успешного минтинга:
```typescript
// БЫЛО:
// const interpretation = generateMockInterpretation()

// СТАЛО:
const interpretation = await generateAIInterpretation(cards, query)
```

#### 3.4 Добавить loading states

В `app/page.tsx`:
```typescript
const [isGeneratingInterpretation, setIsGeneratingInterpretation] = useState(false)

// В handleDrawCards:
setIsGeneratingInterpretation(true)
try {
  const result = await mintFortuneTokenWithRetry(...)
  // ...
} finally {
  setIsGeneratingInterpretation(false)
}
```

---

### 4. Testing & Optimization

#### 4.1 Тестирование
- [ ] Протестировать на 10+ различных комбинациях карт
- [ ] Проверить время ответа (должно быть 1-3 сек)
- [ ] Протестировать с query и без query
- [ ] Протестировать upright и inverted карты
- [ ] Проверить error handling

#### 4.2 Оптимизация промпта
- Настроить SYSTEM промпт для CyberDamus стиля
- Добавить примеры (few-shot learning) если нужно
- Экспериментировать с temperature (0.7-0.9)

#### 4.3 Performance
- Рассмотреть кэширование частых расклада
- Добавить rate limiting для API
- Мониторинг времени ответа

#### 4.4 Error Handling
- Retry логика для сетевых ошибок
- Fallback на mock при сбое AI
- Логирование ошибок
- User-friendly сообщения об ошибках

---

## 💰 Оценка затрат

### Время разработки:
- **Backend Setup**: 1-2 часа
- **Ollama Setup**: 1-2 часа
- **Client Integration**: 1-2 часа
- **Testing & Optimization**: 1-2 часа
- **ИТОГО ФАЗА 1**: 4-8 часов

### Деньги:
- **Фаза 1**: $7-20/мес (VPS CPU-only)
  - Hetzner CPX21: €7.05/мес (4 vCPU, 8GB RAM)
  - DigitalOcean Basic: $12/мес (2 vCPU, 4GB RAM)
  - Contabo VPS M: €8.99/мес (6 vCPU, 16GB RAM)

- **Фаза 2**: $0 (Google Colab бесплатно для обучения) + тот же VPS

### Производительность:
- **TinyLlama 1.1B (4-bit)**:
  - Размер: ~637 MB RAM
  - CPU inference: 1-3 секунды
  - Tokens/sec: 15-30 на CPU (зависит от CPU)

- **Qwen2.5-1.5B (4-bit) [Фаза 2]**:
  - Размер: ~900 MB RAM
  - CPU inference: 2-4 секунды
  - Выше качество при схожей скорости

---

## 🔧 Технические детали

### Системные требования

**Минимум (для Фазы 1):**
- CPU: 2+ cores
- RAM: 4GB (2GB для системы + 637MB для модели + буфер)
- Диск: 5GB
- ОС: Linux (Ubuntu/Debian)

**Рекомендуется:**
- CPU: 4+ cores (современный x86_64)
- RAM: 8GB
- Диск: 10GB SSD
- ОС: Ubuntu 22.04 LTS

**Опционально (для Фазы 2):**
- GPU: 4-8GB VRAM (ускорит inference в 5-10x)
- Например: GTX 1060 6GB, RTX 3060 12GB

### Формат данных модели

**Input (к модели):**
```
System: You are CyberDamus...

User: Give me a tarot reading for these cards:
- Past: The Fool (upright)
- Present: The Magician (inverted)
- Future: The High Priestess (upright)

Query: "What does my career future hold?"