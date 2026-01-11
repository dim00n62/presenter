import { z } from 'zod';

// Zod schemas for validation
export const DocumentSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    filename: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number(),
    uploadedAt: z.string(),
    parsedAt: z.string().optional(),
    status: z.enum(['uploaded', 'parsing', 'parsed', 'failed']),
    metadata: z.record(z.any()).optional(),
    parsedData: z.any().optional(),
});

export const ChunkSchema = z.object({
    id: z.string(),
    documentId: z.string(),
    content: z.string(),
    metadata: z.object({
        source: z.string(),
        page: z.number().optional(),
        sheet: z.string().optional(),
        startRow: z.number().optional(),
        endRow: z.number().optional(),
    }),
    chunkIndex: z.number(),
});

export const EmbeddingSchema = z.object({
    id: z.string(),
    chunkId: z.string(),
    vector: z.array(z.number()),
    model: z.string(),
    createdAt: z.string(),
});

export const ProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    // НОВЫЕ ПОЛЯ:
    presentationGoal: z.string().optional(),
    targetAudience: z.string().optional(),
    presentationContext: z.string().optional(),
    keyMessage: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.enum(['active', 'archived']),
    metadata: z.record(z.any()).optional(),
});

export const AnalysisSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    documentIds: z.array(z.string()),
    classification: z.object({
        type: z.string(),
        reasoning: z.string(),
        confidence: z.number(),
        keywords: z.array(z.string()),
    }),
    entities: z.object({
        projectName: z.string().optional(),
        stakeholders: z.array(z.string()),
        timeline: z.any().optional(),
        budget: z.any().optional(),
    }),
    metrics: z.record(z.array(z.any())),
    quality: z.object({
        completeness: z.number(),
        issues: z.array(z.string()),
    }),
    recommendations: z.any(),
    createdAt: z.string(),
});

export const BlueprintSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    analysisId: z.string(),
    slides: z.array(z.object({
        id: z.string(),
        order: z.number(),
        title: z.string(),
        type: z.string(),
        section: z.string(),
        description: z.string(),
        dataSources: z.array(z.string()),
        visualizationType: z.string(),
        contentHints: z.object({
            mainPoints: z.array(z.string()),
            suggestedData: z.string(),
            layout: z.string(),
        }),
        priority: z.enum(['critical', 'high', 'medium', 'low']),
        estimatedComplexity: z.enum(['simple', 'medium', 'complex']),
    })),
    metadata: z.any(),
    structure: z.any(),
    dataUsageStats: z.any(),
    validationWarnings: z.array(z.string()),
    status: z.enum(['draft', 'approved', 'rejected']),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    approvedAt: z.string().optional(),
});

export interface Generation {
    id: string;
    projectId: string;
    blueprintId: string;
    slideContents: any[];
    status: 'in_progress' | 'completed' | 'failed';
    createdAt: string;
}

// TypeScript types
export type Document = z.infer<typeof DocumentSchema>;
export type Chunk = z.infer<typeof ChunkSchema>;
export type Embedding = z.infer<typeof EmbeddingSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type Blueprint = z.infer<typeof BlueprintSchema>;

// Database structure
export interface Database {
    projects: Project[];
    documents: Document[];
    chunks: Chunk[];
    embeddings: Embedding[];
    analyses: Analysis[];
    blueprints: Blueprint[];
    generations?: Generation[];
    speakerNotes?: SpeakerNote[];
}

// Generation type
export interface Generation {
    id: string;
    projectId: string;
    blueprintId: string;
    slideContents: any[];
    status: 'in_progress' | 'completed' | 'failed';
    createdAt: string;
}

// Speaker Notes type
export interface SpeakerNote {
    id: string;
    projectId: string;
    blueprintId: string;
    notes: any[];
    audioFiles?: Array<{
        slideId: string;
        audioPath: string;
        duration: number;
    }>;
    createdAt: string;
}
