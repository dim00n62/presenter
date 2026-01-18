// backend/src/agents/speaker-notes-agent.ts

import { qwenClient } from "../services/qwen-client";

interface SpeakerNotesResult {
    slideId: string;
    speakerNotes: {
        intro: string;
        body: string;
        transition: string;
        keyPoints: string[];
        timing: {
            estimated: number;
            pausePoints: number[];
        };
        tone: string;
        emphasis: Array<{
            text: string;
            reason: string;
        }>;
    };
    metadata: {
        wordCount: number;
        readingLevel: string;
        confidence: number;
    };
}

const SPEAKER_NOTES_SYSTEM_PROMPT = `# РОЛЬ
Вы - профессиональный спичрайтер для корпоративных презентаций.
Создавайте естественный, разговорный текст выступления.

# ПРИНЦИПЫ

1. **СТРУКТУРА** (для каждого слайда):
   - Вступление (5-10 сек): привлечь внимание
   - Основной контент (40-90 сек): объяснить слайд
   - Переход (5 сек): связать со следующим

2. **СТИЛЬ**:
   - Разговорный, но профессиональный
   - Короткие предложения
   - Избегайте жаргона
   - Используйте storytelling

3. **ТАЙМИНГ**:
   - Титульный: 30 сек
   - Контентный: 60-90 сек
   - Графики: 90-120 сек
   - Итоговый: 45 сек

4. **АДАПТАЦИЯ**:
   - C-level: бизнес-ценность, ROI
   - Technical: детали, архитектура
   - Mixed: баланс

# ФОРМАТ ВЫВОДА

{
  "slideId": "id",
  "speakerNotes": {
    "intro": "Вступительная фраза",
    "body": "Основной текст (2-3 абзаца)",
    "transition": "Переход к следующему слайду",
    "keyPoints": ["Пункт 1", "Пункт 2"],
    "timing": {
      "estimated": 75,
      "pausePoints": [15, 45]
    },
    "tone": "confident|enthusiastic|serious|analytical",
    "emphasis": [
      {"text": "важная фраза", "reason": "почему важно"}
    ]
  },
  "metadata": {
    "wordCount": 150,
    "readingLevel": "professional",
    "confidence": 85
  }
}

# ВАЖНО
- ВСЕ на русском языке
- Используйте данные из слайда
- Естественная речь, не "читка по бумажке"
- Smooth переходы между слайдами`;

class SpeakerNotesAgent {
    async generateForSlide(
        slide: any,
        blueprintMetadata: any,
        previousSlide?: any,
        nextSlide?: any
    ): Promise<SpeakerNotesResult> {
        console.log(`🎤 Генерация текста для слайда: ${slide.content?.title || slide.id}`);

        const slideInfo = {
            current: {
                order: slide.order,
                title: slide.content?.title || 'Без названия',
                type: slide.type,
                content: slide.content,
            },
            previous: previousSlide ? {
                title: previousSlide.content?.title || 'Предыдущий слайд',
            } : null,
            next: nextSlide ? {
                title: nextSlide.content?.title || 'Следующий слайд',
            } : null,
            presentation: {
                type: blueprintMetadata?.presentationType || 'business',
                audience: blueprintMetadata?.targetAudience || ['профессионалы'],
            }
        };

        const prompt = `# СЛАЙД ДЛЯ АНАЛИЗА

${JSON.stringify(slideInfo, null, 2)}

# ЗАДАЧА

Создайте текст выступления для этого слайда.

ВАЖНО:
- Плавный переход от предыдущего слайда${previousSlide ? ` "${previousSlide.content?.title}"` : ''}
- Подготовка к следующему${nextSlide ? ` "${nextSlide.content?.title}"` : ''}
- Аудитория: ${blueprintMetadata?.targetAudience?.join(', ') || 'профессионалы'}
- Тип: ${blueprintMetadata?.presentationType || 'business'}
- ВСЕ на русском
- Только JSON в ответе`;

        try {
            const result = await qwenClient.chatJSON<SpeakerNotesResult>(
                [
                    { role: 'system', content: SPEAKER_NOTES_SYSTEM_PROMPT },
                    { role: 'user', content: prompt }
                ]
            );

            result.slideId = slide.id;
            console.log(`✅ Текст готов для слайда ${slide.order}: (${result.metadata.wordCount} слов, ${result.speakerNotes.timing.estimated} сек)`);
            return result;

        } catch (error) {
            console.error(`❌ Ошибка генерации текста для слайда ${slide.order}:`, error);

            // Fallback: базовый текст
            return this.createFallbackNotes(slide);
        }
    }

