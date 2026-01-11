// backend/src/agents/analysis-agent.ts

import { db } from "../db";
import { qwenClient } from "../services/qwen-client";
import { ragService } from "../services/rag-service";
import { AnalysisResult } from "../types/workflow";



class AnalysisAgent {
    private maxChunksPerAnalysis = 15; // Уменьшили с 20 до 15
    private maxContextLength = 8000; // Добавили лимит контекста

    async getRelevantChunks(projectId: string): Promise<any[]> {
        const keyQueries = [
            'проект система архитектура',
            'сроки этап milestone',
            'риски проблемы',
            'команда разработка',
            'метрики производительность'
        ];

        const relevantChunkIds = new Set<string>();

        for (const query of keyQueries) {
            try {
                const results = await ragService.search(query, 3, projectId);
                results.forEach(r => relevantChunkIds.add(r.chunkId));
            } catch (err) {
                console.warn(`RAG search failed for query "${query}":`, err.message);
            }
        }

        // 🔧 ИСПРАВЛЕНИЕ: Получаем полные объекты чанков
        console.log(`🔍 Found ${relevantChunkIds.size} relevant chunk IDs`);

        if (relevantChunkIds.size === 0) {
            console.warn('⚠️ No chunks found by RAG search, loading all chunks');
            // Fallback: загружаем все чанки проекта
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

        // Загружаем полные объекты чанков по ID
        const chunks: any[] = [];
        for (const chunkId of relevantChunkIds) {
            try {
                const chunk = await db.getChunk(chunkId);
                if (chunk && chunk.content) {
                    chunks.push(chunk);
                }
            } catch (err) {
                console.warn(`Failed to load chunk ${chunkId}:`, err.message);
            }
        }

        console.log(`✅ Loaded ${chunks.length} chunk objects`);

        // 🔍 ДИАГНОСТИКА
        if (chunks.length > 0) {
            console.log('📄 First chunk preview:', {
                id: chunks[0].id,
                hasContent: !!chunks[0].content,
                contentLength: chunks[0].content?.length,
                contentPreview: chunks[0].content?.substring(0, 100)
            });
        }

        return chunks.slice(0, this.maxChunksPerAnalysis);
    }

    async analyze(projectId: string, documentIds: string[]): Promise<AnalysisResult> {
        try {
            // Get project details for context
            await db.db.read();
            const project = db.db.data.projects.find((p: any) => p.id === projectId);

            // Get relevant chunks
            const relevantChunks = await this.getRelevantChunks(projectId);

            const ANALYSIS_SYSTEM_PROMPT = `# РОЛЬ
Вы - агент анализа данных для IT-проектов в банковской сфере.
Извлекайте инсайты из Excel/PDF для создания презентаций.

# ЯЗЫК ОТВЕТА: РУССКИЙ
- Все текстовые поля НА РУССКОМ
- JSON поля на английском
- Цитаты источников обязательны

# ПРАВИЛА
1. Не придумывайте данные
2. Помечайте неясности: "Неясно, является ли..."
3. Цитируйте: [Файл: X, Лист: Y]
4. Только валидный JSON

# КОНТЕКСТ
${project?.presentationGoal ? `Цель: ${project.presentationGoal}` : ''}
${project?.targetAudience ? `Аудитория: ${project.targetAudience}` : ''}
${project?.presentationContext ? `Контекст: ${project.presentationContext}` : ''}
Документы могут быть про:
- Инфраструктуру (миграции, архитектура)
- Разработку (API, сервисы, интеграции)
- Безопасность (аудиты, compliance)
- Аналитику (метрики, отчеты)
- Процессы (планы, статусы)
- Бюджеты (только если есть в документе!)

НЕ форсируйте финансы если их нет!

# ТИПИЧНЫЕ ТЕРМИНЫ
- Core Banking: Oracle, SAP, Temenos, АБС
- Инфраструктура: СУБД, ESB, API Gateway
- Безопасность: ИБ, СЗИ, SIEM
- Compliance: 152-ФЗ, GDPR, PCI DSS, СТО БР
- Команды: ЦИТ, ДИТ, Служба безопасности

# JSON СТРУКТУРА
{
  "classification": {
    "type": "technical_specification|status_report|architecture_document|security_audit|development_plan|infrastructure_report|analytics_report|process_documentation|budget_document|meeting_notes|unknown",
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
    "presentationType": "pitch|status_report|architecture_review|security_review|technical_deep_dive|executive_summary",
    "slideCount": {"min": число, "max": число, "recommended": число},
    "mustIncludeSections": [{"name": "текст", "reasoning": "текст", "priority": "critical|high|medium"}],
    "visualizations": [{"type": "gantt_chart|pie_chart|bar_chart|architecture_diagram|flow_diagram|table|network_diagram|sequence_diagram", "title": "текст", "dataSource": "цитата", "reasoning": "текст"}]
  }
}

# АДАПТАЦИЯ
- Разработка → technical метрики
- Безопасность → риски и compliance  
- Статус → timeline и прогресс
- Нет бюджета → budget: null

# ВИЗУАЛИЗАЦИИ ПОД КОНТЕКСТ
- Архитектура → architecture_diagram, network_diagram
- Процессы → flow_diagram, gantt_chart
- Аналитика → bar_chart, pie_chart
- Риски → table, bar_chart

# РЕКОМЕНДАЦИИ СЛАЙДОВ
- Technical deep-dive: 15-25
- Executive summary: 5-10
- Status report: 8-15
- Architecture review: 12-20`;

            // Continue with existing logic...
            const userPrompt = `Проанализируй следующие документы для презентации:

${relevantChunks.map((chunk, i) => `
[Фрагмент ${i + 1}]
${chunk.content}
`).join('\n')}

Помни о ЦЕЛИ презентации: ${project?.presentationGoal || 'не указана'}`;

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

    private async fallbackAnalysis(context: string): Promise<AnalysisResult> {
        console.log('🔄 Запуск упрощенного анализа');

        const simplePrompt = `Краткий анализ документа. Извлеките:
1. Название проекта
2. Тип документа
3. Основные темы

Контекст:
${context.slice(0, 2000)}

Ответ в JSON:
{
  "projectName": "текст или null",
  "type": "тип документа",
  "keywords": ["слово1", "слово2"],
  "mainTopics": ["тема1", "тема2"]
}`;

        try {
            const response = await qwenClient.chatJSON<any>([
                { role: 'user', content: simplePrompt }
            ]);

            return {
                classification: {
                    type: response.type || 'unknown',
                    confidence: 50,
                    keywords: response.keywords || [],
                    reasoning: 'Использован упрощенный анализ'
                },
                entities: {
                    projectName: response.projectName,
                    stakeholders: [],
                    timeline: undefined,
                    budget: undefined,
                },
                metrics: {
                    financial: [],
                    technical: [],
                    risk: [],
                    compliance: [],
                },
                quality: {
                    completeness: 40,
                    consistency: 50,
                    issues: [{
                        type: 'missing_data',
                        severity: 'medium',
                        description: 'Использован упрощенный анализ из-за ошибки'
                    }],
                    gaps: ['Полный анализ недоступен'],
                },
                recommendations: {
                    presentationType: 'status_report',
                    slideCount: { min: 8, max: 12, recommended: 10 },
                    mustIncludeSections: [
                        { name: 'Обзор', reasoning: 'Базовая информация', priority: 'high' }
                    ],
                    visualizations: [],
                },
            };
        } catch (fallbackError) {
            console.error('Fallback failed:', fallbackError);
            throw new Error('Не удалось выполнить даже упрощенный анализ');
        }
    }

    private async verifyAnalysis(
        analysis: AnalysisResult,
        chunks: any[]
    ): Promise<AnalysisResult> {
        console.log('🔍 Верификация результатов');

        // Базовая проверка структуры
        if (!analysis.classification) {
            analysis.classification = {
                type: 'unknown',
                confidence: 0,
                keywords: [],
                reasoning: 'Данные отсутствуют'
            };
        }

        if (!analysis.quality) {
            analysis.quality = {
                completeness: 50,
                consistency: 50,
                issues: [],
                gaps: []
            };
        }

        // Check 1: Budget verification
        if (analysis.entities?.budget?.total) {
            const budgetKeywords = ['бюджет', 'стоимость', 'затрат', 'млн', 'руб'];
            const hasBudgetMention = chunks.some(c =>
                budgetKeywords.some(kw => c.content.toLowerCase().includes(kw))
            );

            if (!hasBudgetMention) {
                analysis.quality.issues.push({
                    type: 'inconsistency',
                    severity: 'high',
                    description: 'Указан бюджет, но упоминаний не найдено',
                    location: 'entities.budget'
                });
            }
        }

        console.log(`Верификация: ${analysis.quality.issues.length} замечаний`);
        return analysis;
    }
}

export const analysisAgent = new AnalysisAgent();
