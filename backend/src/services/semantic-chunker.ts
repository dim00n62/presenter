// backend/src/services/semantic-chunker.ts

/**
 * Semantic Text Chunker
 * 
 * Разбивает текст на смысловые части (не по страницам):
 * - Preserves paragraph boundaries
 * - Detects topic shifts
 * - Maintains context overlap
 * - Respects sentence boundaries
 */

export interface SemanticChunk {
    content: string;
    metadata: {
        chunkIndex: number;
        wordCount: number;
        charCount: number;
        sentences: number;
        startOffset: number;
        endOffset: number;
        type: 'paragraph' | 'topic_block' | 'sliding_window';
        topics?: string[];  // Основные темы в chunk'е
    };
}

export interface ChunkingOptions {
    strategy: 'paragraph' | 'topic' | 'sliding' | 'hybrid';
    maxChunkSize: number;      // Максимум символов в chunk
    minChunkSize: number;      // Минимум символов (объединяем маленькие)
    overlapSize: number;        // Overlap между chunks для контекста
    preserveSentences: boolean; // Не разрывать предложения
}

const DEFAULT_OPTIONS: ChunkingOptions = {
    strategy: 'hybrid',
    maxChunkSize: 1500,   // ~300 слов
    minChunkSize: 200,    // ~40 слов
    overlapSize: 200,     // ~40 слов overlap
    preserveSentences: true,
};

export class SemanticChunker {

    /**
     * Main chunking method - автоматически выбирает лучшую стратегию
     */
    chunk(text: string, options: Partial<ChunkingOptions> = {}): SemanticChunk[] {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        console.log(`📚 [SemanticChunker] Chunking text (${text.length} chars) with strategy: ${opts.strategy}`);

        // Normalize text
        const normalized = this.normalizeText(text);

        let chunks: SemanticChunk[];

        switch (opts.strategy) {
            case 'paragraph':
                chunks = this.chunkByParagraphs(normalized, opts);
                break;
            case 'topic':
                chunks = this.chunkByTopics(normalized, opts);
                break;
            case 'sliding':
                chunks = this.chunkBySlidingWindow(normalized, opts);
                break;
            case 'hybrid':
            default:
                chunks = this.chunkHybrid(normalized, opts);
        }

        console.log(`✅ [SemanticChunker] Created ${chunks.length} chunks (avg ${Math.round(chunks.reduce((sum, c) => sum + c.metadata.wordCount, 0) / chunks.length)} words/chunk)`);

        return chunks;
    }

    /**
     * СТРАТЕГИЯ 1: По абзацам с объединением
     * Объединяет маленькие абзацы, разбивает большие
     */
    private chunkByParagraphs(text: string, opts: ChunkingOptions): SemanticChunk[] {
        const paragraphs = this.splitIntoParagraphs(text);
        const chunks: SemanticChunk[] = [];

        let currentChunk = '';
        let currentOffset = 0;
        let chunkStartOffset = 0;

        for (const para of paragraphs) {
            const paraWithSpace = para + '\n\n';

            // Если добавление параграфа превысит лимит
            if (currentChunk.length + paraWithSpace.length > opts.maxChunkSize && currentChunk.length > 0) {
                // Сохраняем текущий chunk
                chunks.push(this.createChunk(currentChunk.trim(), chunks.length, chunkStartOffset, 'paragraph'));

                // Начинаем новый с overlap
                const overlap = this.getOverlap(currentChunk, opts.overlapSize);
                currentChunk = overlap + paraWithSpace;
                chunkStartOffset = currentOffset - overlap.length;
            } else {
                // Добавляем к текущему chunk
                currentChunk += paraWithSpace;
            }

            currentOffset += paraWithSpace.length;
        }

        // Добавляем последний chunk
        if (currentChunk.trim().length > 0) {
            chunks.push(this.createChunk(currentChunk.trim(), chunks.length, chunkStartOffset, 'paragraph'));
        }

        // Объединяем слишком маленькие chunks
        return this.mergeSmallChunks(chunks, opts.minChunkSize);
    }

    /**
     * СТРАТЕГИЯ 2: По темам (topic shifts)
     * Определяет смену темы через ключевые слова и связность
     */
    private chunkByTopics(text: string, opts: ChunkingOptions): SemanticChunk[] {
        const sentences = this.splitIntoSentences(text);
        const chunks: SemanticChunk[] = [];

        let currentChunk: string[] = [];
        let currentOffset = 0;
        let chunkStartOffset = 0;

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i];
            const currentText = currentChunk.join(' ');

            // Проверяем topic shift (смену темы)
            const isTopicShift = i > 0 && this.detectTopicShift(
                sentences[i - 1],
                sentence
            );

