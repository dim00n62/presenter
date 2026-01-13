// backend/src/services/parser-service.ts

import { excelParser } from '../parsers/excel-parser.js';
import { pdfParser } from '../parsers/pdf-parser.js';
import { docxParser } from '../parsers/docx-parser.js';
import { qwenClient } from './qwen-client.js';
import { db } from '../db/index.js';

export class ParserService {
    async processFile(documentId: string, filepath: string, mimeType: string) {
        try {
            await db.updateDocument(documentId, { status: 'parsing' });

            let textChunks: Array<{ content: string; metadata: any }> = [];
            let parsedData: any = null;

            console.log('📄 Processing file type:', mimeType);

            // Parse based on file type
            if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
                console.log('📊 Parsing as Excel...');
                const result = await excelParser.parse(filepath);
                textChunks = excelParser.createTextChunks(result);
                parsedData = result;
            }
            else if (mimeType === 'application/pdf') {
                console.log('📄 Parsing as PDF...');
                const result = await pdfParser.parse(filepath);
                textChunks = pdfParser.createTextChunks(result);
                parsedData = result;
            }
            else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                console.log('📝 Parsing as DOCX...');
                const result = await docxParser.parse(filepath);
                textChunks = docxParser.createTextChunks(result);
                parsedData = result;
            }
            else {
                throw new Error(`Unsupported file type: ${mimeType}. Supported: Excel, PDF, DOCX`);
            }

            if (textChunks.length === 0) {
                throw new Error('No text content extracted from document. If this is a scanned PDF, please convert to DOCX or use text-based PDF.');
            }

            console.log(`✅ Created ${textChunks.length} text chunks`);

            // Save chunks to DB
            const chunks = await db.createChunks(
                textChunks.map((chunk, index) => ({
                    documentId,
                    content: chunk.content,
                    metadata: chunk.metadata,
                    chunkIndex: index,
                }))
            );

            // Create embeddings (batch) с retry и progress
            console.log(`🔢 Creating embeddings for ${chunks.length} chunks...`);

            const texts = chunks.map(c => c.content);

            // Используем batch embedding с прогрессом
            const vectors = await qwenClient.embedBatch(
                texts,
                10, // batch size
                (completed, total) => {
                    const percent = Math.round((completed / total) * 100);
                    console.log(`📈 Embedding progress: ${completed}/${total} (${percent}%)`);
                }
            );

            // Save embeddings
            await Promise.all(chunks.map((chunk, idx) => db.createEmbedding({
                chunkId: chunk.id,
                vector: vectors[idx],
                model: process.env.QWEN_EMBEDDING_MODEL || 'qwen-embedding-v1',
            })
            ));

            // Update document status
            await db.updateDocument(documentId, {
                status: 'parsed',
                parsedAt: new Date().toISOString(),
                parsedData,
            });

            console.log(`✅ Document ${documentId} processed successfully`);

            // Trigger auto-analysis in background (non-blocking)
            this.triggerAutoAnalysis(documentId).catch(err =>
                console.error('Auto-analysis trigger error:', err)
            );

            return { chunks: chunks.length, embeddings: chunks.length };
        } catch (error: any) {
            console.error(`❌ Document processing failed:`, error);
            await db.updateDocument(documentId, {
                status: 'failed',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Trigger auto-analysis after parsing (non-blocking)
     */
    private async triggerAutoAnalysis(documentId: string): Promise<void> {
        try {
            // Import dynamically to avoid circular dependency
            const { autoAnalysisService } = await import('./auto-analysis-service.js');

            const doc = await db.getDocument(documentId);
            if (doc && doc.projectId) {
                console.log(`🚀 Starting auto-analysis for project ${doc.projectId}`);
                await autoAnalysisService.autoAnalyze(documentId, doc.projectId);
            }
        } catch (error) {
            console.error('Auto-analysis failed:', error);
            // Don't throw - this is background process
        }
    }
}

export const parserService = new ParserService();
