// backend/src/parsers/pdf-parser.ts
import { readFile } from 'fs/promises';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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

    createTextChunks(result: PDFParseResult): Array<{ content: string; metadata: any }> {
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

        // If no chunks created, warn about image-based PDF
        if (chunks.length === 0) {
            console.warn('⚠️ No text extracted from PDF - this might be an image-based/scanned PDF');
            console.warn('💡 Try converting to DOCX or use text-based PDF instead');
        }

        return chunks;
    }

    private splitTextIntoChunks(text: string, maxSize: number): string[] {
        const chunks: string[] = [];
        const paragraphs = text.split(/\n\s*\n/);

        let currentChunk = '';

        for (const para of paragraphs) {
            if (currentChunk.length + para.length > maxSize && currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += para + '\n\n';
        }

        if (currentChunk) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}

export const pdfParser = new PDFParser();
