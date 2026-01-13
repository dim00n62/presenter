// backend/src/types/database.ts

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
    chunks: z.array(z.any()).optional(), // Массив чанков для этого документа
});

export const ChunkSchema = z.object({
    id: z.string(),
    documentId: z.string(),
    content: z.string(),
    metadata: z.object({
        source: z.string(),
        type: z.string().optional(),
        page: z.number().optional(),
        pageNumber: z.number().optional(),
        sheet: z.string().optional(),
        startRow: z.number().optional(),
        endRow: z.number().optional(),
        wordCount: z.number().optional(),
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
    // Цель и контекст презентации
    presentationGoal: z.string().optional(),
    targetAudience: z.string().optional(),
    presentationContext: z.string().optional(),
    keyMessage: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.enum([
        'created',           // Проект создан
        'parsing',          // Документы парсятся
        'parsed',           // Документы распарсены
        'analyzed',         // Анализ завершен
        'blueprint_ready',  // Структура готова
        'content_generated',// Контент создан
        'presentation_ready', // PPTX сгенерирован
        'error',            // Ошибка
    ]),
    metadata: z.record(z.any()).optional(),
    // ID связанных сущностей
    analysisId: z.string().optional(),
    blueprintId: z.string().optional(),
    presentationFile: z.string().optional(),
    // Прогресс по этапам
    progress: z.object({
        parsing: z.number().default(0),
        analysis: z.number().default(0),
        blueprint: z.number().default(0),
        content: z.number().default(0),
        generation: z.number().default(0),
    }).default({
        parsing: 0,
        analysis: 0,
        blueprint: 0,
        content: 0,
        generation: 0,
    }),
    errors: z.array(z.string()).optional(),
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
        projectName: z.string().nullable().optional(),
        stakeholders: z.array(z.string()),
        timeline: z.any().optional(),
        budget: z.any().optional(),
    }),
    keyPoints: z.array(z.any()).optional(),
    themes: z.array(z.any()).optional(),
    metrics: z.record(z.array(z.any())),
    quality: z.object({
        completeness: z.number(),
        consistency: z.number().optional(),
        issues: z.array(z.any()),
        gaps: z.array(z.string()).optional(),
    }),
    recommendations: z.any(),
    createdAt: z.string(),
});

export const BlueprintSlideSchema = z.object({
    id: z.string(),
    order: z.number(),
    title: z.string(),
    type: z.string(),
    section: z.string(),
    description: z.string().optional(),
    dataSources: z.array(z.string()),
    visualizationType: z.string(),
    contentHints: z.object({
        mainPoints: z.array(z.string()),
        suggestedData: z.string(),
        layout: z.string(),
    }),
    priority: z.enum(['critical', 'high', 'medium', 'low']),
    estimatedComplexity: z.enum(['simple', 'medium', 'complex']),
});

export const BlueprintSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    analysisId: z.string(),
    slides: z.array(BlueprintSlideSchema),
    metadata: z.any(),
    structure: z.any().optional(),
    dataUsageStats: z.any().optional(),
    validationWarnings: z.array(z.string()).optional(),
    visualStyle: z.object({
        theme: z.string(),
        colorScheme: z.string(),
        fontPrimary: z.string(),
        fontSecondary: z.string(),
    }).optional(),
    status: z.enum(['draft', 'approved', 'rejected']),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
    approvedAt: z.string().optional(),
});

export const SlideContentSchema = z.object({
    slideId: z.string(),
    content: z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        body: z.any(),
        footer: z.string().optional(),
        sources: z.array(z.string()).optional(),
        visualHints: z.any().optional(),
    }),
    metadata: z.object({
        dataSources: z.array(z.string()),
        confidence: z.number(),
        suggestedDuration: z.number(),
    }),
});

export const SpeakerNoteSchema = z.object({
    slideId: z.string(),
    speakerNotes: z.object({
        intro: z.string().optional(),
        body: z.string().optional(),
        transition: z.string().optional(),
        keyPoints: z.array(z.string()).optional(),
        emphasis: z.array(z.any()).optional(),
        timing: z.any().optional(),
    }),
});

// TypeScript types
export type Document = z.infer<typeof DocumentSchema>;
export type Chunk = z.infer<typeof ChunkSchema>;
export type Embedding = z.infer<typeof EmbeddingSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Analysis = z.infer<typeof AnalysisSchema>;
export type BlueprintSlide = z.infer<typeof BlueprintSlideSchema>;
export type Blueprint = z.infer<typeof BlueprintSchema>;
export type SlideContent = z.infer<typeof SlideContentSchema>;
export type SpeakerNote = z.infer<typeof SpeakerNoteSchema>;

// Database structure
export interface Database {
    projects: Project[];
    documents: Document[];
    chunks: Chunk[]; // Плоский массив всех чанков
    embeddings: Embedding[];
    analyses: Analysis[];
    blueprints: Blueprint[];
    slideContents: SlideContent[];
    speakerNotes: SpeakerNote[];
}