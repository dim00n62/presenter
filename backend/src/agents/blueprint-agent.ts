// backend/src/agents/blueprint-agent.ts
import { qwenClient } from '../services/qwen-client.js';
import { ragService } from '../services/rag-service.js';
import { db } from '../db/index.js';
import { AnalysisResult } from '../types/workflow.js';

const BLUEPRINT_SYSTEM_PROMPT = `# РОЛЬ
Вы - архитектор презентаций для корпоративного банковского IT.
Ваша задача: создать оптимальную структуру слайдов на основе результатов анализа документов.

# ВАЖНО
- ВСЕ ответы и названия НА РУССКОМ ЯЗЫКЕ
- Названия полей JSON на английском (для совместимости)
- Создавайте практичную, логичную структуру презентации

# ПРИНЦИПЫ ПОСТРОЕНИЯ ПРЕЗЕНТАЦИЙ

## 1. СТОРИТЕЛЛИНГ
Каждая презентация должна рассказывать историю:
- **Контекст**: Где мы сейчас?
- **Проблема/Цель**: Что нужно решить/достичь?
- **Решение**: Как мы это делаем?
- **Результаты/План**: Что получаем?

## 2. ПРАВИЛО ПИРАМИДЫ
- Начинайте с главного (Executive Summary)
- Затем детализируйте по секциям
- Заканчивайте выводами и следующими шагами

## 3. ТИПЫ СЛАЙДОВ

### Title Slides
- 'title': Титульный слайд (только 1!)
- 'section_divider': Разделитель секций

### Content Slides
- 'bullet_points': Списки, ключевые пункты
- 'two_column': Сравнение, до/после
- 'table': Табличные данные
- 'chart': Графики и диаграммы
- 'architecture': Архитектурные схемы
- 'timeline': Временные линии, roadmap
- 'risks_matrix': Матрица рисков
- 'summary': Обобщающий слайд

## 4. АДАПТАЦИЯ К АУДИТОРИИ

### Executive Summary (C-level)
- Акцент на бизнес-ценность
- Минимум технических деталей
- Много визуализаций
- 8-12 слайдов

### Technical Deep Dive (Tech leads, архитекторы)
- Детальные технические решения
- Архитектурные диаграммы
- Код/конфигурации (если релевантно)
- 20-30 слайдов

### Status Report (Project managers, команда)
- Фокус на прогресс и метрики
- Временные линии
- Risks and issues
- 12-18 слайдов

### Architecture Review (Архитектурный комитет)
- Детальная архитектура
- Обоснование решений
- Альтернативы и trade-offs
- 15-25 слайдов

# ОБЯЗАТЕЛЬНЫЕ СЛАЙДЫ (ЕСЛИ РЕЛЕВАНТНО)
- "Ключевые выводы анализа"
- "Что может пойти не так"
- "Какие решения требуется принять"
- "Что будет, если ничего не делать"

## 5. DATA-DRIVEN ПОДХОД
Для каждого слайда определите:
- **dataSources**: Какие фрагменты документов использовать
- **visualizationType**: Как лучше представить данные
- **priority**: Насколько критичен этот слайд

# ФОРМАТ ВЫВОДА

{
  "metadata": {
    "presentationType": "тип из рекомендаций анализа",
    "targetAudience": ["C-level", "Tech leads", "Project team"],
    "estimatedDuration": "время в минутах",
    "theme": "corporate" | "technical" | "executive",
    "language": "ru"
  },
  "slides": [
    {
      "id": "slide-1",
      "order": 1,
      "title": "Название слайда НА РУССКОМ",
      "type": "title | section_divider | bullet_points | two_column | table | chart | architecture | timeline | risks_matrix | summary" | "decision_slide" | "tradeoff_analysis" | "assumptions" | "open_questions",
      "section": "Название секции",
      "description": "Краткое описание содержания слайда",
      "dataSources": ["список ID чанков из БД"],
      "visualizationType": "text | bar_chart | pie_chart | line_chart | gantt | architecture_diagram | table | flow_diagram | network_diagram",
      "contentHints": {
        "mainPoints": ["Основной пункт 1", "Основной пункт 2"],
        "suggestedData": "Какие конкретно данные показать",
        "layout": "Предложение по расположению элементов"
      },
      "priority": "critical | high | medium | low",
      "estimatedComplexity": "simple | medium | complex"
    }
  ],
  "structure": {
    "sections": [
      {
        "name": "Введение",
        "slideIds": ["slide-1", "slide-2"],
        "purpose": "Зачем эта секция"
      }
    ]
  },
  "dataUsageStats": {
    "totalChunksAvailable": число,
    "chunksUsed": число,
    "unusedChunkIds": ["список неиспользованных"],
    "coveragePercent": процент
  },
  "validationWarnings": [
    "Предупреждения о недостающих данных или проблемах"
  ]
}

# ШАБЛОНЫ СТРУКТУР

## Technical Deep Dive
1. Титульный слайд
2. Executive Summary (1 слайд)
3. [Секция] Текущая ситуация
   - Существующая архитектура
   - Проблемы и ограничения
4. [Секция] Решение
   - Целевая архитектура
   - Ключевые компоненты
   - Технический стек
5. [Секция] План реализации
   - Roadmap
   - Этапы миграции
   - Риски
6. [Секция] Выводы
   - Следующие шаги
   - Q&A

## Status Report
1. Титульный слайд
2. Краткое резюме (статус проекта)
3. [Секция] Прогресс
   - Выполненные задачи
   - Метрики спринта
4. [Секция] Текущая работа
   - Задачи в процессе
   - Блокеры
5. [Секция] Риски и проблемы
   - Матрица рисков
   - Митигация
6. [Секция] Планы
   - Следующий спринт
   - Roadmap

## Architecture Review
1. Титульный слайд
2. Контекст и цели
3. [Секция] Требования
   - Функциональные
   - Нефункциональные
4. [Секция] Архитектурное решение
   - High-level архитектура
   - Компоненты
   - Интеграции
5. [Секция] Обоснование
   - Альтернативы
   - Trade-offs
   - ADR (Architecture Decision Records)
6. [Секция] Риски и митигация
7. Выводы и следующие шаги

# ВАЖНЫЕ ПРАВИЛА

1. **Минимум слайдов**: Лучше 10 информативных, чем 20 пустых
2. **Один слайд - одна мысль**: Не перегружайте
3. **Данные > Текст**: Если можно показать данными - показывайте
4. **Цитируйте источники**: В dataSources всегда указывайте ID чанков
5. **Проверяйте coverage**: Используйте ≥70% доступных данных
6. **Логическая последовательность**: Каждый слайд должен вытекать из предыдущего

# АДАПТАЦИЯ К АНАЛИЗУ

Используйте результаты анализа:
- **classification.type** → определяет базовый шаблон
- **recommendations.presentationType** → уточняет структуру
- **metrics** → определяет количество слайдов с данными
- **quality.issues** → добавляйте предупреждения
- **recommendations.visualizations** → используйте предложенные типы визуализаций

# ВАЖНОЕ ИЗМЕНЕНИЕ ПОДХОДА

- Не бойтесь делать 20–30 слайдов, если данные это оправдывают
- Лучше несколько слайдов с деталями, чем один поверхностный
- Для сложных тем используйте "slide clusters":
  2–3 слайда подряд по одной теме

Если анализ показывает недостаток данных - создавайте слайд с placeholder и warning.`;