    private createFallbackNotes(slide: any): SpeakerNotesResult {
        const content = slide.content;
        const bullets = content?.body?.bullets || [];
        const bodyText = bullets.map((b: any) =>
            typeof b === 'string' ? b : b.main
        ).join('. ');

        return {
            slideId: slide.id,
            speakerNotes: {
                intro: `Теперь давайте рассмотрим ${content?.title?.toLowerCase() || 'этот слайд'}.`,
                body: bodyText || 'На этом слайде представлена важная информация по теме.',
                transition: 'Переходим к следующему разделу.',
                keyPoints: bullets.slice(0, 3),
                timing: {
                    estimated: 60,
                    pausePoints: []
                },
                tone: 'professional',
                emphasis: [],
            },
            metadata: {
                wordCount: bodyText.split(' ').length || 20,
                readingLevel: 'professional',
                confidence: 40,
            }
        };
    }

    async generateForPresentation(
        blueprint: any
    ): Promise<SpeakerNotesResult[]> {
        const sortedSlides = blueprint.slides
            .filter((s: any) => s.content)
            .sort((a: any, b: any) => a.order - b.order);

        console.log(`🎤 Генерация текста для ${sortedSlides.length} слайдов (параллельно)...`);
        const startTime = Date.now();

        // 🚀 ПАРАЛЛЕЛЬНАЯ ГЕНЕРАЦИЯ - все слайды одновременно!
        const promises = sortedSlides.map((slide: any, index: number) => {
            const previousSlide = index > 0 ? sortedSlides[index - 1] : null;
            const nextSlide = index < sortedSlides.length - 1 ? sortedSlides[index + 1] : null;

            return this.generateForSlide(
                slide,
                blueprint.metadata,
                previousSlide,
                nextSlide
            );
        });

        // Ждём завершения всех запросов
        const results = await Promise.all(promises);

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        const totalTime = results.reduce((sum, r) => sum + r.speakerNotes.timing.estimated, 0);

        console.log(`✅ Все тексты готовы за ${duration} сек. Общее время презентации: ${Math.round(totalTime / 60)} минут`);

        return results;
    }

    // 🎯 АЛЬТЕРНАТИВА: Батчи для контроля нагрузки
    async generateForPresentationBatched(
        blueprint: any,
        batchSize: number = 5  // Генерируем по 5 слайдов параллельно
    ): Promise<SpeakerNotesResult[]> {
        const sortedSlides = blueprint.slides
            .filter((s: any) => s.content)
            .sort((a: any, b: any) => a.order - b.order);

        console.log(`🎤 Генерация текста для ${sortedSlides.length} слайдов (батчами по ${batchSize})...`);
        const startTime = Date.now();

        const results: SpeakerNotesResult[] = [];

        // Разбиваем на батчи
        for (let i = 0; i < sortedSlides.length; i += batchSize) {
            const batch = sortedSlides.slice(i, i + batchSize);
            console.log(`📦 Батч ${Math.floor(i / batchSize) + 1}/${Math.ceil(sortedSlides.length / batchSize)}: слайды ${i + 1}-${Math.min(i + batchSize, sortedSlides.length)}`);

            const batchPromises = batch.map((slide: any, batchIndex: number) => {
                const globalIndex = i + batchIndex;
                const previousSlide = globalIndex > 0 ? sortedSlides[globalIndex - 1] : null;
                const nextSlide = globalIndex < sortedSlides.length - 1 ? sortedSlides[globalIndex + 1] : null;

                return this.generateForSlide(
                    slide,
                    blueprint.metadata,
                    previousSlide,
                    nextSlide
                );
            });

            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);

            // Небольшая пауза между батчами (опционально)
            if (i + batchSize < sortedSlides.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        const totalTime = results.reduce((sum, r) => sum + r.speakerNotes.timing.estimated, 0);

        console.log(`✅ Все тексты готовы за ${duration} сек. Общее время презентации: ${Math.round(totalTime / 60)} минут`);

        return results;
    }
}

export const speakerNotesAgent = new SpeakerNotesAgent();