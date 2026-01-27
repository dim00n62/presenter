// backend/src/services/rag-service.ts (IMPROVED VERSION)

import { db } from '../db/index.js';
import { qwenClient } from './qwen-client.js';

export interface SearchResult {
    chunkId: string;
    content: string;
    metadata: any;
    similarity: number;
    documentId: string;
}

export interface RAGSearchOptions {
    topK?: number;                  // Сколько результатов вернуть (default: 5)
    similarityThreshold?: number;   // 🆕 Минимальный similarity (default: 0.5)
    projectId?: string;             // Фильтр по проекту
    includeMetadata?: boolean;      // Включать metadata в ответ (default: true)
    debug?: boolean;                // Логировать детали поиска (default: false)
}

const DEFAULT_OPTIONS: Required<RAGSearchOptions> = {
    topK: 5,
    similarityThreshold: 0.5,  // 🆕 По умолчанию 0.5 (50% схожести)
    projectId: '',
    includeMetadata: true,
    debug: false,
};

export class RAGService {

    /**
     * 🆕 Улучшенный поиск с similarity threshold
     */
    async search(query: string, options: RAGSearchOptions = {}): Promise<SearchResult[]> {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        if (opts.debug) {
            console.log('🔍 [RAG Search]', {
                query,
                topK: opts.topK,
                threshold: opts.similarityThreshold,
                projectId: opts.projectId || 'all'
            });
        }

        // Get query embedding
        const queryVector = await qwenClient.embedSingle(query);

        // Search similar chunks (get more than topK for threshold filtering)
        const candidateCount = opts.topK * 3;  // Get 3x more candidates
        const results = await db.searchSimilarChunks(queryVector, candidateCount);

        if (opts.debug) {
            console.log(`📊 [RAG Search] Found ${results.length} candidates`);
        }

        // Filter by project if specified
        let filtered = results;
        if (opts.projectId) {
            const projectDocs = await db.getDocumentsByProject(opts.projectId);
            const docIds = new Set(projectDocs.map(d => d.id));
            filtered = results.filter(r => docIds.has(r.chunk.documentId));

            if (opts.debug) {
                console.log(`📊 [RAG Search] After project filter: ${filtered.length} chunks`);
            }
        }

        // 🆕 FILTER BY SIMILARITY THRESHOLD
        const thresholdFiltered = filtered.filter(r =>
            r.similarity >= opts.similarityThreshold
        );

        if (opts.debug) {
            console.log(`📊 [RAG Search] After threshold (${opts.similarityThreshold}): ${thresholdFiltered.length} chunks`);

            // Log similarity distribution
            const distribution = this.getSimilarityDistribution(filtered);
            console.log('📊 Similarity distribution:', distribution);
        }

        // 🆕 WARNING если мало результатов
        if (thresholdFiltered.length < opts.topK && !opts.debug) {
            console.warn(`⚠️ [RAG Search] Only ${thresholdFiltered.length} chunks above threshold ${opts.similarityThreshold}`);
            console.warn(`💡 Consider lowering threshold or using broader query terms`);
        }

        // Take topK
        const topResults = thresholdFiltered.slice(0, opts.topK);

        if (opts.debug && topResults.length > 0) {
            console.log('🏆 [RAG Search] Top results:');
            topResults.forEach((r, i) => {
                console.log(`  ${i + 1}. Similarity: ${(r.similarity * 100).toFixed(1)}% - ${r.chunk.content.substring(0, 80)}...`);
            });
        }

        return topResults.map(r => ({
            chunkId: r.chunk.id,
            content: r.chunk.content,
            metadata: opts.includeMetadata ? r.chunk.metadata : undefined,
            similarity: r.similarity,
            documentId: r.chunk.documentId,
        }));
    }