interface BlueprintSlide {
    id: string;
    order: number;
    title: string;
    type: string;
    section: string;
    description: string;
    dataSources: string[];
    visualizationType: string;
    contentHints: {
        mainPoints: string[];
        suggestedData: string;
        layout: string;
    };
    priority: 'critical' | 'high' | 'medium' | 'low';
    estimatedComplexity: 'simple' | 'medium' | 'complex';
}

interface BlueprintResult {
    metadata: {
        presentationType: string;
        targetAudience: string[];
        estimatedDuration: number;
        theme: string;
        language: string;
    };
    slides: BlueprintSlide[];
    structure: {
        sections: Array<{
            name: string;
            slideIds: string[];
            purpose: string;
        }>;
    };
    dataUsageStats: {
        totalChunksAvailable: number;
        chunksUsed: number;
        unusedChunkIds: string[];
        coveragePercent: number;
    };
    validationWarnings: string[];
}

class BlueprintAgent {
    async createBlueprint(
        projectId: string,
        analysis: AnalysisResult,
        userPreferences?: any
    ): Promise<BlueprintResult> {
        console.log(`📐 Создание структуры презентации для проекта ${projectId}`);

        // Step 1: Get all available chunks
        const documents = await db.getDocumentsByProject(projectId);
        const allChunks: any[] = [];
        for (const doc of documents) {
            if (doc.status === 'parsed') {
                const chunks = await db.getChunksByDocument(doc.id);
                allChunks.push(...chunks);
            }
        }

        console.log(`Доступно ${allChunks.length} фрагментов данных`);

        // 🔍 ДИАГНОСТИКА: Проверяем что пришло в analysis
        console.log('📊 Analysis data:', {
            classificationType: analysis.classification?.type,
            recommendationType: analysis.recommendations?.presentationType,
            keyPointsCount: analysis.keyPoints?.length || 0,
            metricsCount: analysis.metrics ? Object.keys(analysis.metrics).length : 0,
            hasRecommendations: !!analysis.recommendations,
            analysisPreview: JSON.stringify(analysis).substring(0, 500)
        });

        // Step 2: Prepare context
        const analysisContext = JSON.stringify(analysis, null, 2);
        const chunksInfo = allChunks.slice(0, 30).map(c => ({
            id: c.id,
            preview: c.content.slice(0, 200),
            source: c.metadata.source
        }));

        const blueprintPrompt = `# РЕЗУЛЬТАТЫ АНАЛИЗА ДОКУМЕНТОВ
${analysisContext}

# ДОСТУПНЫЕ ФРАГМЕНТЫ ДАННЫХ (первые 30)
${JSON.stringify(chunksInfo, null, 2)}

Всего доступно фрагментов: ${allChunks.length}

# ПОЛЬЗОВАТЕЛЬСКИЕ ПРЕДПОЧТЕНИЯ
${userPreferences ? JSON.stringify(userPreferences, null, 2) : 'Не указаны'}

# ВАША ЗАДАЧА
Создайте оптимальную структуру презентации согласно вашему системному промпту.

# ВАЖНО:
1. Все названия слайдов НА РУССКОМ
2. Используйте данные из анализа для определения типа презентации
3. В dataSources указывайте ID реальных чанков из списка
4. Стремитесь к ≥70% coverage данных
5. Адаптируйте количество слайдов к объему данных
6. Добавляйте warnings если данных недостаточно
7. МИНИМУМ 8-12 слайдов для полноценной презентации

# ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ К СТРУКТУРЕ:
- Титульный слайд (1)
- Executive Summary (1-2 слайда)
- Основной контент (минимум 5-7 слайдов)
- Заключение и следующие шаги (1-2 слайда)

ИТОГО: не менее 8 слайдов.`;

        // 🔍 ДИАГНОСТИКА: Логируем промпт
        console.log('📝 Blueprint prompt length:', blueprintPrompt.length);
        console.log('📝 Blueprint prompt preview:', blueprintPrompt.substring(0, 300));

        // Step 3: Generate blueprint
        let blueprint: BlueprintResult;
        try {
            // 🔍 ДИАГНОСТИКА: Засекаем время
            const startTime = Date.now();

            blueprint = await qwenClient.chatJSON<BlueprintResult>(
                [
                    { role: 'system', content: BLUEPRINT_SYSTEM_PROMPT },
                    { role: 'user', content: blueprintPrompt }
                ]
            );

            const duration = Date.now() - startTime;

            // 🔍 ДИАГНОСТИКА: Проверяем что вернул LLM
            console.log('🤖 LLM response received:', {
                duration: `${duration}ms`,
                slidesCount: blueprint.slides?.length || 0,
                hasMetadata: !!blueprint.metadata,
                hasStructure: !!blueprint.structure,
                slideTypes: blueprint.slides?.map(s => s.type) || [],
                slideTitles: blueprint.slides?.map(s => s.title) || []
            });

            // 🔍 ДИАГНОСТИКА: Если слайдов мало - выводим полный ответ
            if (!blueprint.slides || blueprint.slides.length < 5) {
                console.error('⚠️ TOO FEW SLIDES GENERATED!');
                console.error('Full blueprint:', JSON.stringify(blueprint, null, 2));
            }

            // Validate structure
            if (!blueprint.slides || !Array.isArray(blueprint.slides)) {
                throw new Error('Invalid blueprint: missing slides array');
            }

            // Validate chunk IDs
            const validChunkIds = new Set(allChunks.map(c => c.id));
            blueprint.slides.forEach(slide => {
                slide.dataSources = slide.dataSources.filter(id =>
                    validChunkIds.has(id)
                );
            });

            // Calculate actual data usage
            const usedChunkIds = new Set<string>();
            blueprint.slides.forEach(slide => {
                slide.dataSources.forEach(id => usedChunkIds.add(id));
            });

            blueprint.dataUsageStats = {
                totalChunksAvailable: allChunks.length,
                chunksUsed: usedChunkIds.size,
                unusedChunkIds: allChunks
                    .filter(c => !usedChunkIds.has(c.id))
                    .map(c => c.id)
                    .slice(0, 20),
                coveragePercent: Math.round((usedChunkIds.size / allChunks.length) * 100)
            };

            // Add warnings
            if (blueprint.dataUsageStats.coveragePercent < 70) {
                blueprint.validationWarnings.push(
                    `Низкое покрытие данных: ${blueprint.dataUsageStats.coveragePercent}%. Рекомендуется ≥70%`
                );
            }

            if (blueprint.slides.length < 5) {
                blueprint.validationWarnings.push(
                    'Слишком мало слайдов. Рассмотрите возможность добавления деталей.'
                );
                console.warn('⚠️ WARNING: Only', blueprint.slides.length, 'slides generated');
            }

            if (blueprint.slides.length > 30) {
                blueprint.validationWarnings.push(
                    'Много слайдов. Рассмотрите возможность упрощения структуры.'
                );
            }

        } catch (error) {
            console.error('❌ Blueprint generation failed:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            throw new Error(`Не удалось создать структуру: ${error.message}`);
        }

        console.log(`✅ Создано ${blueprint.slides.length} слайдов, покрытие данных: ${blueprint.dataUsageStats.coveragePercent}%`);

        return blueprint;
    }

    async regenerateSlide(
        blueprintId: string,
        slideId: string,
        userFeedback: string
    ): Promise<BlueprintSlide> {
        console.log(`🔄 Регенерация слайда ${slideId} с учетом feedback`);
        // TODO: Implement slide regeneration
        throw new Error('Not implemented yet');
    }
}
export const blueprintAgent = new BlueprintAgent();