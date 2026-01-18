// backend/src/db/index.ts

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    Database,
    Project,
    Document,
    Chunk,
    Embedding,
    Analysis,
    Blueprint,
    BlueprintSlide,
} from '../types/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/db.json');

// Default data structure
const defaultData: Database = {
    projects: [],
    documents: [],
    chunks: [],
    embeddings: [],
    analyses: [],
    blueprints: [],
};

class DatabaseService {
    public db: Low<Database>;

    constructor() {
        const adapter = new JSONFile<Database>(dbPath);
        this.db = new Low(adapter, defaultData);
    }

    async init() {
        await this.db.read();
        this.db.data ||= defaultData;
        await this.db.write();
    }

    // =============================================================================
    // PROJECTS
    // =============================================================================

    async createProject(projectData: Partial<Project>): Promise<Project> {
        await this.db.read();

        const project: Project = {
            id: crypto.randomUUID(),
            name: projectData.name || 'Untitled Project',
            description: projectData.description,
            presentationGoal: projectData.presentationGoal,
            targetAudience: projectData.targetAudience,
            presentationContext: projectData.presentationContext,
            keyMessage: projectData.keyMessage,
            status: 'created',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            progress: {
                parsing: 0,
                analysis: 0,
                blueprint: 0,
                content: 0,
                generation: 0,
            },
            metadata: projectData.metadata || {},
        };

        this.db.data.projects.push(project);
        await this.db.write();

        return project;
    }

