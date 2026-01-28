// backend/src/tools/rag-diagnostics.ts

/**
 * RAG Diagnostics Tool
 * 
 * Помогает диагностировать проблемы с поиском релевантных chunks
 */

import { db } from '../db/index.js';
import { qwenClient } from '../services/qwen-client.js';

interface DiagnosticResult {
    query: string;
    totalChunks: number;
    resultsFound: number;
    similarityDistribution: {
        range: string;
        count: number;
        percentage: number;
    }[];
    topResults: {
        chunkId: string;
        similarity: number;
        contentPreview: string;
        metadata: any;
    }[];
    recommendations: string[];
}

class RAGDiagnostics {

    /**
     * Анализирует качество поиска для заданного query
     */
    async diagnoseQuery(query: string, projectId?: string): Promise<DiagnosticResult> {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🔍 RAG DIAGNOSTICS: "${query}"`);
        console.log('='.repeat(80));

        // 1. Получаем все chunks проекта
        let allChunks: any[] = [];
        if (projectId) {
            const documents = await db.getDocumentsByProject(projectId);
            for (const doc of documents) {
                const docChunks = await db.getChunksByDocument(doc.id);
                allChunks.push(...docChunks);
            }
        } else {
            await db.db.read();
            allChunks = db.db.data.chunks;
        }

        console.log(`📊 Total chunks in project: ${allChunks.length}`);

        // 2. Получаем embedding для query
        const queryVector = await qwenClient.embedSingle(query);

        // 3. Считаем similarity для ВСЕХ chunks
        const allResults: Array<{ chunk: any; similarity: number }> = [];

        await db.db.read();
        for (const embedding of db.db.data.embeddings) {
            const chunk = allChunks.find(c => c.id === embedding.chunkId);
            if (!chunk) continue;

            const similarity = this.cosineSimilarity(queryVector, embedding.vector);
            allResults.push({ chunk, similarity });
        }

        // Сортируем по similarity
        allResults.sort((a, b) => b.similarity - a.similarity);

        // 4. Анализируем распределение similarity
        const distribution = this.analyzeDistribution(allResults);

        console.log('\n📈 SIMILARITY DISTRIBUTION:');
        distribution.forEach(d => {
            const bar = '█'.repeat(Math.floor(d.percentage / 2));
            console.log(`  ${d.range}: ${bar} ${d.count} (${d.percentage.toFixed(1)}%)`);
        });

        // 5. Топ результаты
        const topResults = allResults.slice(0, 10).map(r => ({
            chunkId: r.chunk.id,
            similarity: r.similarity,
            contentPreview: r.chunk.content.substring(0, 150),
            metadata: r.chunk.metadata
        }));

        console.log('\n🏆 TOP 10 RESULTS:');
        topResults.forEach((r, i) => {
            const score = (r.similarity * 100).toFixed(1);
            const emoji = r.similarity >= 0.7 ? '✅' : r.similarity >= 0.5 ? '⚠️' : '❌';
            console.log(`  ${i + 1}. ${emoji} ${score}% - ${r.contentPreview}...`);
        });

        // 6. Генерируем рекомендации
        const recommendations = this.generateRecommendations(allResults, distribution);

        console.log('\n💡 RECOMMENDATIONS:');
        recommendations.forEach(r => console.log(`  • ${r}`));

        console.log('\n' + '='.repeat(80) + '\n');

        return {
            query,
            totalChunks: allChunks.length,
            resultsFound: allResults.length,
            similarityDistribution: distribution,
            topResults,
            recommendations
        };
    }

    /**
     * Сравнивает несколько queries
     */
    async compareQueries(queries: string[], projectId?: string): Promise<void> {
        console.log('\n🔬 COMPARING MULTIPLE QUERIES\n');

        const results: DiagnosticResult[] = [];

        for (const query of queries) {
            const result = await this.diagnoseQuery(query, projectId);
            results.push(result);
        }

        // Сравнительная таблица
        console.log('📊 COMPARISON TABLE:\n');
        console.log('Query'.padEnd(40) + 'Avg Similarity' + '  High (>0.7)' + '  Medium (0.5-0.7)' + '  Low (<0.5)');
        console.log('-'.repeat(100));

        for (const result of results) {
            const avgSim = result.topResults.reduce((sum, r) => sum + r.similarity, 0) / result.topResults.length;
            const high = result.similarityDistribution.find(d => d.range.includes('0.7'))?.count || 0;
            const medium = result.similarityDistribution.find(d => d.range.includes('0.5-0.7'))?.count || 0;
            const low = result.similarityDistribution.filter(d =>
                d.range.includes('0.0') || d.range.includes('0.1') ||
                d.range.includes('0.2') || d.range.includes('0.3') ||
                d.range.includes('0.4')
            ).reduce((sum, d) => sum + d.count, 0);

            console.log(
                result.query.substring(0, 38).padEnd(40) +
                (avgSim * 100).toFixed(1).padStart(12) + '%' +
                high.toString().padStart(12) +
                medium.toString().padStart(18) +
                low.toString().padStart(15)
            );
        }
    }

    /**
     * Тестирует разные similarity thresholds
     */
    async testThresholds(query: string, projectId?: string): Promise<void> {
        console.log('\n🎯 TESTING SIMILARITY THRESHOLDS\n');

        const thresholds = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8];

        // Получаем все результаты
        const queryVector = await qwenClient.embedSingle(query);

        let allChunks: any[] = [];
        if (projectId) {
            const documents = await db.getDocumentsByProject(projectId);
            for (const doc of documents) {
                const docChunks = await db.getChunksByDocument(doc.id);
                allChunks.push(...docChunks);
            }
        }

        await db.db.read();
        const allResults: Array<{ similarity: number }> = [];

        for (const embedding of db.db.data.embeddings) {
            const chunk = allChunks.find(c => c.id === embedding.chunkId);
            if (!chunk) continue;

            const similarity = this.cosineSimilarity(queryVector, embedding.vector);
            allResults.push({ similarity });
        }

        console.log('Threshold | Results Found | % of Total | Recommendation');
        console.log('-'.repeat(70));

        for (const threshold of thresholds) {
            const filtered = allResults.filter(r => r.similarity >= threshold);
            const percentage = (filtered.length / allResults.length * 100).toFixed(1);

            let recommendation = '';
            if (threshold <= 0.4 && filtered.length > 20) {
                recommendation = '⚠️ Too many (noisy)';
            } else if (threshold >= 0.7 && filtered.length < 3) {
                recommendation = '⚠️ Too few (missing relevant)';
            } else if (filtered.length >= 5 && filtered.length <= 20) {
                recommendation = '✅ Good range';
            }

            console.log(
                `${threshold.toFixed(1).padStart(9)} | ` +
                `${filtered.length.toString().padStart(13)} | ` +
                `${percentage.padStart(10)}% | ` +
                recommendation
            );
        }

        console.log('\n💡 RECOMMENDED THRESHOLD:');

        // Находим оптимальный threshold
        let optimalThreshold = 0.5;
        for (const threshold of thresholds) {
            const filtered = allResults.filter(r => r.similarity >= threshold);
            if (filtered.length >= 5 && filtered.length <= 20) {
                optimalThreshold = threshold;
                break;
            }
        }

        console.log(`   ${optimalThreshold} (balances precision and recall)`);
    }

    /**
     * Анализирует распределение similarity scores
     */
    private analyzeDistribution(results: Array<{ similarity: number }>): Array<{ range: string; count: number; percentage: number }> {
        const ranges = [
            { min: 0.0, max: 0.1, label: '0.0-0.1' },
            { min: 0.1, max: 0.2, label: '0.1-0.2' },
            { min: 0.2, max: 0.3, label: '0.2-0.3' },
            { min: 0.3, max: 0.4, label: '0.3-0.4' },
            { min: 0.4, max: 0.5, label: '0.4-0.5' },
            { min: 0.5, max: 0.6, label: '0.5-0.6' },
            { min: 0.6, max: 0.7, label: '0.6-0.7' },
            { min: 0.7, max: 0.8, label: '0.7-0.8' },
            { min: 0.8, max: 0.9, label: '0.8-0.9' },
            { min: 0.9, max: 1.0, label: '0.9-1.0' },
        ];

        return ranges.map(range => {
            const count = results.filter(r =>
                r.similarity >= range.min && r.similarity < range.max
            ).length;

            return {
                range: range.label,
                count,
                percentage: (count / results.length) * 100
            };
        }).filter(r => r.count > 0);
    }

    /**
     * Генерирует рекомендации на основе результатов
     */
    private generateRecommendations(
        results: Array<{ similarity: number }>,
        distribution: Array<{ range: string; count: number }>
    ): string[] {
        const recommendations: string[] = [];

        const highQuality = results.filter(r => r.similarity >= 0.7).length;
        const mediumQuality = results.filter(r => r.similarity >= 0.5 && r.similarity < 0.7).length;
        const lowQuality = results.filter(r => r.similarity < 0.5).length;

        // Анализ качества
        if (highQuality === 0) {
            recommendations.push('❌ No high-quality matches (>0.7). Query might be too specific or chunks poorly aligned.');
            recommendations.push('   → Try rephrasing query with different keywords');
            recommendations.push('   → Check if semantic chunking is enabled');
        }

        if (highQuality < 3 && mediumQuality < 5) {
            recommendations.push('⚠️ Few relevant results. Consider:');
            recommendations.push('   → Lowering similarity threshold to 0.4-0.5');
            recommendations.push('   → Using broader query terms');
            recommendations.push('   → Increasing topK parameter');
        }

        if (lowQuality > results.length * 0.8) {
            recommendations.push('⚠️ Most results have low similarity (<0.5). Possible issues:');
            recommendations.push('   → Query not well matched to document content');
            recommendations.push('   → Embedding model mismatch');
            recommendations.push('   → Need better chunking strategy');
        }

        // Рекомендации по threshold
        if (highQuality >= 5) {
            recommendations.push('✅ Good high-quality results. Use threshold: 0.6-0.7');
        } else if (mediumQuality >= 5) {
            recommendations.push('✅ Good medium-quality results. Use threshold: 0.5-0.6');
        } else {
            recommendations.push('⚠️ Use threshold: 0.4-0.5 to get enough results');
        }

        // Рекомендации по topK
        const optimalTopK = Math.min(Math.max(highQuality + mediumQuality, 5), 15);
        recommendations.push(`💡 Recommended topK: ${optimalTopK} (based on quality distribution)`);

        return recommendations;
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }
}

export const ragDiagnostics = new RAGDiagnostics();

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const query = process.argv[3];
    const projectId = process.argv[4];

    switch (command) {
        case 'diagnose':
            if (!query) {
                console.error('Usage: npm run diagnose-rag diagnose "your query" [projectId]');
                process.exit(1);
            }
            await ragDiagnostics.diagnoseQuery(query, projectId);
            break;

        case 'compare':
            const queries = process.argv.slice(3, -1);
            const pid = process.argv[process.argv.length - 1];
            await ragDiagnostics.compareQueries(queries, pid);
            break;

        case 'test-thresholds':
            if (!query) {
                console.error('Usage: npm run diagnose-rag test-thresholds "your query" [projectId]');
                process.exit(1);
            }
            await ragDiagnostics.testThresholds(query, projectId);
            break;

        default:
            console.log(`
RAG Diagnostics Tool

Commands:
  diagnose "query" [projectId]           - Analyze a single query
  compare "query1" "query2" ... [pid]    - Compare multiple queries
  test-thresholds "query" [projectId]    - Test different similarity thresholds

Examples:
  npm run diagnose-rag diagnose "выручка прибыль" project-123
  npm run diagnose-rag test-thresholds "финансовые результаты" project-123
  npm run diagnose-rag compare "выручка" "архитектура" "план" project-123
            `);
    }
}
