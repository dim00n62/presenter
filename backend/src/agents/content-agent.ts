// backend/src/agents/content-agent.ts
import { qwenClient } from '../services/qwen-client.js';
import { ragService } from '../services/rag-service.js';
import { db } from '../db/index.js';

const CONTENT_GENERATION_SYSTEM_PROMPT = `# РОЛЬ
Вы - генератор контента для корпоративных презентаций в банковском IT.
Ваша задача: создавать четкий, структурированный, профессиональный контент для слайдов.

# ЯЗЫК: РУССКИЙ
Все тексты должны быть НА РУССКОМ ЯЗЫКЕ.

# ПРИНЦИПЫ НАПИСАНИЯ

## 1. КРАТКОСТЬ И ЯСНОСТЬ
- Один слайд = одна ключевая мысль
- Bullet points: 3-7 пунктов максимум
- Каждый пункт: 1-2 строки
- Избегайте длинных предложений

## 2. КОРПОРАТИВНЫЙ СТИЛЬ
- Профессиональный тон
- Без жаргона (если не технический deep-dive)
- Конкретные данные и метрики
- Активный залог: "Мы внедрили" вместо "Было внедрено"

## 3. СТРУКТУРА КОНТЕНТА ПО ТИПАМ СЛАЙДОВ

### Title Slide
- Название презентации
- Подзаголовок (необязательно)
- Дата
- Автор/команда

### Bullet Points
Каждый bullet должен:
- либо объяснять причину
- либо описывать последствие
- либо подводить к решению

### Two Column
- Левая колонка: заголовок + пункты
- Правая колонка: заголовок + пункты
- Используйте для сравнений (До/После, Плюсы/Минусы)

### Table
- Четкие заголовки столбцов
- Данные из источников
- Выделите ключевые цифры

### Chart
- Заголовок графика
- Описание осей
- Ключевые инсайты (что график показывает)
- Данные для построения графика

### Architecture Diagram
- Заголовок схемы
- Список компонентов с описаниями
- Связи между компонентами
- Легенда (если нужно)

### Timeline/Gantt
- Заголовок
- Этапы с датами
- Ключевые milestone
- Текущий статус

### Risks Matrix
- Заголовок
- Список рисков
- Оценка (вероятность × влияние)
- Планы митигации

### Summary
- Краткие выводы (3-5 пунктов)
- Ключевые достижения/результаты
- Следующие шаги

## 4. ИСПОЛЬЗОВАНИЕ ДАННЫХ
- Всегда указывайте источник: [Источник: filename.xlsx]
- Конкретные цифры лучше округлений
- Даты в формате DD.MM.YYYY
- Валюта: "45 млн руб" или "3.5M USD"

## 5. ВИЗУАЛЬНЫЕ ПОДСКАЗКИ
Используйте поле visualHints для визуальных рекомендаций.
НЕ ДОБАВЛЯЙТЕ специальные маркеры в текст ([HIGHLIGHT], [ICON:...], [COLOR:...])!
Все визуальные подсказки ТОЛЬКО в поле visualHints в JSON.

# ФОРМАТ ВЫВОДА

{
  "slideId": "id слайда",
  "content": {
    "title": "Заголовок слайда",
    "subtitle": "Подзаголовок (если есть)",
    "body": {
      // Для bullet_points:
      "bullets": [
        "Первый пункт",
        "Второй пункт",
        { "main": "Пункт с подпунктами", "sub": ["Подпункт 1", "Подпункт 2"] }
      ],
      
      // Для two_column:
      "leftColumn": {
        "title": "Заголовок левой колонки",
        "content": ["Пункт 1", "Пункт 2"]
      },
      "rightColumn": {
        "title": "Заголовок правой колонки",
        "content": ["Пункт 1", "Пункт 2"]
      },
      
      // Для table:
      "headers": ["Колонка 1", "Колонка 2", "Колонка 3"],
      "rows": [
        ["Данные 1", "Данные 2", "Данные 3"],
        ["Данные 4", "Данные 5", "Данные 6"]
      ],
      
      // Для chart:
      "chartType": "bar|pie|line",
      "data": {
        "labels": ["Метка 1", "Метка 2"],
        "values": [100, 200],
        "unit": "единица измерения"
      },
      "insight": "Ключевой вывод из графика",
      
      // Для architecture:
      "components": [
        { "name": "Компонент 1", "description": "Описание", "type": "database|service|gateway" },
        { "name": "Компонент 2", "description": "Описание", "type": "frontend|backend" }
      ],
      "connections": [
        { "from": "Компонент 1", "to": "Компонент 2", "label": "HTTP API" }
      ],
      
      // Для timeline:
      "milestones": [
        { "date": "2024-01-15", "title": "Этап 1", "status": "completed|in_progress|planned" },
        { "date": "2024-03-20", "title": "Этап 2", "status": "in_progress" }
      ],
      
      // Для risks:
      "risks": [
        { 
          "name": "Название риска", 
          "probability": "low|medium|high", 
          "impact": "low|medium|high",
          "mitigation": "План действий"
        }
      ]
    },
    "footer": "Дополнительная информация внизу слайда (опционально)",
    "sources": ["Список источников данных"],
    "visualHints": {
      "highlights": ["Что выделить"],
      "icons": ["Какие иконки использовать"],
      "colors": ["Цветовые акценты"]
    }
  },
  "metadata": {
    "dataSources": ["ID чанков использованных"],
    "confidence": 0-100,
    "suggestedDuration": "время на слайд в секундах"
  }
}

# ПРИМЕРЫ

## Пример 1: Bullet Points (Техническая миграция)
{
  "slideId": "slide-3",
  "content": {
    "title": "Текущая архитектура базы данных",
    "body": {
      "bullets": [
        "Oracle 11g (EOL с 2020 года)",  // ✅ Без [HIGHLIGHT]
        "2 ТБ данных в production",
        "~5000 транзакций в секунду в пиковые часы",
        {
          "main": "Выявленные проблемы:",
          "sub": [
            "Отсутствие технической поддержки",
            "Уязвимости безопасности (CVE-2019-XXXX)",
            "Низкая производительность на сложных запросах"
          ]
        }
      ]
    },
    "visualHints": {
      "highlights": ["Oracle 11g (EOL с 2020 года)"],
      "icons": ["database", "warning"],
      "colors": ["red для проблем"]
    }
  }
}

## Пример 2: Chart (Метрики разработки)
{
  "slideId": "slide-7",
  "content": {
    "title": "Velocity команды за последние 6 спринтов",
    "body": {
      "chartType": "bar",
      "data": {
        "labels": ["Sprint 15", "Sprint 16", "Sprint 17", "Sprint 18", "Sprint 19", "Sprint 20"],
        "values": [24, 28, 26, 32, 30, 34],
        "unit": "story points"
      },
      "insight": "Стабильный рост производительности: +42% за последние 6 спринтов"  // ✅ Без [HIGHLIGHT]
    },
    "visualHints": {
      "highlights": ["+42%"],
      "colors": ["green для роста"]
    }
  }
}

ПРАВИЛЬНО:
"bullets": ["Oracle 11g EOL", "2 ТБ данных"]

НЕПРАВИЛЬНО:
"bullets": ["Oracle 11g находится вне поддержки с 2020 года, что создаёт регуляторные и ИБ-риски", "2 ТБ данных [ICON: database]"]

# СТИЛЬ НОВОГО УРОВНЯ

- Используйте формулировки уровня senior consultant
- Добавляйте контекст: "Почему", "Что это означает", "К чему приведёт"
- Допускается 5–9 bullet points, если тема сложная
- Используйте причинно-следственные связки

# ВАЖНЫЕ ПРАВИЛА
1. Используйте ТОЛЬКО данные из предоставленных источников
2. Если данных недостаточно - укажите это в metadata.confidence
3. Адаптируйте сложность к аудитории (указано в blueprint)
4. Все числа должны иметь источник
5. Bullet points: конкретика > общие фразы`;