            // Если тема сменилась И chunk достаточно большой
            if (isTopicShift && currentText.length > opts.minChunkSize) {
                chunks.push(this.createChunk(currentText, chunks.length, chunkStartOffset, 'topic_block'));

                // Новый chunk с overlap
                const overlap = currentChunk.slice(-2).join(' ');  // 2 последних предложения
                currentChunk = overlap ? [overlap, sentence] : [sentence];
                chunkStartOffset = currentOffset - overlap.length;
            }
            // Если chunk слишком большой
            else if (currentText.length + sentence.length > opts.maxChunkSize && currentText.length > 0) {
                chunks.push(this.createChunk(currentText, chunks.length, chunkStartOffset, 'topic_block'));

                const overlap = currentChunk.slice(-1).join(' ');  // 1 последнее предложение
                currentChunk = overlap ? [overlap, sentence] : [sentence];
                chunkStartOffset = currentOffset - overlap.length;
            }
            // Добавляем к текущему
            else {
                currentChunk.push(sentence);
            }

            currentOffset += sentence.length + 1;
        }

        // Последний chunk
        if (currentChunk.length > 0) {
            chunks.push(this.createChunk(currentChunk.join(' '), chunks.length, chunkStartOffset, 'topic_block'));
        }

        return this.mergeSmallChunks(chunks, opts.minChunkSize);
    }

    /**
     * СТРАТЕГИЯ 3: Скользящее окно (для dense текста)
     * Равномерные chunks с overlap
     */
    private chunkBySlidingWindow(text: string, opts: ChunkingOptions): SemanticChunk[] {
        const sentences = this.splitIntoSentences(text);
        const chunks: SemanticChunk[] = [];

        let currentChunk: string[] = [];
        let currentChars = 0;
        let offset = 0;

        for (const sentence of sentences) {
            currentChunk.push(sentence);
            currentChars += sentence.length;

            // Когда достигли нужного размера
            if (currentChars >= opts.maxChunkSize) {
                const chunkText = currentChunk.join(' ');
                chunks.push(this.createChunk(chunkText, chunks.length, offset, 'sliding_window'));

                // Сдвигаем окно с overlap
                const overlapSentences = this.getSentenceOverlap(currentChunk, opts.overlapSize);
                offset += chunkText.length - overlapSentences.join(' ').length;
                currentChunk = overlapSentences;
                currentChars = overlapSentences.join(' ').length;
            }
        }

        // Последний chunk
        if (currentChunk.length > 0) {
            chunks.push(this.createChunk(currentChunk.join(' '), chunks.length, offset, 'sliding_window'));
        }

        return chunks;
    }

    /**
     * СТРАТЕГИЯ 4: Гибридная (РЕКОМЕНДУЕТСЯ)
     * Комбинирует параграфы + topic detection
     */
    private chunkHybrid(text: string, opts: ChunkingOptions): SemanticChunk[] {
        // Сначала разбиваем по параграфам
        const paragraphs = this.splitIntoParagraphs(text);
        const chunks: SemanticChunk[] = [];

        let currentChunk = '';
        let currentSentences: string[] = [];
        let chunkStartOffset = 0;
        let currentOffset = 0;

        for (const para of paragraphs) {
            const paraSentences = this.splitIntoSentences(para);

            for (const sentence of paraSentences) {
                // Topic shift detection
                const isTopicShift = currentSentences.length > 0 &&
                    this.detectTopicShift(
                        currentSentences[currentSentences.length - 1],
                        sentence
                    );

                // Условия для разбиения chunk
                const shouldSplit = (
                    (currentChunk.length + sentence.length > opts.maxChunkSize && currentChunk.length > opts.minChunkSize) ||
                    (isTopicShift && currentChunk.length > opts.minChunkSize)
                );

                if (shouldSplit) {
                    // Сохраняем chunk
                    chunks.push(this.createChunk(currentChunk.trim(), chunks.length, chunkStartOffset, 'topic_block'));

                    // Новый chunk с overlap (1-2 последних предложения)
                    const overlapSentences = currentSentences.slice(-2);
                    const overlap = overlapSentences.join(' ');

                    currentChunk = overlap ? overlap + ' ' + sentence : sentence;
                    currentSentences = overlap ? [...overlapSentences, sentence] : [sentence];
                    chunkStartOffset = currentOffset - overlap.length;
                } else {
                    // Добавляем к текущему
                    currentChunk += (currentChunk ? ' ' : '') + sentence;
                    currentSentences.push(sentence);
                }

                currentOffset += sentence.length + 1;
            }

            // После параграфа добавляем разделение
            currentChunk += '\n\n';
            currentOffset += 2;
        }

        // Последний chunk
        if (currentChunk.trim().length > 0) {
            chunks.push(this.createChunk(currentChunk.trim(), chunks.length, chunkStartOffset, 'topic_block'));
        }

        return this.mergeSmallChunks(chunks, opts.minChunkSize);
    }

    /**
     * УТИЛИТЫ
     */

    private normalizeText(text: string): string {
        return text
            .replace(/\r\n/g, '\n')                    // Windows line breaks
            .replace(/\n{3,}/g, '\n\n')                // Multiple newlines → double
            .replace(/[ \t]+/g, ' ')                   // Multiple spaces → single
            .replace(/\n /g, '\n')                     // Space after newline
            .replace(/ \n/g, '\n')                     // Space before newline
            .trim();
    }

    private splitIntoParagraphs(text: string): string[] {
        return text
            .split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);
    }

    private splitIntoSentences(text: string): string[] {
        // Умное разбиение на предложения (учитывает сокращения)
        return text
            .replace(/([.!?…])\s+([А-ЯA-Z])/g, '$1\n$2')  // Конец предложения
            .replace(/([.!?…])$/g, '$1\n')                 // Конец текста
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    private detectTopicShift(prevSentence: string, currSentence: string): boolean {
        // Topic shift indicators
        const indicators = [
            /^(Однако|Тем не менее|В то же время|С другой стороны)/i,  // Контраст
            /^(Далее|Затем|После этого|Следующий)/i,                    // Переход
            /^(Важно|Необходимо|Следует|Стоит отметить)/i,             // Акцент
            /^(В частности|Например|В том числе)/i,                     // Детализация
        ];

        // Проверяем индикаторы смены темы
        for (const pattern of indicators) {
            if (pattern.test(currSentence)) {
                return true;
            }
        }

        // Проверяем резкое изменение ключевых слов
        const prevWords = this.extractKeywords(prevSentence);
        const currWords = this.extractKeywords(currSentence);

        // Если нет общих ключевых слов - возможна смена темы
        const commonWords = prevWords.filter(w => currWords.includes(w));
        const similarity = commonWords.length / Math.max(prevWords.length, currWords.length);

        return similarity < 0.2;  // Меньше 20% общих слов
    }

    private extractKeywords(sentence: string): string[] {
        // Извлекаем значимые слова (не стоп-слова)
        const stopWords = new Set([
            'и', 'в', 'на', 'с', 'по', 'для', 'к', 'из', 'от', 'о', 'об',
            'это', 'как', 'что', 'который', 'быть', 'весь', 'этот', 'наш',
            'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was'
        ]);

        return sentence
            .toLowerCase()
            .split(/\W+/)
            .filter(word => word.length > 3 && !stopWords.has(word));
    }

    private getOverlap(text: string, overlapSize: number): string {
        if (text.length <= overlapSize) return text;

        // Ищем границу предложения в последних overlapSize символах
        const tail = text.slice(-overlapSize);
        const sentenceEnd = tail.lastIndexOf('. ');

        if (sentenceEnd !== -1) {
            return tail.slice(sentenceEnd + 2);
        }

        return tail;
    }

    private getSentenceOverlap(sentences: string[], overlapSize: number): string[] {
        let overlap: string[] = [];
        let size = 0;

        for (let i = sentences.length - 1; i >= 0; i--) {
            overlap.unshift(sentences[i]);
            size += sentences[i].length;

            if (size >= overlapSize) break;
        }

        return overlap;
    }

    private mergeSmallChunks(chunks: SemanticChunk[], minSize: number): SemanticChunk[] {
        const merged: SemanticChunk[] = [];

        for (const chunk of chunks) {
            if (merged.length === 0) {
                merged.push(chunk);
                continue;
            }

            const lastChunk = merged[merged.length - 1];

            // Если последний chunk слишком маленький, объединяем
            if (lastChunk.metadata.charCount < minSize) {
                lastChunk.content += '\n\n' + chunk.content;
                lastChunk.metadata.charCount += chunk.metadata.charCount;
                lastChunk.metadata.wordCount += chunk.metadata.wordCount;
                lastChunk.metadata.sentences += chunk.metadata.sentences;
                lastChunk.metadata.endOffset = chunk.metadata.endOffset;
            } else {
                merged.push(chunk);
            }
        }

        // Re-index
        merged.forEach((chunk, index) => {
            chunk.metadata.chunkIndex = index;
        });

        return merged;
    }

    private createChunk(
        content: string,
        index: number,
        startOffset: number,
        type: SemanticChunk['metadata']['type']
    ): SemanticChunk {
        const sentences = this.splitIntoSentences(content);

        return {
            content,
            metadata: {
                chunkIndex: index,
                wordCount: content.split(/\s+/).length,
                charCount: content.length,
                sentences: sentences.length,
                startOffset,
                endOffset: startOffset + content.length,
                type,
                topics: this.extractKeywords(content).slice(0, 5),  // Top 5 keywords
            }
        };
    }
}

export const semanticChunker = new SemanticChunker();
