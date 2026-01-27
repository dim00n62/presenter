// backend/src/parsers/docx-parser.ts

import mammoth from 'mammoth';
import { readFile } from 'fs/promises';
import { semanticChunker, SemanticChunk } from '../services/semantic-chunker.js';

interface DocxParseResult {
    type: 'docx';
    sections: Array<{
        title?: string;
        content: string;
        level: number;
    }>;
    fullText: string;
    metadata: {
        paragraphs: number;
        hasImages: boolean;
    };
}

export class DocxParser {
    async parse(filepath: string): Promise<DocxParseResult> {
        try {
            console.log('📝 Parsing DOCX:', filepath);

            const buffer = await readFile(filepath);

            // Extract text with basic structure
            const result = await mammoth.extractRawText({ buffer });
            const fullText = result.value;

            // Also extract with structure (headings)
            const htmlResult = await mammoth.convertToHtml({ buffer });
            const hasImages = htmlResult.value.includes('<img');

            console.log(`📊 DOCX extracted: ${fullText.length} characters`);

            // Split into sections based on structure
            const sections = this.parseSections(fullText);

            console.log(`✅ DOCX parsed: ${sections.length} sections found`);

            return {
                type: 'docx',
                sections,
                fullText,
                metadata: {
                    paragraphs: sections.length,
                    hasImages
                }
            };

        } catch (error) {
            console.error('DOCX parsing error:', error);
            throw new Error(`Failed to parse DOCX: ${error}`);
        }
    }

    private parseSections(text: string): Array<{ title?: string; content: string; level: number }> {
        const lines = text.split('\n').filter(line => line.trim());
        const sections: Array<{ title?: string; content: string; level: number }> = [];

        let currentSection: { title?: string; content: string; level: number } | null = null;

        for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) continue;

            // Detect headings (simple heuristic: short lines that might be titles)
            const isLikelyHeading = trimmed.length < 100 &&
                !trimmed.endsWith('.') &&
                !trimmed.endsWith(',') &&
                /^[А-ЯA-Z0-9]/.test(trimmed);

            if (isLikelyHeading && (!currentSection || currentSection.content.length > 0)) {
                // Start new section
                if (currentSection) {
                    sections.push(currentSection);
                }

                currentSection = {
                    title: trimmed,
                    content: '',
                    level: 1
                };
            } else if (currentSection) {
                // Add to current section
                currentSection.content += (currentSection.content ? '\n' : '') + trimmed;
            } else {
                // First content without heading
                currentSection = {
                    content: trimmed,
                    level: 0
                };
            }
        }

        // Add last section
        if (currentSection) {
            sections.push(currentSection);
        }

        return sections.length > 0 ? sections : [{
            content: text,
            level: 0
        }];
    }

    /**
     * 🆕 SEMANTIC CHUNKING - умное разбиение с сохранением структуры
     */
    createTextChunks(result: DocxParseResult): Array<{ content: string; metadata: any }> {
        console.log('📚 [DOCX Parser] Creating semantic chunks...');

        // Используем весь текст для semantic chunking
        const fullText = result.fullText;

        if (!fullText || fullText.trim().length === 0) {
            console.warn('⚠️ Empty DOCX document');
            return [];
        }

        // Semantic chunking
        const semanticChunks = semanticChunker.chunk(fullText, {
            strategy: 'hybrid',
            maxChunkSize: 1500,
            minChunkSize: 300,
            overlapSize: 200,
            preserveSentences: true,
        });

        // Обогащаем metadata информацией о секциях
        const chunks = semanticChunks.map((chunk: SemanticChunk) => {
            // Находим к какой секции относится chunk
            const section = this.findSectionForChunk(chunk, result.sections);

            return {
                content: chunk.content,
                metadata: {
                    type: 'semantic_chunk',
                    chunkIndex: chunk.metadata.chunkIndex,
                    wordCount: chunk.metadata.wordCount,
                    sentences: chunk.metadata.sentences,
                    topics: chunk.metadata.topics,
                    chunkingStrategy: chunk.metadata.type,
                    // Дополнительная информация о структуре документа
                    sectionTitle: section?.title,
                    sectionLevel: section?.level,
                }
            };
        });

        console.log(`✅ [DOCX Parser] Created ${chunks.length} semantic chunks (avg ${Math.round(chunks.reduce((sum, c) => sum + c.metadata.wordCount, 0) / chunks.length)} words)`);

        return chunks;
    }

    /**
     * 🔧 LEGACY: Старый метод (по секциям) - оставляем для совместимости
     */
    createSectionBasedChunks(result: DocxParseResult): Array<{ content: string; metadata: any }> {
        console.log('📄 [DOCX Parser] Creating section-based chunks (legacy mode)...');

        const chunks: Array<{ content: string; metadata: any }> = [];

        result.sections.forEach((section, index) => {
            const content = section.title
                ? `${section.title}\n\n${section.content}`
                : section.content;

            if (content.trim()) {
                chunks.push({
                    content: content.trim(),
                    metadata: {
                        type: 'section',
                        sectionIndex: index,
                        title: section.title,
                        level: section.level,
                        wordCount: content.split(/\s+/).length
                    }
                });
            }
        });

        return chunks;
    }

    private findSectionForChunk(
        chunk: SemanticChunk,
        sections: Array<{ title?: string; content: string; level: number }>
    ): { title?: string; level: number } | null {
        // Ищем секцию, которая содержит начало chunk
        const chunkStart = chunk.content.slice(0, 100);

        for (const section of sections) {
            const sectionText = section.title
                ? `${section.title}\n\n${section.content}`
                : section.content;

            if (sectionText.includes(chunkStart)) {
                return {
                    title: section.title,
                    level: section.level,
                };
            }
        }

        return null;
    }
}

export const docxParser = new DocxParser();
