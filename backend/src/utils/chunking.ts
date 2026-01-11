// backend/src/utils/chunking.ts
export function chunkText(
    text: string,
    maxChunkSize = 1000,
    overlap = 100
): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + maxChunkSize, text.length);
        const chunk = text.slice(start, end);
        chunks.push(chunk);
        start = end - overlap; // Overlap for context
    }

    return chunks;
}

export function estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English
    // For Russian/Chinese: 1 token ≈ 2-3 characters
    return Math.ceil(text.length / 3);
}