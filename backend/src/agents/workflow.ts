// backend/src/agents/workflow.ts
import { StateGraph, END } from '@langchain/langgraph';
import { WorkflowState } from '../types/workflow.js';
import { db } from '../db/index.js';

// Node functions
async function analyzeDocuments(state: WorkflowState): Promise<Partial<WorkflowState>> {
    console.log('🔍 Starting document analysis...');

    try {
        const { analysisAgent } = await import('./analysis-agent.js');

        const analysis = await analysisAgent.analyze(
            state.projectId,
            state.documentIds
        );

        return {
            stage: 'analysis_complete',
            analysis,
            updatedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Analysis failed:', error);
        return {
            stage: 'failed',
            error: error.message,
            updatedAt: new Date().toISOString(),
        };
    }
}

async function createBlueprintNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    console.log('📐 Создание структуры презентации...');

    try {
        const { blueprintAgent } = await import('./blueprint-agent.js');

        if (!state.analysis) {
            throw new Error('Анализ не выполнен, невозможно создать blueprint');
        }

        const blueprint = await blueprintAgent.createBlueprint(
            state.projectId,
            state.analysis
        );

        return {
            stage: 'blueprint_pending_approval',
            blueprint,
            updatedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Blueprint creation failed:', error);
        return {
            stage: 'failed',
            error: error.message,
            updatedAt: new Date().toISOString(),
        };
    }
}

async function generateContentNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
    console.log('✍️ Генерация контента для слайдов...');

    try {
        if (!state.blueprint) {
            throw new Error('Blueprint не создан');
        }

        const { contentAgent } = await import('./content-agent.js');

        const slideContents = await contentAgent.generateAllSlides(
            state.projectId,
            state.blueprint
        );

        return {
            stage: 'complete',
            slides: slideContents,
            updatedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error('Content generation failed:', error);
        return {
            stage: 'failed',
            error: error.message,
            updatedAt: new Date().toISOString(),
        };
    }
}

// Conditional edges
function shouldContinueToBlueprint(state: WorkflowState): string {
    if (state.stage === 'failed') return END;
    if (state.stage === 'analysis_complete') return 'create_blueprint';
    return END;
}

function shouldContinueToGeneration(state: WorkflowState): string {
    if (state.stage === 'failed') return END;
    if (state.stage === 'blueprint_approved') return 'generate_content';
    // Для Week 3 останавливаемся на blueprint
    return END;
}

// Build workflow
export function createWorkflow() {
    const workflow = new StateGraph<WorkflowState>({
        channels: {
            projectId: null,
            documentIds: null,
            stage: null,
            analysis: null,
            blueprint: null,
            slides: null,
            error: null,
            createdAt: null,
            updatedAt: null,
        },
    });

    // Add nodes - ИСПРАВЛЕНО: переименованы ноды
    workflow.addNode('analyze', analyzeDocuments);
    workflow.addNode('create_blueprint', createBlueprintNode);
    workflow.addNode('generate_content', generateContentNode);

    // Add edges
    workflow.addEdge('__start__', 'analyze');
    workflow.addConditionalEdges('analyze', shouldContinueToBlueprint, {
        create_blueprint: 'create_blueprint',
        __end__: END,
    });
    workflow.addConditionalEdges('create_blueprint', shouldContinueToGeneration, {
        generate_content: 'generate_content',
        __end__: END,
    });
    workflow.addEdge('generate_content', END);

    return workflow.compile();
}

// Workflow manager
class WorkflowManager {
    private workflows = new Map<string, any>();

    async startWorkflow(projectId: string, documentIds: string[]) {
        const workflowId = `workflow-${projectId}-${Date.now()}`;

        const initialState: WorkflowState = {
            projectId,
            documentIds,
            stage: 'analyzing',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const workflow = createWorkflow();

        console.log('🚀 Starting workflow for project:', projectId);
        console.log('📄 Documents:', documentIds.length);

        // Run workflow asynchronously
        workflow.invoke(initialState).then(async (finalState) => {
            console.log('✅ Workflow complete:', finalState.stage);

            // Save analysis to database
            if (finalState.analysis) {
                try {
                    await db.db.read();

                    // Check if analysis already exists
                    const existingIndex = db.db.data.analyses.findIndex(
                        a => a.projectId === projectId
                    );

                    const analysisRecord = {
                        id: crypto.randomUUID(),
                        projectId,
                        documentIds,
                        classification: finalState.analysis.classification,
                        entities: finalState.analysis.entities,
                        metrics: finalState.analysis.metrics,
                        quality: finalState.analysis.quality,
                        recommendations: finalState.analysis.recommendations,
                        createdAt: new Date().toISOString(),
                    };

                    // Replace existing or add new
                    if (existingIndex >= 0) {
                        db.db.data.analyses[existingIndex] = analysisRecord;
                    } else {
                        db.db.data.analyses.push(analysisRecord);
                    }

                    await db.db.write();
                    console.log('💾 Analysis saved to database');
                } catch (dbError) {
                    console.error('Failed to save analysis:', dbError);
                }
            }
        }).catch(error => {
            console.error('❌ Workflow failed:', error);
            console.error('Stack trace:', error.stack);
        });

        this.workflows.set(workflowId, { workflow, state: initialState });
        return workflowId;
    }

    getWorkflow(id: string) {
        return this.workflows.get(id);
    }
}

export const workflowManager = new WorkflowManager();