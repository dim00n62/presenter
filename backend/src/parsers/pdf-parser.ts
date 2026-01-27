// backend/src/parsers/pdf-parser.ts
import { readFile } from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { semanticChunker, SemanticChunk } from '../services/semantic-chunker.js';

export interface PDFParseResult {
    filename: string;
    text: string;
    metadata: {
        pageCount: number;
        info: any;
    };
    pages: Array<{
        pageNumber: number;
        text: string;
    }>;
}

export class PDFParser {
    async parse(filepath: string): Promise<PDFParseResult> {
        try {
            const buffer = await readFile(filepath);
            const data = new Uint8Array(buffer);

            // Load PDF document
            const loadingTask = pdfjsLib.getDocument({ data });
            const pdfDocument = await loadingTask.promise;

            const numPages = pdfDocument.numPages;
            const pages: Array<{ pageNumber: number; text: string }> = [];
            let fullText = '';

            // Extract text from each page
            for (let i = 1; i <= numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();

                const pageText = textContent.items
                    .map((item: any) => item.str)
                    .join(' ');

                pages.push({
                    pageNumber: i,
                    text: pageText,
                });

                fullText += pageText + '\n\n';
            }

            // Get metadata
            const metadata = await pdfDocument.getMetadata();

            return {
                filename: filepath,
                text: fullText.trim(),
                metadata: {
                    pageCount: numPages,
                    info: metadata.info,
                },
                pages,
            };
        } catch (error) {
            throw new Error(`PDF parsing failed: ${error.message}`);
        }
    }

    /**
     * 🆕 SEMANTIC CHUNKING - разбивает по смыслу, а не по страницам!
     */
    createTextChunks(result: PDFParseResult): Array<{ content: string; metadata: any }> {
        console.log('📚 [PDF Parser] Creating semantic chunks from full text...');

        // Используем ВЕСЬ текст, не разбиваем по страницам
        const fullText = result.text;

        if (!fullText || fullText.trim().length === 0) {
            console.warn('⚠️ No text extracted from PDF - this might be an image-based/scanned PDF');
            console.warn('💡 Try converting to DOCX or use text-based PDF instead');
            return [];
        }

        // Semantic chunking с гибридной стратегией
        const semanticChunks = semanticChunker.chunk(fullText, {
            strategy: 'hybrid',
            maxChunkSize: 1500,   // ~300 слов
            minChunkSize: 300,    // ~60 слов
            overlapSize: 200,     // ~40 слов overlap для контекста
            preserveSentences: true,
        });

        // Конвертируем в формат для analysis agent
        const chunks = semanticChunks.map((chunk: SemanticChunk) => {
            // Определяем примерный page number из offset
            const estimatedPage = this.estimatePageNumber(
                chunk.metadata.startOffset,
                result.text.length,
                result.metadata.pageCount
            );

            return {
                content: chunk.content,
                metadata: {
                    type: 'semantic_chunk',
                    chunkIndex: chunk.metadata.chunkIndex,
                    wordCount: chunk.metadata.wordCount,
                    sentences: chunk.metadata.sentences,
                    estimatedPage,  // Примерная страница (для справки)
                    topics: chunk.metadata.topics,
                    chunkingStrategy: chunk.metadata.type,
                }
            };
        });

        console.log(`✅ [PDF Parser] Created ${chunks.length} semantic chunks (avg ${Math.round(chunks.reduce((sum, c) => sum + c.metadata.wordCount, 0) / chunks.length)} words)`);

        return chunks;
    }

    /**
     * 🔧 LEGACY: Старый метод (по страницам) - оставляем для совместимости
     */
    createPageBasedChunks(result: PDFParseResult): Array<{ content: string; metadata: any }> {
        console.log('📄 [PDF Parser] Creating page-based chunks (legacy mode)...');

        const chunks: Array<{ content: string; metadata: any }> = [];

        result.pages.forEach(page => {
            if (page.text && page.text.trim()) {
                chunks.push({
                    content: page.text.trim(),
                    metadata: {
                        type: 'page',
                        pageNumber: page.pageNumber,
                        wordCount: page.text.split(/\s+/).length
                    }
                });
            }
        });

        if (chunks.length === 0) {
            console.warn('⚠️ No text extracted from PDF');
        }

        return chunks;
    }

    private estimatePageNumber(offset: number, totalLength: number, totalPages: number): number {
        const ratio = offset / totalLength;
        return Math.ceil(ratio * totalPages) || 1;
    }
}

export const pdfParser = new PDFParser();