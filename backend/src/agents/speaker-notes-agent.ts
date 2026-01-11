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
        slideContent: any,
        blueprintMetadata: any,
        previousSlide?: any,
        nextSlide?: any
    ): Promise<SpeakerNotesResult> {
        console.log(`🎤 Генерация текста для слайда: ${slide.title}`);

        const slideInfo = {
            current: {
                order: slide.order,
                title: slide.title,
                type: slide.type,
                content: slideContent.content,
            },
            previous: previousSlide ? {
                title: previousSlide.title,
            } : null,
            next: nextSlide ? {
                title: nextSlide.title,
            } : null,
            presentation: {
                type: blueprintMetadata.presentationType,
                audience: blueprintMetadata.targetAudience,
            }
        };

        const prompt = `# СЛАЙД ДЛЯ АНАЛИЗА

${JSON.stringify(slideInfo, null, 2)}

# ЗАДАЧА

Создайте текст выступления для этого слайда.

ВАЖНО:
- Плавный переход от предыдущего слайда${previousSlide ? ` "${previousSlide.title}"` : ''}
- Подготовка к следующему${nextSlide ? ` "${nextSlide.title}"` : ''}
- Аудитория: ${blueprintMetadata.targetAudience?.join(', ') || 'профессионалы'}
- Тип: ${blueprintMetadata.presentationType}
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
            console.log(`✅ Текст готов (${result.metadata.wordCount} слов, ${result.speakerNotes.timing.estimated} сек)`);
            return result;

        } catch (error) {
            console.error('Ошибка генерации текста:', error);

            // Fallback: базовый текст
            return this.createFallbackNotes(slide, slideContent);
        }
    }

    private createFallbackNotes(slide: any, slideContent: any): SpeakerNotesResult {
        const bullets = slideContent.content.body?.bullets || [];
        const bodyText = bullets.map((b: any) =>
            typeof b === 'string' ? b : b.main
        ).join('. ');

        return {
            slideId: slide.id,
            speakerNotes: {
                intro: `Теперь давайте рассмотрим ${slide.title.toLowerCase()}.`,
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
                wordCount: bodyText.split(' ').length,
                readingLevel: 'professional',
                confidence: 40,
            }
        };
    }

    async generateForPresentation(
        blueprint: any,
        slideContents: any[]
    ): Promise<SpeakerNotesResult[]> {
        console.log(`🎤 Генерация текста для ${blueprint.slides.length} слайдов`);

        const results: SpeakerNotesResult[] = [];
        const sortedSlides = blueprint.slides.sort((a: any, b: any) => a.order - b.order);

        for (let i = 0; i < sortedSlides.length; i++) {
            const slide = sortedSlides[i];
            const content = slideContents.find(c => c.slideId === slide.id);

            if (!content) {
                console.warn(`⚠️ Контент не найден для слайда ${slide.id}`);
                continue;
            }

            const previousSlide = i > 0 ? sortedSlides[i - 1] : null;
            const nextSlide = i < sortedSlides.length - 1 ? sortedSlides[i + 1] : null;

            const speakerNotes = await this.generateForSlide(
                slide,
                content,
                blueprint.metadata,
                previousSlide,
                nextSlide
            );

            results.push(speakerNotes);

            // Небольшая задержка между запросами
            if (i < sortedSlides.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const totalTime = results.reduce((sum, r) => sum + r.speakerNotes.timing.estimated, 0);
        console.log(`✅ Все тексты готовы. Общее время: ${Math.round(totalTime / 60)} минут`);

        return results;
    }
}

export const speakerNotesAgent = new SpeakerNotesAgent();
