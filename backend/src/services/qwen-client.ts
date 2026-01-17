// backend/src/services/qwen-client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';

interface QwenChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface QwenChatResponse {
    id: string;
    choices: Array<{
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

interface QwenEmbeddingResponse {
    data: Array<{
        embedding: number[];
        index: number;
    }>;
    usage: {
        total_tokens: number;
    };
}

interface RetryConfig {
    maxRetries: number;
    initialDelay: number; // milliseconds
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: string[]; // HTTP status codes or error messages
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    backoffMultiplier: 2,
    retryableErrors: [
        '429', // Too Many Requests
        '500', // Internal Server Error
        '502', // Bad Gateway
        '503', // Service Unavailable
        '504', // Gateway Timeout
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
    ],
};

export class QwenClient {
    private client: AxiosInstance;
    private model: string;
    private embeddingModel: string;
    private retryConfig: RetryConfig;

    constructor(retryConfig?: Partial<RetryConfig>) {
        this.client = axios.create({
            baseURL: process.env.QWEN_API_URL,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
            },
            timeout: 120000, // 2 minutes
        });

        this.model = process.env.QWEN_MODEL || 'qwen-72b-chat';
        this.embeddingModel = process.env.QWEN_EMBEDDING_MODEL || 'qwen-embedding-v1';
        this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Calculate delay with exponential backoff
     */
    private calculateDelay(attempt: number): number {
        const delay = this.retryConfig.initialDelay *
            Math.pow(this.retryConfig.backoffMultiplier, attempt);

        // Add jitter (random variation) to prevent thundering herd
        const jitter = Math.random() * 1000;

        return Math.min(delay + jitter, this.retryConfig.maxDelay);
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError(error: any): boolean {
        if (!error) return false;

        // Check HTTP status code
        if (error.response?.status) {
            const status = error.response.status.toString();
            if (this.retryConfig.retryableErrors.includes(status)) {
                return true;
            }
        }

        // Check error code (network errors)
        if (error.code) {
            if (this.retryConfig.retryableErrors.includes(error.code)) {
                return true;
            }
        }

        // Check error message
        if (error.message) {
            const lowerMessage = error.message.toLowerCase();
            if (lowerMessage.includes('timeout') ||
                lowerMessage.includes('network') ||
                lowerMessage.includes('econnreset')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get error details for logging
     */
    private getErrorDetails(error: any): string {
        if (error.response) {
            return `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
        if (error.code) {
            return `Network error: ${error.code}`;
        }
        return error.message || 'Unknown error';
    }

    /**
     * Execute function with retry logic
     */
    private async withRetry<T>(
        fn: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        let lastError: any;

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                const result = await fn();

                if (attempt > 0) {
                    console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`);
                }

                return result;
            } catch (error: any) {
                lastError = error;

                const errorDetails = this.getErrorDetails(error);

                // Don't retry on last attempt
                if (attempt === this.retryConfig.maxRetries) {
                    console.error(`❌ ${operationName} failed after ${attempt + 1} attempts: ${errorDetails}`);
                    break;
                }

                // Check if error is retryable
                if (!this.isRetryableError(error)) {
                    console.error(`❌ ${operationName} failed with non-retryable error: ${errorDetails}`);
                    throw error;
                }

                // Calculate delay and retry
                const delay = this.calculateDelay(attempt);
                console.warn(
                    `⚠️ ${operationName} failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}): ${errorDetails}. ` +
                    `Retrying in ${Math.round(delay / 1000)}s...`
                );

                await this.sleep(delay);
            }
        }

        // All retries exhausted
        throw new Error(
            `${operationName} failed after ${this.retryConfig.maxRetries + 1} attempts. ` +
            `Last error: ${this.getErrorDetails(lastError)}`
        );
    }

    /**
     * Chat completion with retry
     */
    async chat(
        messages: QwenChatMessage[],
        temperature = 0.7,
        maxTokens = 4096
    ): Promise<string> {
        return this.withRetry(async () => {
            const response = await this.client.post<QwenChatResponse>('/chat/completions', {
                model: this.model,
                messages,
                temperature,
                max_tokens: maxTokens,
            });

            if (!response.data.choices || response.data.choices.length === 0) {
                throw new Error('No response from Qwen API');
            }

            const content = response.data.choices[0].message.content;

            if (!content) {
                throw new Error('Empty response from Qwen API');
            }

            // Log token usage
            if (response.data.usage) {
                console.log(
                    `📊 Tokens used: ${response.data.usage.total_tokens} ` +
                    `(${response.data.usage.prompt_tokens} prompt + ${response.data.usage.completion_tokens} completion)`
                );
            }

            return content;
        }, 'Qwen chat');
    }

    /**
     * Embedding with retry
     */
    async embed(texts: string[]): Promise<number[][]> {
        if (texts.length === 0) {
            throw new Error('Cannot embed empty array');
        }

        return this.withRetry(async () => {
            const response = await this.client.post<QwenEmbeddingResponse>('/embeddings', {
                model: this.embeddingModel,
                input: texts,
            });

            if (!response.data.data || response.data.data.length === 0) {
                throw new Error('No embeddings returned from Qwen API');
            }

            const embeddings = response.data.data
                .sort((a, b) => a.index - b.index)
                .map(item => item.embedding);

            if (embeddings.length !== texts.length) {
                throw new Error(
                    `Expected ${texts.length} embeddings but got ${embeddings.length}`
                );
            }

            // Log token usage
            if (response.data.usage) {
                console.log(`🔢 Embedding tokens: ${response.data.usage.total_tokens}`);
            }

            return embeddings;
        }, 'Qwen embed');
    }

    /**
     * Single text embedding with retry
     */
    async embedSingle(text: string): Promise<number[]> {
        const embeddings = await this.embed([text]);
        return embeddings[0];
    }

    /**
     * JSON response with retry and validation
     */
    async chatJSON<T>(
        messages: QwenChatMessage[],
        schema?: string
    ): Promise<T> {
        const systemMessage: QwenChatMessage = {
            role: 'system',
            content: schema
                ? `Верните валидный JSON согласно схеме:\n${schema}\n\nОтветьте ТОЛЬКО JSON, без markdown.`
                : 'Верните валидный JSON, без markdown, без пояснений.',
        };

        return this.withRetry(async () => {
            // 🔍 ДИАГНОСТИКА: Логируем что отправляем
            console.log('📤 Sending to Qwen:', {
                messagesCount: messages.length + 1, // +1 for system message
                systemMessageLength: systemMessage.content.length,
                userMessageLength: messages[messages.length - 1]?.content?.length || 0
            });

            const response = await this.chat([systemMessage, ...messages], 0.1, 4096);

            // 🔍 ДИАГНОСТИКА: Логируем сырой ответ
            console.log('📥 Qwen raw response:', {
                length: response.length,
                startsWithJson: response.trimStart().startsWith('{') || response.trimStart().startsWith('['),
                hasMarkdown: response.includes('```'),
                preview: response.slice(0, 300)
            });

            // Clean response - remove markdown and extra text
            let cleaned = response
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .replace(/^[^{[]*/, '') // Remove text before JSON
                .replace(/[^}\]]*$/, '') // Remove text after JSON
                .trim();

            // 🔍 ДИАГNOSTИКА: Логируем очищенный ответ
            console.log('🧹 Cleaned response:', {
                length: cleaned.length,
                startsWithJson: cleaned.startsWith('{') || cleaned.startsWith('['),
                preview: cleaned.slice(0, 300) + '...',
                lastChars: '...' + cleaned.slice(-100)
            });

            try {
                const parsed = JSON.parse(cleaned);

                // 🔍 ДИАГНОСТИКА: Логируем результат парсинга
                console.log('✅ Parsed JSON structure:', {
                    isArray: Array.isArray(parsed),
                    isObject: typeof parsed === 'object',
                    topLevelKeys: Object.keys(parsed),
                    slidesCount: parsed.slides?.length,
                    metadataPresent: !!parsed.metadata
                });

                return parsed as T;
            } catch (parseError: any) {
                console.error('❌ JSON parse failed');
                console.error('Parse error:', parseError.message);
                console.error('Cleaned response (first 500 chars):', cleaned.slice(0, 500));
                console.error('Cleaned response (last 500 chars):', cleaned.slice(-500));
                console.error('Full cleaned response:', cleaned); // Весь ответ для анализа

                throw new Error(
                    `Invalid JSON response from Qwen: ${parseError.message}. ` +
                    `Response preview: ${cleaned.slice(0, 100)}...`
                );
            }
        }, 'Qwen chatJSON');
    }

    /**
     * Batch embedding with automatic chunking and retry
     */
    async embedBatch(
        texts: string[],
        batchSize = 10,
        onProgress?: (completed: number, total: number) => void
    ): Promise<number[][]> {
        const results: number[][] = [];
        const totalBatches = Math.ceil(texts.length / batchSize);

        console.log(`📦 Embedding ${texts.length} texts in ${totalBatches} batches of ${batchSize}`);

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchNumber = Math.floor(i / batchSize) + 1;

            try {
                const embeddings = await this.embed(batch);
                results.push(...embeddings);

                if (onProgress) {
                    onProgress(i + batch.length, texts.length);
                }

                console.log(`✅ Batch ${batchNumber}/${totalBatches} completed`);

                // Small delay between batches to avoid rate limiting
                if (i + batchSize < texts.length) {
                    await this.sleep(500);
                }
            } catch (error: any) {
                console.error(`❌ Batch ${batchNumber} failed:`, error.message);
                throw new Error(
                    `Batch embedding failed at batch ${batchNumber}/${totalBatches}: ${error.message}`
                );
            }
        }

        return results;
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.withRetry(async () => {
                const response = await this.client.get('/models', { timeout: 5000 });
                return response.status === 200;
            }, 'Health check');
            return true;
        } catch (error) {
            console.error('❌ Qwen API health check failed:', error);
            return false;
        }
    }

    /**
     * Get current retry configuration
     */
    getRetryConfig(): RetryConfig {
        return { ...this.retryConfig };
    }

    /**
     * Update retry configuration
     */
    updateRetryConfig(config: Partial<RetryConfig>): void {
        this.retryConfig = { ...this.retryConfig, ...config };
        console.log('🔧 Retry config updated:', this.retryConfig);
    }
}

// Export singleton instance
export const qwenClient = new QwenClient({
    maxRetries: parseInt(process.env.QWEN_MAX_RETRIES || '3'),
    initialDelay: parseInt(process.env.QWEN_INITIAL_DELAY || '1000'),
    maxDelay: parseInt(process.env.QWEN_MAX_DELAY || '30000'),
    backoffMultiplier: parseFloat(process.env.QWEN_BACKOFF_MULTIPLIER || '2'),
});

// Export class for custom instances
export default QwenClient;