interface SlideContent {
  slideId: string;
  content: {
    title: string;
    subtitle?: string;
    body: any;
    footer?: string;
    sources: string[];
    visualHints?: {
      highlights?: string[];
      icons?: string[];
      colors?: string[];
    };
  };
  metadata: {
    dataSources: string[];
    confidence: number;
    suggestedDuration: number;
  };
}

class ContentAgent {
  async generateSlideContent(
    projectId: string,
    slide: any,
    blueprintMetadata: any
  ): Promise<SlideContent> {
    console.log(`✍️ Генерация контента для слайда: ${slide.title}`);

    // Step 1: Get data sources
    const chunks: any[] = [];
    for (const chunkId of slide.dataSources) {
      await db.db.read();
      const chunk = db.db.data.chunks.find(c => c.id === chunkId);
      if (chunk) chunks.push(chunk);
    }

    if (chunks.length === 0) {
      console.warn(`⚠️ Нет источников данных для слайда ${slide.id}`);
    }

    // Step 2: Prepare context
    const chunkContext = chunks.map((c, idx) => {
      const source = c.metadata.source || 'Неизвестно';
      return `[ИСТОЧНИК ${idx + 1}: ${source}]
${c.content.slice(0, 500)}`;
    }).join('\n\n---\n\n');

    const slideInfo = JSON.stringify({
      id: slide.id,
      title: slide.title,
      type: slide.type,
      description: slide.description,
      visualizationType: slide.visualizationType,
      contentHints: slide.contentHints,
      section: slide.section,
      priority: slide.priority,
    }, null, 2);

    const prompt = `# ИНФОРМАЦИЯ О СЛАЙДЕ

${slideInfo}

# МЕТАДАННЫЕ ПРЕЗЕНТАЦИИ

Тип: ${blueprintMetadata.presentationType}
Аудитория: ${blueprintMetadata.targetAudience?.join(', ')}
Тема: ${blueprintMetadata.theme}

# ДОСТУПНЫЕ ДАННЫЕ

${chunkContext || 'Нет прямых источников данных. Используйте общую информацию из описания слайда.'}

# ВАША ЗАДАЧА

Создайте содержимое для этого слайда согласно вашему системному промпту.

ВАЖНО:
- Следуйте типу слайда (${slide.type})
- Используйте визуализацию (${slide.visualizationType})
- Учитывайте contentHints из blueprint
- ВСЕ тексты на русском
- Цитируйте источники
- Возвращайте ТОЛЬКО JSON`;

    try {
      const content = await qwenClient.chatJSON<SlideContent>(
        [
          { role: 'system', content: CONTENT_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ]
      );

      // Ensure slideId is set
      content.slideId = slide.id;

      // Validate sources
      if (!content.metadata) {
        content.metadata = {
          dataSources: slide.dataSources,
          confidence: chunks.length > 0 ? 80 : 40,
          suggestedDuration: 60,
        };
      }

      console.log(`✅ Контент создан (confidence: ${content.metadata.confidence}%)`);
      return content;

    } catch (error) {
      console.error(`Ошибка генерации контента для слайда ${slide.id}:`, error);

      // Fallback: basic content
      return {
        slideId: slide.id,
        content: {
          title: slide.title,
          body: {
            bullets: [
              slide.description,
              'Контент будет добавлен',
              'Детали в разработке'
            ]
          },
          sources: [],
        },
        metadata: {
          dataSources: slide.dataSources,
          confidence: 20,
          suggestedDuration: 60,
        }
      };
    }
  }

  async generateAllSlides(
    projectId: string,
    blueprint: any
  ): Promise<SlideContent[]> {
    console.log(`📝 Генерация контента для ${blueprint.slides.length} слайдов`);

    const results: SlideContent[] = [];

    // Generate in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < blueprint.slides.length; i += batchSize) {
      const batch = blueprint.slides.slice(i, i + batchSize);

      console.log(`Обработка слайдов ${i + 1}-${Math.min(i + batchSize, blueprint.slides.length)}...`);

      const batchPromises = batch.map(slide =>
        this.generateSlideContent(projectId, slide, blueprint.metadata)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < blueprint.slides.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Контент создан для всех ${results.length} слайдов`);
    return results;
  }
}

export const contentAgent = new ContentAgent();