    /**
     * 🆕 Adaptive search - автоматически подбирает threshold
     */
    async adaptiveSearch(query: string, options: Omit<RAGSearchOptions, 'similarityThreshold'> = {}): Promise<SearchResult[]> {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        console.log('🧠 [Adaptive Search] Finding optimal threshold...');

        // Пробуем разные thresholds
        const thresholds = [0.7, 0.6, 0.5, 0.4, 0.3];

        for (const threshold of thresholds) {
            const results = await this.search(query, {
                ...opts,
                similarityThreshold: threshold,
                debug: false
            });

            // Если нашли достаточно результатов - используем этот threshold
            if (results.length >= Math.min(opts.topK, 5)) {
                console.log(`✅ [Adaptive Search] Using threshold ${threshold} (found ${results.length} results)`);
                return results;
            }
        }

        // Fallback: самый низкий threshold
        console.warn('⚠️ [Adaptive Search] Using fallback threshold 0.3');
        return this.search(query, { ...opts, similarityThreshold: 0.3 });
    }

    /**
     * 🆕 Multi-query search - объединяет результаты нескольких запросов
     */
    async multiQuerySearch(queries: string[], options: RAGSearchOptions = {}): Promise<SearchResult[]> {
        console.log(`🔍 [Multi-Query Search] Searching ${queries.length} queries...`);

        const allResults: SearchResult[] = [];
        const seenChunkIds = new Set<string>();

        for (const query of queries) {
            const results = await this.search(query, options);

            // Добавляем только уникальные chunks
            for (const result of results) {
                if (!seenChunkIds.has(result.chunkId)) {
                    seenChunkIds.add(result.chunkId);
                    allResults.push(result);
                }
            }
        }

        // Сортируем по similarity и берём topK
        allResults.sort((a, b) => b.similarity - a.similarity);
        const topResults = allResults.slice(0, options.topK || 15);

        console.log(`✅ [Multi-Query Search] Found ${allResults.length} unique chunks, returning top ${topResults.length}`);

        return topResults;
    }

    /**
     * Legacy метод для обратной совместимости
     */
    async searchLegacy(query: string, topK = 5, projectId?: string): Promise<SearchResult[]> {
        return this.search(query, { topK, projectId, similarityThreshold: 0.0 });  // No threshold для совместимости
    }

    async augmentPrompt(query: string, options: RAGSearchOptions = {}): Promise<string> {
        const results = await this.search(query, options);

        if (results.length === 0) {
            return query;
        }

        const context = results
            .map((r, idx) => {
                const source = r.metadata?.source || 'Unknown';
                return `[SOURCE ${idx + 1}: ${source}, Relevance: ${(r.similarity * 100).toFixed(1)}%]\n${r.content}`;
            })
            .join('\n\n---\n\n');

        return `# CONTEXT FROM DOCUMENTS
${context}

---

# USER QUERY
${query}

# INSTRUCTIONS
Answer the query using ONLY information from the provided context. Cite sources using [SOURCE N] notation. If information is not in context, say so explicitly.`;
    }

    async answerQuestion(question: string, options: RAGSearchOptions = {}): Promise<{
        answer: string;
        sources: SearchResult[];
    }> {
        const augmentedPrompt = await this.augmentPrompt(question, options);
        const sources = await this.search(question, { ...options, topK: 3 });
        const answer = await qwenClient.chat([
            {
                role: 'user',
                content: augmentedPrompt,
            },
        ]);

        return { answer, sources };
    }

    /**
     * 🆕 Helper: Анализ распределения similarity
     */
    private getSimilarityDistribution(results: Array<{ similarity: number }>): string {
        const ranges = [
            { min: 0.7, label: 'High (0.7+)' },
            { min: 0.5, label: 'Medium (0.5-0.7)' },
            { min: 0.3, label: 'Low (0.3-0.5)' },
            { min: 0.0, label: 'Very Low (<0.3)' }
        ];

        const counts = ranges.map(range => {
            const count = results.filter(r => {
                if (range.min === 0.7) return r.similarity >= 0.7;
                if (range.min === 0.5) return r.similarity >= 0.5 && r.similarity < 0.7;
                if (range.min === 0.3) return r.similarity >= 0.3 && r.similarity < 0.5;
                return r.similarity < 0.3;
            }).length;

            return `${range.label}: ${count}`;
        });

        return counts.join(', ');
    }
}

export const ragService = new RAGService();
