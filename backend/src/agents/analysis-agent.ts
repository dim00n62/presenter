// backend/src/agents/analysis-agent.ts

import { db } from "../db";
import { qwenClient } from "../services/qwen-client";
import { ragService } from "../services/rag-service";
import { AnalysisResult } from "../types/workflow";

class AnalysisAgent {
    private maxChunksPerAnalysis = 15;

    /**
     * 🆕 Генерирует ключевые запросы на основе ЦЕЛИ презентации
     */
    async generateKeyQueries(project: any): Promise<string[]> {
        console.log('🔍 [Analysis Agent] Generating key queries based on presentation goal...');

        const presentationGoal = project?.presentationGoal;
        const targetAudience = project?.targetAudience;
        const presentationContext = project?.presentationContext;

        // Если нет цели - используем универсальные запросы
        if (!presentationGoal && !presentationContext) {
            console.log('⚠️ No presentation goal - using universal queries');
            return this.getUniversalQueries();
        }

        // Используем AI для генерации релевантных запросов
        const prompt = `# ЗАДАЧА
Сгенерируй 5-7 ключевых поисковых запросов для RAG системы на основе цели презентации.

# КОНТЕКСТ ПРЕЗЕНТАЦИИ
Цель: ${presentationGoal || 'не указана'}
Аудитория: ${targetAudience || 'не указана'}
Контекст: ${presentationContext || 'не указан'}

# ПРАВИЛА
1. Запросы должны покрывать ОСНОВНЫЕ темы презентации
2. Используй 2-4 ключевых слова в запросе
3. Фокусируйся на конкретных аспектах, релевантных цели
4. Включай синонимы и связанные термины
5. НЕ используй общие слова типа "информация", "данные"
6. ВСЕ запросы на РУССКОМ языке

# ПРИМЕРЫ

Цель: "Презентация для инвесторов о финансовых результатах"
Запросы:
- "выручка прибыль доход"
- "рост показатели динамика"
- "инвестиции капитал финансирование"
- "рынок конкуренты доля"
- "прогноз план стратегия"

Цель: "Отчёт о внедрении новой системы безопасности"
Запросы:
- "безопасность защита уязвимости"
- "внедрение миграция развертывание"
- "риски угрозы инциденты"
- "соответствие стандарты compliance"
- "метрики эффективность результаты"

# ФОРМАТ ОТВЕТА
Верни ТОЛЬКО массив строк (JSON):
["запрос 1", "запрос 2", "запрос 3", ...]

НЕ ДОБАВЛЯЙ пояснений, только JSON массив.`;

        try {
            const response = await qwenClient.chat(
                [{ role: 'user', content: prompt }],
                0.3
            );

            // Парсим JSON ответ
            let queries: string[];
            const content = response.trim();

            // Убираем markdown code blocks если есть
            const jsonMatch = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) ||
                content.match(/(\[[\s\S]*?\])/);

            if (jsonMatch) {
                queries = JSON.parse(jsonMatch[1]);
            } else {
                throw new Error('Failed to parse queries JSON');
            }

            console.log(`✅ Generated ${queries.length} dynamic queries:`, queries);
            return queries;

        } catch (error) {
            console.error('❌ Failed to generate dynamic queries:', error);
            console.log('⚠️ Falling back to goal-based queries');
            return this.getGoalBasedQueries(presentationGoal, presentationContext);
        }
    }

    /**
     * 🔧 Fallback: Генерирует запросы на основе ключевых слов в цели
     */
    private getGoalBasedQueries(goal?: string, context?: string): string[] {
        const text = `${goal || ''} ${context || ''}`.toLowerCase();
        const queries: string[] = [];

        // Детектируем тип презентации по ключевым словам
        const detectionPatterns = {
            financial: ['финанс', 'выручк', 'прибыл', 'бюджет', 'инвестиц', 'доход', 'рентабельност'],
            technical: ['архитектур', 'систем', 'разработк', 'api', 'инфраструктур', 'технолог'],
            security: ['безопасност', 'защит', 'риск', 'уязвимост', 'аудит', 'compliance'],
            business: ['стратеги', 'рынок', 'клиент', 'продукт', 'конкурент', 'рост'],
            project: ['проект', 'срок', 'milestone', 'команд', 'план', 'статус'],
            analytics: ['метрик', 'показател', 'анализ', 'данн', 'статистик', 'KPI'],
            product: ['продукт', 'фич', 'запуск', 'функционал', 'MVP', 'пользовател'],
        };

        // Подсчитываем совпадения
        const scores: { [key: string]: number } = {};
        for (const [category, patterns] of Object.entries(detectionPatterns)) {
            scores[category] = patterns.filter(p => text.includes(p)).length;
        }

        // Сортируем категории по релевантности
        const topCategories = Object.entries(scores)
            .filter(([_, score]) => score > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category]) => category);

        console.log('📊 Detected categories:', topCategories);

        // Генерируем запросы для топ категорий
        const categoryQueries: { [key: string]: string[] } = {
            financial: [
                'выручка прибыль доход',
                'финансовые результаты показатели',
                'бюджет инвестиции затраты',
                'ROI эффективность окупаемость'
            ],
            technical: [
                'архитектура система компоненты',
                'разработка технологии стек',
                'API интеграция микросервисы',
                'инфраструктура deployment облако'
            ],
            security: [
                'безопасность защита уязвимости',
                'риски угрозы инциденты',
                'аудит compliance стандарты',
                'шифрование авторизация доступ'
            ],
            business: [
                'стратегия развитие цели',
                'рынок конкуренты позиция',
                'клиенты сегменты потребности',
                'продукт портфель линейка'
            ],
            project: [
                'проект сроки этапы',
                'milestone задачи backlog',
                'команда роли ресурсы',
                'план roadmap график'
            ],
            analytics: [
                'метрики KPI показатели',
                'анализ данные статистика',
                'тренды динамика рост',
                'dashboard отчёты визуализация'
            ],
            product: [
                'продукт функции возможности',
                'запуск релиз внедрение',
                'пользователи feedback отзывы',
                'roadmap развитие планы'
            ],
        };

        // Собираем запросы из топ категорий
        for (const category of topCategories) {
            queries.push(...(categoryQueries[category] || []).slice(0, 2));
        }

        // Если нашли мало запросов - добавляем универсальные
        if (queries.length < 4) {
            queries.push(...this.getUniversalQueries().slice(0, 5 - queries.length));
        }

        return queries.slice(0, 7);
    }

    /**
     * 🔧 Универсальные запросы (когда нет цели)
     */
    private getUniversalQueries(): string[] {
        return [
            'цель задачи решение',
            'результаты показатели метрики',
            'проблемы риски сложности',
            'план этапы roadmap',
            'команда ресурсы компетенции',
            'выводы рекомендации next steps',
        ];
    }

    async getRelevantChunks(projectId: string): Promise<any[]> {
        // Получаем проект для контекста
        await db.db.read();
        const project = db.db.data.projects.find((p: any) => p.id === projectId);

        // Генерируем динамические запросы
        const keyQueries = await this.generateKeyQueries(project);

        console.log(`🔍 [Analysis Agent] Searching with ${keyQueries.length} queries...`);

        // 🆕 ИСПОЛЬЗУЕМ MULTI-QUERY SEARCH
        const relevantChunks = await ragService.multiQuerySearch(keyQueries, {
            topK: this.maxChunksPerAnalysis,  // 15
            similarityThreshold: 0.5,          // 🆕 Минимум 50% схожести
            projectId: projectId,
            debug: true                        // 🆕 Логируем для диагностики
        });

        console.log(`✅ [Analysis Agent] Found ${relevantChunks.length} relevant chunks`);

        if (relevantChunks.length === 0) {
            console.warn('⚠️ No chunks found with threshold 0.5, trying adaptive search...');

            // 🆕 FALLBACK: Adaptive search
            const adaptiveResults = await ragService.adaptiveSearch(keyQueries[0], {
                topK: this.maxChunksPerAnalysis,
                projectId: projectId,
                debug: true
            });

            if (adaptiveResults.length > 0) {
                console.log(`✅ Adaptive search found ${adaptiveResults.length} chunks`);
                return adaptiveResults.map(r => ({
                    id: r.chunkId,
                    content: r.content,
                    metadata: r.metadata,
                    documentId: r.documentId
                }));
            }

            // Last resort: загружаем все чанки
            console.warn('⚠️ Falling back to all chunks');
            const documents = await db.getDocumentsByProject(projectId);
            const allChunks: any[] = [];
            for (const doc of documents) {
                if (doc.status === 'parsed') {
                    const docChunks = await db.getChunksByDocument(doc.id);
                    allChunks.push(...docChunks);
                }
            }
            return allChunks.slice(0, this.maxChunksPerAnalysis);
        }

        // Конвертируем SearchResult в формат chunks
        return relevantChunks.map(r => ({
            id: r.chunkId,
            content: r.content,
            metadata: r.metadata,
            documentId: r.documentId
        }));
    }

    async analyze(projectId: string, documentIds: string[]): Promise<AnalysisResult> {
        try {
            // Get project details for context
            await db.db.read();
            const project = db.db.data.projects.find((p: any) => p.id === projectId);

            // Get relevant chunks with DYNAMIC queries
            const relevantChunks = await this.getRelevantChunks(projectId);

            // 🆕 УЛУЧШЕННЫЙ ПРОМПТ - адаптируется под цель
            const ANALYSIS_SYSTEM_PROMPT = `# РОЛЬ
Вы - агент анализа документов для создания презентаций.
Извлекайте инсайты из документов на основе ЦЕЛИ презентации.

# ЦЕЛЬ ПРЕЗЕНТАЦИИ
${project?.presentationGoal ? `Цель: ${project.presentationGoal}` : 'Цель не указана - сделай общий анализ'}
${project?.targetAudience ? `Аудитория: ${project.targetAudience}` : ''}
${project?.presentationContext ? `Контекст: ${project.presentationContext}` : ''}

# ЯЗЫК ОТВЕТА: РУССКИЙ
- Все текстовые поля НА РУССКОМ
- JSON поля на английском
- Цитаты источников обязательны

# ПРАВИЛА
1. Не придумывайте данные
2. Помечайте неясности: "Неясно, является ли..."
3. Цитируйте: [Документ: X, стр Y] или [Лист: X]
4. Только валидный JSON
5. ФОКУС НА ЦЕЛИ: извлекай информацию релевантную цели презентации

# АДАПТАЦИЯ ПОД ТИП ДОКУМЕНТОВ
Документы могут быть про:
- Финансы (отчёты, бюджеты, инвестиции)
- Технологии (архитектура, разработка, инфраструктура)
- Бизнес (стратегия, продукты, рынок)
- Проекты (планы, статусы, roadmap)
- Безопасность (аудиты, риски, compliance)
- Аналитика (метрики, KPI, отчёты)
- HR (команды, компетенции, процессы)

НЕ форсируйте категории если информации нет!

# JSON СТРУКТУРА
{
  "classification": {
    "type": "financial_report|technical_document|business_plan|project_status|security_audit|analytics_report|hr_document|product_spec|meeting_notes|mixed|unknown",
    "confidence": 0-100,
    "keywords": ["массив"],
    "reasoning": "текст на русском"
  },
  "entities": {
    "projectName": "текст или null",
    "stakeholders": ["массив ролей"],
    "timeline": {
      "start": "YYYY-MM-DD или null",
      "end": "YYYY-MM-DD или null",
      "milestones": [{"name": "текст", "date": "YYYY-MM-DD", "description": "текст"}]
    },
    "budget": {
      "total": число или null,
      "currency": "RUB/USD/EUR или null",
      "breakdown": [{"category": "текст", "amount": число, "source": "цитата"}]
    }
  },
  "metrics": {
    "financial": [{"name": "текст", "value": "текст", "source": "цитата", "confidence": 0-100}],
    "technical": [{"name": "текст", "value": "текст", "source": "цитата", "confidence": 0-100}],
    "business": [{"name": "текст", "value": "текст", "source": "цитата", "confidence": 0-100}],
    "risk": [{"name": "текст", "severity": "low|medium|high|critical", "description": "текст", "mitigation": "текст или null", "source": "цитата"}],
    "compliance": [{"regulation": "текст", "status": "compliant|non_compliant|unclear", "notes": "текст", "source": "цитата"}]
  },
  "quality": {
    "completeness": 0-100,
    "consistency": 0-100,
    "issues": [{"type": "missing_data|inconsistency|ambiguity|format_error", "severity": "low|medium|high", "description": "текст", "location": "текст"}],
    "gaps": ["массив текстов"]
  },
  "recommendations": {
    "presentationType": "investor_pitch|status_report|technical_review|business_review|executive_summary|product_launch|team_update",
    "slideCount": {"min": число, "max": число, "recommended": число},
    "mustIncludeSections": [{"name": "текст", "reasoning": "текст", "priority": "critical|high|medium"}],
    "visualizations": [{"type": "gantt_chart|pie_chart|bar_chart|line_chart|architecture_diagram|flow_diagram|table|network_diagram|funnel|scatter", "title": "текст", "dataSource": "цитата", "reasoning": "текст"}]
  }
}

# РЕКОМЕНДАЦИИ СЛАЙДОВ ПОД ЦЕЛЬ
Адаптируй количество слайдов под цель:
- Executive summary: 5-10 слайдов
- Investor pitch: 10-15 слайдов
- Technical deep-dive: 15-25 слайдов
- Status update: 8-12 слайдов
- Product launch: 12-18 слайдов

# ВИЗУАЛИЗАЦИИ ПОД КОНТЕКСТ
Выбирай визуализации под данные:
- Тренды во времени → line_chart
- Сравнение категорий → bar_chart
- Доли/структура → pie_chart
- Процессы → flow_diagram, gantt_chart
- Архитектура → architecture_diagram, network_diagram
- Воронки конверсии → funnel
- Корреляции → scatter`;

            const userPrompt = `Проанализируй следующие документы для презентации.

ВАЖНО: Фокусируйся на информации, релевантной ЦЕЛИ: ${project?.presentationGoal || 'общий анализ'}

${relevantChunks.map((chunk, i) => `
[Фрагмент ${i + 1}]
${chunk.content}
`).join('\n')}`;

            const response = await qwenClient.chatJSON(
                [
                    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                'Analysis JSON schema'
            );

            return {
                id: crypto.randomUUID(),
                projectId,
                documentIds,
                createdAt: new Date().toISOString(),
                ...response
            };
        } catch (error) {
            console.error('Analysis error:', error);
            throw error;
        }
    }
}

export const analysisAgent = new AnalysisAgent();
