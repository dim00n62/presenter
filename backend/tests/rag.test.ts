// backend/tests/rag.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/db/index.js';
import { ragService } from '../src/services/rag-service.js';

describe('RAG Service', () => {
    beforeAll(async () => {
        await db.init();
    });

    it('should search similar chunks', async () => {
        const results = await ragService.search('банковский проект', 5);
        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);
    });

    it('should answer questions with sources', async () => {
        const result = await ragService.answerQuestion('Какой бюджет проекта?');
        expect(result.answer).toBeDefined();
        expect(result.sources).toBeDefined();
        expect(Array.isArray(result.sources)).toBe(true);
    });
});