import { analysisAgent } from '../agents/analysis-agent.js';
import { blueprintAgent } from '../agents/blueprint-agent.js';
import { db } from '../db/index.js';
import { Blueprint } from '../types/database.js';

interface ProgressUpdate {
    stage: string;
    progress: number;
    status: 'processing' | 'complete' | 'error';
    message?: string;
    error?: string;
}

type ProgressCallback = (update: ProgressUpdate) => void;

class AnalyzeService {
    private progressCallbacks: Map<string, ProgressCallback[]> = new Map();

    /**
     * Register a progress callback for a project
     */
    onProgress(projectId: string, callback: ProgressCallback): () => void {
        if (!this.progressCallbacks.has(projectId)) {
            this.progressCallbacks.set(projectId, []);
        }

        const callbacks = this.progressCallbacks.get(projectId)!;
        callbacks.push(callback);

        // Return unsubscribe function
        return () => {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    /**
     * Notify all progress callbacks for a project
     */
    private notifyProgress(projectId: string, update: ProgressUpdate) {
        const callbacks = this.progressCallbacks.get(projectId);
        if (callbacks) {
            callbacks.forEach(callback => callback(update));
        }
    }

    /**
     * Run full analysis workflow
     */
    async runAnalysis(projectId: string, documentIds: string[]): Promise<any> {
        try {
            // Stage 1: Analysis
            this.notifyProgress(projectId, {
                stage: 'analysis',
                progress: 0,
                status: 'processing',
                message: 'Начинаем анализ документов...'
            });

            const analysis = await analysisAgent.analyze(projectId, documentIds);

            this.notifyProgress(projectId, {
                stage: 'analysis',
                progress: 50,
                status: 'processing',
                message: 'Анализ завершен, сохраняем результаты...'
            });

            // Save analysis
            const savedAnalysis = await db.createAnalysis({
                projectId,
                documentIds,
                classification: analysis.classification,
                entities: analysis.entities,
                metrics: analysis.metrics,
                quality: analysis.quality,
                recommendations: analysis.recommendations,
            });

            this.notifyProgress(projectId, {
                stage: 'analysis',
                progress: 100,
                status: 'complete',
                message: 'Анализ завершен успешно'
            });

            return savedAnalysis;

        } catch (error: any) {
            this.notifyProgress(projectId, {
                stage: 'analysis',
                progress: 0,
                status: 'error',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Quick start - create basic blueprint without full analysis
     */
    async quickStart(projectId: string): Promise<Blueprint> {
        try {
            this.notifyProgress(projectId, {
                stage: 'blueprint',
                progress: 0,
                status: 'processing',
                message: 'Создаем базовую структуру...'
            });

            // Get documents
            const documents = await db.getDocumentsByProject(projectId);
            if (documents.length === 0) {
                throw new Error('No documents found for project');
            }

            // Create minimal analysis
            const minimalAnalysis = {
                classification: {
                    type: 'general',
                    confidence: 50,
                    keywords: [],
                    reasoning: 'Quick start - no full analysis'
                },
                entities: {
                    stakeholders: [],
                },
                metrics: {},
                quality: {
                    completeness: 50,
                    issues: []
                },
                recommendations: {
                    presentationType: 'general' as const,
                    slideCount: {
                        min: 3,
                        max: 6,
                        recommended: 4
                    },
                    mustIncludeSections: [
                        {
                            name: 'Introduction',
                            reasoning: 'Start with overview',
                            priority: 'high' as const
                        },
                        {
                            name: 'Main Content',
                            reasoning: 'Core information',
                            priority: 'critical' as const
                        },
                        {
                            name: 'Summary',
                            reasoning: 'Conclude with key points',
                            priority: 'high' as const
                        }
                    ],
                    visualizations: []
                }
            };

            this.notifyProgress(projectId, {
                stage: 'blueprint',
                progress: 50,
                status: 'processing',
                message: 'Генерируем слайды...'
            });

            // Create basic blueprint
            const blueprintData = await blueprintAgent.createBlueprint(
                projectId,
                minimalAnalysis
            );

            const blueprint = await db.createBlueprint({
                projectId,
                analysisId: 'quick-start',
                slides: blueprintData.slides,
                metadata: blueprintData.metadata,
                structure: blueprintData.structure,
                dataUsageStats: blueprintData.dataUsageStats,
                validationWarnings: blueprintData.validationWarnings,
                status: 'draft'
            });

            this.notifyProgress(projectId, {
                stage: 'blueprint',
                progress: 100,
                status: 'complete',
                message: 'Базовая структура создана'
            });

            return blueprint;

        } catch (error: any) {
            this.notifyProgress(projectId, {
                stage: 'blueprint',
                progress: 0,
                status: 'error',
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Clean up callbacks for a project
     */
    cleanup(projectId: string) {
        this.progressCallbacks.delete(projectId);
    }
}

export const analyzeService = new AnalyzeService();