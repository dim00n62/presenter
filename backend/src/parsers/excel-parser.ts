// backend/src/parsers/excel-parser.ts
import XLSX from 'xlsx';
import { readFile } from 'fs/promises';

export interface ExcelSheet {
    name: string;
    data: any[][];
    headers: string[];
    metadata: {
        rowCount: number;
        columnCount: number;
    };
}

export interface ExcelParseResult {
    filename: string;
    sheets: ExcelSheet[];
    metadata: {
        sheetCount: number;
        totalRows: number;
        totalCells: number;
    };
}

export class ExcelParser {
    async parse(filepath: string): Promise<ExcelParseResult> {
        try {
            const buffer = await readFile(filepath);
            const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

            const sheets: ExcelSheet[] = workbook.SheetNames.map(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    raw: false,
                    defval: null
                }) as any[][];

                // Extract headers (first row)
                const headers = data[0]?.map(h => String(h || '')) || [];

                // Get data rows
                const dataRows = data.slice(1);

                return {
                    name: sheetName,
                    data: dataRows,
                    headers,
                    metadata: {
                        rowCount: dataRows.length,
                        columnCount: headers.length,
                    },
                };
            });

            const totalRows = sheets.reduce((sum, s) => sum + s.metadata.rowCount, 0);
            const totalCells = sheets.reduce(
                (sum, s) => sum + s.metadata.rowCount * s.metadata.columnCount,
                0
            );

            return {
                filename: filepath,
                sheets,
                metadata: {
                    sheetCount: sheets.length,
                    totalRows,
                    totalCells,
                },
            };
        } catch (error) {
            throw new Error(`Excel parsing failed: ${error.message}`);
        }
    }

    // Convert to text chunks for embedding
    createTextChunks(parseResult: ExcelParseResult, maxChunkSize = 500): Array<{
        content: string;
        metadata: any;
    }> {
        const chunks: Array<{ content: string; metadata: any }> = [];

        parseResult.sheets.forEach(sheet => {
            // Chunk by rows (group of rows that fit in maxChunkSize)
            let currentChunk: string[] = [];
            let currentSize = 0;
            let startRow = 0;

            sheet.data.forEach((row, rowIndex) => {
                const rowText = row
                    .map((cell, colIndex) => {
                        const header = sheet.headers[colIndex] || `Column${colIndex}`;
                        return cell ? `${header}: ${cell}` : '';
                    })
                    .filter(Boolean)
                    .join(' | ');

                if (currentSize + rowText.length > maxChunkSize && currentChunk.length > 0) {
                    // Save current chunk
                    chunks.push({
                        content: currentChunk.join('\n'),
                        metadata: {
                            source: `${parseResult.filename}/${sheet.name}`,
                            sheet: sheet.name,
                            startRow,
                            endRow: rowIndex - 1,
                        },
                    });

                    currentChunk = [];
                    currentSize = 0;
                    startRow = rowIndex;
                }

                currentChunk.push(rowText);
                currentSize += rowText.length;
            });

            // Save last chunk
            if (currentChunk.length > 0) {
                chunks.push({
                    content: currentChunk.join('\n'),
                    metadata: {
                        source: `${parseResult.filename}/${sheet.name}`,
                        sheet: sheet.name,
                        startRow,
                        endRow: sheet.data.length - 1,
                    },
                });
            }
        });

        return chunks;
    }
}

export const excelParser = new ExcelParser();