    async getProject(projectId: string): Promise<Project> {
        await this.db.read();
        const project = this.db.data.projects.find((p) => p.id === projectId);
        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }
        return project;
    }

    async getAllProjects(): Promise<Project[]> {
        await this.db.read();
        return this.db.data.projects;
    }

    async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
        await this.db.read();
        const project = this.db.data.projects.find((p) => p.id === projectId);

        if (!project) {
            throw new Error(`Project ${projectId} not found`);
        }

        // Deep merge for nested objects like progress
        if (updates.progress) {
            project.progress = {
                ...project.progress,
                ...updates.progress,
            };
            delete updates.progress;
        }

        Object.assign(project, updates);
        project.updatedAt = new Date().toISOString();

        await this.db.write();
        return project;
    }

    async deleteProject(projectId: string): Promise<void> {
        await this.db.read();

        // Delete related data
        this.db.data.documents = this.db.data.documents.filter(
            (d) => d.projectId !== projectId
        );
        this.db.data.chunks = this.db.data.chunks.filter((c) => {
            const doc = this.db.data.documents.find((d) => d.id === c.documentId);
            return doc?.projectId !== projectId;
        });
        this.db.data.analyses = this.db.data.analyses.filter(
            (a) => a.projectId !== projectId
        );
        this.db.data.blueprints = this.db.data.blueprints.filter(
            (b) => b.projectId !== projectId
        );
        this.db.data.projects = this.db.data.projects.filter((p) => p.id !== projectId);

        await this.db.write();
    }

    // =============================================================================
    // DOCUMENTS
    // =============================================================================

    async createDocument(documentData: Partial<Document>): Promise<Document> {
        await this.db.read();

        const document: Document = {
            id: crypto.randomUUID(),
            projectId: documentData.projectId!,
            filename: documentData.filename!,
            originalName: documentData.originalName!,
            mimeType: documentData.mimeType!,
            size: documentData.size!,
            uploadedAt: new Date().toISOString(),
            status: 'uploaded',
            metadata: documentData.metadata || {},
        };

        this.db.data.documents.push(document);
        await this.db.write();

        return document;
    }

    async getDocument(documentId: string): Promise<Document> {
        await this.db.read();
        const document = this.db.data.documents.find((d) => d.id === documentId);
        if (!document) {
            throw new Error(`Document ${documentId} not found`);
        }
        return document;
    }

    async getDocumentsByProject(projectId: string): Promise<Document[]> {
        await this.db.read();
        return this.db.data.documents.filter((d) => d.projectId === projectId);
    }

    async updateDocument(documentId: string, updates: Partial<Document>): Promise<Document> {
        await this.db.read();
        const document = this.db.data.documents.find((d) => d.id === documentId);

        if (!document) {
            throw new Error(`Document ${documentId} not found`);
        }

        Object.assign(document, updates);
        await this.db.write();

        return document;
    }

    // =============================================================================
    // CHUNKS
    // =============================================================================

    async createChunk(chunkData: Partial<Chunk>): Promise<Chunk> {
        await this.db.read();

        const chunk: Chunk = {
            id: crypto.randomUUID(),
            documentId: chunkData.documentId!,
            content: chunkData.content!,
            metadata: chunkData.metadata!,
            chunkIndex: chunkData.chunkIndex!,
        };

        this.db.data.chunks.push(chunk);
        await this.db.write();

        return chunk;
    }

    async createChunks(chunksData: Partial<Chunk>[]): Promise<Chunk[]> {
        await this.db.read();

        const chunks: Chunk[] = chunksData.map((chunkData) => ({
            id: crypto.randomUUID(),
            documentId: chunkData.documentId!,
            content: chunkData.content!,
            metadata: chunkData.metadata!,
            chunkIndex: chunkData.chunkIndex!,
        }));

        this.db.data.chunks.push(...chunks);
        await this.db.write();

        return chunks;
    }

    async getChunkById(chunkId: string): Promise<Chunk> {
        await this.db.read();
        const chunk = this.db.data.chunks.find((c) => c.id === chunkId);
        if (!chunk) {
            throw new Error(`Chunk ${chunkId} not found`);
        }
        return chunk;
    }

    async getChunksByDocument(documentId: string): Promise<Chunk[]> {
        await this.db.read();
        return this.db.data.chunks.filter((c) => c.documentId === documentId);
    }

    async getChunksByProject(projectId: string): Promise<Chunk[]> {
        await this.db.read();

        const documents = this.db.data.documents.filter((d) => d.projectId === projectId);
        const documentIds = new Set(documents.map((d) => d.id));

        return this.db.data.chunks.filter((c) => documentIds.has(c.documentId));
    }

    // =============================================================================
    // VECTOR SEARCH
    // =============================================================================

    /**
     * Search for similar chunks using cosine similarity
     */
    async searchSimilarChunks(
        queryVector: number[],
        topK = 5
    ): Promise<Array<{ chunk: Chunk; similarity: number }>> {
        await this.db.read();

        const results: Array<{ chunk: Chunk; similarity: number }> = [];

        // Get all embeddings
        for (const embedding of this.db.data.embeddings) {
            const chunk = this.db.data.chunks.find((c) => c.id === embedding.chunkId);
            if (!chunk) continue;

            // Calculate cosine similarity
            const similarity = this.cosineSimilarity(queryVector, embedding.vector);
            results.push({ chunk, similarity });
        }

        // Sort by similarity (descending) and take topK
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK);
    }

    /**
     * Calculate cosine similarity between two vectors
     */
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

    // =============================================================================
    // EMBEDDINGS
    // =============================================================================

    async createEmbedding(embeddingData: Partial<Embedding>): Promise<Embedding> {
        await this.db.read();

        const embedding: Embedding = {
            id: crypto.randomUUID(),
            chunkId: embeddingData.chunkId!,
            vector: embeddingData.vector!,
            model: embeddingData.model!,
            createdAt: new Date().toISOString(),
        };

        this.db.data.embeddings.push(embedding);
        await this.db.write();

        return embedding;
    }

    async getEmbeddingByChunk(chunkId: string): Promise<Embedding | null> {
        await this.db.read();
        return this.db.data.embeddings.find((e) => e.chunkId === chunkId) || null;
    }

    // =============================================================================
    // ANALYSIS
    // =============================================================================

    async createAnalysis(analysisData: Partial<Analysis>): Promise<Analysis> {
        await this.db.read();

        const analysis: Analysis = {
            id: crypto.randomUUID(),
            projectId: analysisData.projectId!,
            documentIds: analysisData.documentIds!,
            classification: analysisData.classification!,
            entities: analysisData.entities!,
            keyPoints: analysisData.keyPoints,
            themes: analysisData.themes,
            metrics: analysisData.metrics!,
            quality: analysisData.quality!,
            recommendations: analysisData.recommendations!,
            createdAt: new Date().toISOString(),
        };

        this.db.data.analyses.push(analysis);
        await this.db.write();

        return analysis;
    }

    async getAnalysis(analysisId: string): Promise<Analysis> {
        await this.db.read();
        const analysis = this.db.data.analyses.find((a) => a.id === analysisId);
        if (!analysis) {
            throw new Error(`Analysis ${analysisId} not found`);
        }
        return analysis;
    }

    async getAnalysesByProject(projectId: string): Promise<Analysis[]> {
        await this.db.read();
        return this.db.data.analyses.filter((a) => a.projectId === projectId);
    }

    // =============================================================================
    // BLUEPRINT
    // =============================================================================

    async createBlueprint(blueprintData: Partial<Blueprint>): Promise<Blueprint> {
        await this.db.read();

        const blueprint: Blueprint = {
            id: crypto.randomUUID(),
            projectId: blueprintData.projectId!,
            analysisId: blueprintData.analysisId!,
            slides: blueprintData.slides!,
            metadata: blueprintData.metadata!,
            structure: blueprintData.structure,
            dataUsageStats: blueprintData.dataUsageStats,
            validationWarnings: blueprintData.validationWarnings || [],
            visualStyle: blueprintData.visualStyle,
            status: 'draft',
            createdAt: new Date().toISOString(),
        };

        this.db.data.blueprints.push(blueprint);
        await this.db.write();

        return blueprint;
    }

    async getBlueprint(blueprintId: string): Promise<Blueprint> {
        await this.db.read();
        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            throw new Error(`Blueprint ${blueprintId} not found`);
        }
        return blueprint;
    }

    async getBlueprintsByProject(projectId: string): Promise<Blueprint[]> {
        await this.db.read();
        return this.db.data.blueprints.filter((b) => b.projectId === projectId);
    }

    async updateBlueprint(blueprintId: string, updates: Partial<Blueprint>): Promise<Blueprint> {
        await this.db.read();
        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);

        if (!blueprint) {
            throw new Error(`Blueprint ${blueprintId} not found`);
        }

        Object.assign(blueprint, updates);
        blueprint.updatedAt = new Date().toISOString();

        await this.db.write();
        return blueprint;
    }

    // =============================================================================
    // SLIDE CONTENT - теперь хранится внутри blueprint.slides
    // =============================================================================

    /**
     * Обновить content для конкретного слайда в blueprint
     */
    async updateSlideContent(
        blueprintId: string,
        slideId: string,
        content: any,
        contentMetadata?: any
    ): Promise<BlueprintSlide> {
        await this.db.read();

        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            throw new Error(`Blueprint ${blueprintId} not found`);
        }

        const slide = blueprint.slides.find((s) => s.id === slideId);
        if (!slide) {
            throw new Error(`Slide ${slideId} not found in blueprint ${blueprintId}`);
        }

        // Update slide content
        slide.content = content;
        if (contentMetadata) {
            slide.contentMetadata = contentMetadata;
        }

        blueprint.updatedAt = new Date().toISOString();
        await this.db.write();

        return slide;
    }

    /**
     * Получить content конкретного слайда
     */
    async getSlideContent(blueprintId: string, slideId: string): Promise<any | null> {
        await this.db.read();

        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            return null;
        }

        const slide = blueprint.slides.find((s) => s.id === slideId);
        return slide?.content || null;
    }

    /**
     * Получить все слайды с контентом из blueprint
     */
    async getSlideContentsByBlueprint(blueprintId: string): Promise<BlueprintSlide[]> {
        await this.db.read();

        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            return [];
        }

        // Возвращаем только слайды, у которых есть content
        return blueprint.slides.filter((s) => s.content !== undefined);
    }

    /**
     * Массово обновить content для нескольких слайдов
     */
    async updateMultipleSlideContents(
        blueprintId: string,
        slideContents: Array<{ slideId: string; content: any; contentMetadata?: any }>
    ): Promise<void> {
        await this.db.read();

        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            throw new Error(`Blueprint ${blueprintId} not found`);
        }

        for (const { slideId, content, contentMetadata } of slideContents) {
            const slide = blueprint.slides.find((s) => s.id === slideId);
            if (slide) {
                slide.content = content;
                if (contentMetadata) {
                    slide.contentMetadata = contentMetadata;
                }
            }
        }

        blueprint.updatedAt = new Date().toISOString();
        await this.db.write();
    }

    // =============================================================================
    // SPEAKER NOTES - теперь хранится внутри blueprint.slides
    // =============================================================================

    /**
     * Обновить speaker notes для конкретного слайда
     */
    async updateSpeakerNotes(
        blueprintId: string,
        slideId: string,
        speakerNotes: any
    ): Promise<BlueprintSlide> {
        await this.db.read();

        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            throw new Error(`Blueprint ${blueprintId} not found`);
        }

        const slide = blueprint.slides.find((s) => s.id === slideId);
        if (!slide) {
            throw new Error(`Slide ${slideId} not found in blueprint ${blueprintId}`);
        }

        slide.speakerNotes = speakerNotes;
        blueprint.updatedAt = new Date().toISOString();
        await this.db.write();

        return slide;
    }

    /**
     * Получить speaker notes конкретного слайда
     */
    async getSpeakerNotes(blueprintId: string, slideId: string): Promise<any | null> {
        await this.db.read();

        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            return null;
        }

        const slide = blueprint.slides.find((s) => s.id === slideId);
        return slide?.speakerNotes || null;
    }

    /**
     * Получить все speaker notes из blueprint
     */
    async getSpeakerNotesByBlueprint(blueprintId: string): Promise<Array<{ slideId: string; speakerNotes: any }>> {
        await this.db.read();

        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            return [];
        }

        // Возвращаем только слайды, у которых есть speakerNotes
        return blueprint.slides
            .filter((s) => s.speakerNotes !== undefined)
            .map((s) => ({
                slideId: s.id,
                speakerNotes: s.speakerNotes,
            }));
    }

    /**
     * Массово обновить speaker notes для нескольких слайдов
     */
    async updateMultipleSpeakerNotes(
        blueprintId: string,
        notesData: Array<{ slideId: string; speakerNotes: any }>
    ): Promise<void> {
        await this.db.read();

        const blueprint = this.db.data.blueprints.find((b) => b.id === blueprintId);
        if (!blueprint) {
            throw new Error(`Blueprint ${blueprintId} not found`);
        }

        for (const { slideId, speakerNotes } of notesData) {
            const slide = blueprint.slides.find((s) => s.id === slideId);
            if (slide) {
                slide.speakerNotes = speakerNotes;
            }
        }

        blueprint.updatedAt = new Date().toISOString();
        await this.db.write();
    }
}

export const db = new DatabaseService();