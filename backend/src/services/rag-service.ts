// backend/src/services/rag-service.ts
import { db } from '../db/index.js';
import { qwenClient } from './qwen-client.js';

export interface SearchResult {
    chunkId: string;
    content: string;
    metadata: any;
    similarity: number;
    documentId: string;
}

export class RAGService {
    async search(query: string, topK = 5, projectId?: string): Promise<SearchResult[]> {
        // Get query embedding
        const queryVector = await qwenClient.embedSingle(query);

        // Search similar chunks
        const results = await db.searchSimilarChunks(queryVector, topK * 2); // Get more for filtering

        // Filter by project if specified
        let filtered = results;
        if (projectId) {
            const projectDocs = await db.getDocumentsByProject(projectId);
            const docIds = new Set(projectDocs.map(d => d.id));
            filtered = results.filter(r => docIds.has(r.chunk.documentId));
        }

        // Take topK
        return filtered.slice(0, topK).map(r => ({
            chunkId: r.chunk.id,
            content: r.chunk.content,
            metadata: r.chunk.metadata,
            similarity: r.similarity,
            documentId: r.chunk.documentId,
        }));
    }

    async augmentPrompt(query: string, projectId?: string, topK = 3): Promise<string> {
        const results = await this.search(query, topK, projectId);

        if (results.length === 0) {
            return query;
        }

        const context = results
            .map((r, idx) => {
                const source = r.metadata.source || 'Unknown';
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
    async answerQuestion(question: string, projectId?: string): Promise<{
        answer: string;
        sources: SearchResult[];
    }> {
        const augmentedPrompt = await this.augmentPrompt(question, projectId);
        const sources = await this.search(question, 3, projectId);
        const answer = await qwenClient.chat([
            {
                role: 'user',
                content: augmentedPrompt,
            },
        ]);

        return { answer, sources };
    }
}
export const ragService = new RAGService();
