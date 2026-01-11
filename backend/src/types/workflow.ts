// backend/src/types/workflow.ts
import { z } from 'zod';

// Workflow State Schema
export const WorkflowStateSchema = z.object({
    projectId: z.string(),
    documentIds: z.array(z.string()),

    // Current stage
    stage: z.enum([
        'idle',
        'analyzing',
        'analysis_complete',
        'blueprinting',
        'blueprint_pending_approval',
        'blueprint_approved',
        'generating_content',
        'complete',
        'failed'
    ]),

    // Analysis results
    analysis: z.object({
        classification: z.object({
            type: z.string(),
            confidence: z.number(),
            keywords: z.array(z.string()),
        }).optional(),
        entities: z.object({
            projectName: z.string().optional(),
            stakeholders: z.array(z.string()),
            timeline: z.any().optional(),
            budget: z.any().optional(),
        }).optional(),
        metrics: z.record(z.array(z.any())).optional(),
        quality: z.object({
            completeness: z.number(),
            issues: z.array(z.string()),
        }).optional(),
        recommendations: z.any().optional(),
    }).optional(),

    // Blueprint
    blueprint: z.any().optional(),

    // Slides content
    slides: z.array(z.any()).optional(),

    // Error tracking
    error: z.string().optional(),

    // Metadata
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;

// Analysis result from agent
export interface AnalysisResult {
    classification: {
        type: 'technical_specification' | 'status_report' | 'architecture_document' | 'rfp_response' | 'budget_document' | 'unknown';
        confidence: number; // 0-100
        keywords: string[];
        reasoning: string;
    };

    entities: {
        projectName?: string;
        stakeholders: string[];
        timeline?: {
            start?: string;
            end?: string;
            milestones: Array<{
                name: string;
                date?: string;
                description?: string;
            }>;
        };
        budget?: {
            total?: number;
            currency?: string;
            breakdown: Array<{
                category: string;
                amount: number;
                source: string;
            }>;
        };
    };

    metrics: {
        financial: Array<{
            name: string;
            value: string;
            source: string;
            confidence: number;
        }>;
        technical: Array<{
            name: string;
            value: string;
            source: string;
            confidence: number;
        }>;
        risk: Array<{
            name: string;
            severity: 'low' | 'medium' | 'high' | 'critical';
            description: string;
            mitigation?: string;
            source: string;
        }>;
        compliance: Array<{
            regulation: string;
            status: 'compliant' | 'non_compliant' | 'unclear';
            notes: string;
            source: string;
        }>;
    };

    quality: {
        completeness: number; // 0-100
        consistency: number; // 0-100
        issues: Array<{
            type: 'missing_data' | 'inconsistency' | 'ambiguity' | 'format_error';
            severity: 'low' | 'medium' | 'high';
            description: string;
            location?: string;
        }>;
        gaps: string[];
    };

    recommendations: {
        presentationType: 'pitch' | 'status_report' | 'architecture_review' | 'vendor_rfp';
        slideCount: {
            min: number;
            max: number;
            recommended: number;
        };
        mustIncludeSections: Array<{
            name: string;
            reasoning: string;
            priority: 'critical' | 'high' | 'medium';
        }>;
        visualizations: Array<{
            type: 'gantt_chart' | 'pie_chart' | 'bar_chart' | 'architecture_diagram' | 'flow_diagram' | 'table';
            title: string;
            dataSource: string;
            reasoning: string;
        }>;
    };
}