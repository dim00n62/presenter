// backend/src/db/index.ts

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import {
    Database,
    Project,
    Document,
    Chunk,
    Embedding,
    Analysis,
    Blueprint
} from '../types/database.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultData: Database = {
    projects: [],
    documents: [],
    chunks: [],
    embeddings: [],
    analyses: [],
    blueprints: [],
    generations: [],
    speakerNotes: [],
};

class DatabaseService {
    public db!: Low<Database>;
    private initialized = false;

    async init() {
        if (this.initialized) return;

        const dbPath = process.env.DB_PATH || join(__dirname, '../../data/db.json');
        const dbDir = dirname(dbPath);

        // Ensure data directory exists
        if (!existsSync(dbDir)) {
            mkdirSync(dbDir, { recursive: true });
            console.log(`📁 Created data directory: ${dbDir}`);
        }

        const adapter = new JSONFile<Database>(dbPath);
        this.db = new Low(adapter, defaultData);

        await this.db.read();
        this.db.data ||= defaultData;

        // Ensure all collections exist
        this.db.data.projects ||= [];
        this.db.data.documents ||= [];
        this.db.data.chunks ||= [];
        this.db.data.embeddings ||= [];
        this.db.data.analyses ||= [];
        this.db.data.blueprints ||= [];
        this.db.data.generations ||= [];
        this.db.data.speakerNotes ||= [];

        await this.db.write();

        this.initialized = true;
        console.log('✅ Database initialized at:', dbPath);
        console.log(`📊 Current data: ${this.db.data.projects.length} projects, ${this.db.data.documents.length} documents`);
    }

    // ==================== PROJECTS ====================

    async createProject(project: Project): Promise<Project> {
        await this.db.read();
        this.db.data.projects.push(project);
        await this.db.write();
        console.log(`✅ Project created: ${project.name} (${project.id})`);
        return project;
    }

    async getProject(id: string): Promise<Project | undefined> {
        await this.db.read();
        return this.db.data.projects.find(p => p.id === id);
    }

    async getAllProjects(): Promise<Project[]> {
        await this.db.read();
        return this.db.data.projects.filter(p => p.status === 'active');
    }

    async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
        await this.db.read();
        const project = this.db.data.projects.find(p => p.id === id);
        if (project) {
            Object.assign(project, updates);
            project.updatedAt = new Date().toISOString();
            await this.db.write();
        }
        return project;
    }

    async deleteProject(id: string): Promise<boolean> {
        await this.db.read();
        const project = this.db.data.projects.find(p => p.id === id);
        if (project) {
            project.status = 'archived';
            project.updatedAt = new Date().toISOString();
            await this.db.write();
            return true;
        }
        return false;
    }

    // ==================== DOCUMENTS ====================

    async createDocument(doc: Omit<Document, 'id' | 'uploadedAt' | 'status'>): Promise<Document> {
        await this.db.read();
        const document: Document = {
            ...doc,
            id: crypto.randomUUID(),
            uploadedAt: new Date().toISOString(),
            status: 'uploaded',
        };
        this.db.data.documents.push(document);
        await this.db.write();
        console.log(`📄 Document created: ${document.originalName} (${document.id})`);
        return document;
    }

    async updateDocument(id: string, updates: Partial<Document>): Promise<Document | undefined> {
        await this.db.read();
        const doc = this.db.data.documents.find(d => d.id === id);
        if (doc) {
            Object.assign(doc, updates);
            await this.db.write();
        }
        return doc;
    }

    async getDocument(id: string): Promise<Document | undefined> {
        await this.db.read();
        return this.db.data.documents.find(d => d.id === id);
    }

    async getDocumentsByProject(projectId: string): Promise<Document[]> {
        await this.db.read();
        return this.db.data.documents.filter(d => d.projectId === projectId);
    }

    // ==================== CHUNKS ====================

    async createChunks(chunks: Omit<Chunk, 'id'>[]): Promise<Chunk[]> {
        await this.db.read();
        const newChunks = chunks.map(chunk => ({
            ...chunk,
            id: crypto.randomUUID(),
        }));
        this.db.data.chunks.push(...newChunks);
        await this.db.write();
        console.log(`📦 Created ${newChunks.length} chunks`);
        return newChunks;
    }

    async getChunksByDocument(documentId: string): Promise<Chunk[]> {
        await this.db.read();
        return this.db.data.chunks.filter(c => c.documentId === documentId);
    }

    async getChunk(id: string): Promise<Chunk | undefined> {
        await this.db.read();
        return this.db.data.chunks.find(c => c.id === id);
    }

    async getAllChunks(): Promise<Chunk[]> {
        await this.db.read();
        return this.db.data.chunks;
    }

    // ==================== EMBEDDINGS ====================

    async createEmbeddings(embeddings: Omit<Embedding, 'id' | 'createdAt'>[]): Promise<Embedding[]> {
        await this.db.read();
        const newEmbeddings = embeddings.map(emb => ({
            ...emb,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        }));
        this.db.data.embeddings.push(...newEmbeddings);
        await this.db.write();
        console.log(`🔢 Created ${newEmbeddings.length} embeddings`);
        return newEmbeddings;
    }

    async getEmbeddingsByChunks(chunkIds: string[]): Promise<Embedding[]> {
        await this.db.read();
        return this.db.data.embeddings.filter(e => chunkIds.includes(e.chunkId));
    }

    async getEmbedding(chunkId: string): Promise<Embedding | undefined> {
        await this.db.read();
        return this.db.data.embeddings.find(e => e.chunkId === chunkId);
    }

    // ==================== RAG SEARCH ====================

    async searchSimilarChunks(queryVector: number[], topK = 5): Promise<Array<{
        chunk: Chunk;
        similarity: number;
    }>> {
        await this.db.read();

        // Calculate cosine similarity for all embeddings
        const similarities = this.db.data.embeddings.map(emb => {
            const similarity = this.cosineSimilarity(queryVector, emb.vector);
            return { embedding: emb, similarity };
        });

        // Sort by similarity (descending)
        similarities.sort((a, b) => b.similarity - a.similarity);

        // Take top K
        const topResults = similarities.slice(0, topK);

        // Get corresponding chunks
        const chunkIds = topResults.map(r => r.embedding.chunkId);
        const chunks = this.db.data.chunks.filter(c => chunkIds.includes(c.id));

        return topResults.map(r => {
            const chunk = chunks.find(c => c.id === r.embedding.chunkId);
            if (!chunk) {
                throw new Error(`Chunk not found for embedding: ${r.embedding.chunkId}`);
            }
            return {
                chunk,
                similarity: r.similarity,
            };
        });
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('Vectors must have same length');
        }

        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }

    // ==================== ANALYSES ====================

    async createAnalysis(analysis: Omit<Analysis, 'id' | 'createdAt'>): Promise<Analysis> {
        await this.db.read();
        const newAnalysis: Analysis = {
            ...analysis,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
        this.db.data.analyses.push(newAnalysis);
        await this.db.write();
        console.log(`🔍 Analysis created: ${newAnalysis.id}`);
        return newAnalysis;
    }

    async getAnalysesByProject(projectId: string): Promise<Analysis[]> {
        await this.db.read();
        return this.db.data.analyses
            .filter(a => a.projectId === projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async getLatestAnalysis(projectId: string): Promise<Analysis | undefined> {
        const analyses = await this.getAnalysesByProject(projectId);
        return analyses[0];
    }

    // ==================== BLUEPRINTS ====================

    async createBlueprint(blueprint: Omit<Blueprint, 'id' | 'createdAt'>): Promise<Blueprint> {
        await this.db.read();
        const newBlueprint: Blueprint = {
            ...blueprint,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        };
        this.db.data.blueprints.push(newBlueprint);
        await this.db.write();
        console.log(`📐 Blueprint created: ${newBlueprint.id}`);
        return newBlueprint;
    }

    async updateBlueprint(id: string, updates: Partial<Blueprint>): Promise<Blueprint | undefined> {
        await this.db.read();
        const blueprint = this.db.data.blueprints.find(b => b.id === id);
        if (blueprint) {
            Object.assign(blueprint, updates);
            blueprint.updatedAt = new Date().toISOString();
            await this.db.write();
        }
        return blueprint;
    }

    async getBlueprintsByProject(projectId: string): Promise<Blueprint[]> {
        await this.db.read();
        return this.db.data.blueprints
            .filter(b => b.projectId === projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async getLatestBlueprint(projectId: string, status?: 'draft' | 'approved' | 'rejected'): Promise<Blueprint | undefined> {
        await this.db.read();
        let blueprints = this.db.data.blueprints
            .filter(b => b.projectId === projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (status) {
            blueprints = blueprints.filter(b => b.status === status);
        }

        return blueprints[0];
    }

    // ==================== GENERATIONS ====================

    async createGeneration(generation: any): Promise<any> {
        await this.db.read();
        const newGeneration = {
            ...generation,
            id: generation.id || crypto.randomUUID(),
            createdAt: generation.createdAt || new Date().toISOString(),
        };
        this.db.data.generations = this.db.data.generations || [];
        this.db.data.generations.push(newGeneration);
        await this.db.write();
        console.log(`✨ Generation created: ${newGeneration.id}`);
        return newGeneration;
    }

    async getGenerationsByProject(projectId: string): Promise<any[]> {
        await this.db.read();
        this.db.data.generations = this.db.data.generations || [];
        return this.db.data.generations
            .filter((g: any) => g.projectId === projectId)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async getLatestGeneration(projectId: string): Promise<any | undefined> {
        const generations = await this.getGenerationsByProject(projectId);
        return generations[0];
    }

    // ==================== SPEAKER NOTES ====================

    async createSpeakerNotes(speakerNotes: any): Promise<any> {
        await this.db.read();
        const newSpeakerNotes = {
            ...speakerNotes,
            id: speakerNotes.id || crypto.randomUUID(),
            createdAt: speakerNotes.createdAt || new Date().toISOString(),
        };
        this.db.data.speakerNotes = this.db.data.speakerNotes || [];
        this.db.data.speakerNotes.push(newSpeakerNotes);
        await this.db.write();
        console.log(`🎤 Speaker notes created: ${newSpeakerNotes.id}`);
        return newSpeakerNotes;
    }

    async getSpeakerNotesByProject(projectId: string): Promise<any[]> {
        await this.db.read();
        this.db.data.speakerNotes = this.db.data.speakerNotes || [];
        return this.db.data.speakerNotes
            .filter((sn: any) => sn.projectId === projectId)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    async getLatestSpeakerNotes(projectId: string): Promise<any | undefined> {
        const speakerNotes = await this.getSpeakerNotesByProject(projectId);
        return speakerNotes[0];
    }

    // ==================== UTILITY ====================

    async clearAll(): Promise<void> {
        await this.db.read();
        this.db.data = defaultData;
        await this.db.write();
        console.log('🗑️ Database cleared');
    }

    async getStats(): Promise<any> {
        await this.db.read();
        return {
            projects: this.db.data.projects.length,
            documents: this.db.data.documents.length,
            chunks: this.db.data.chunks.length,
            embeddings: this.db.data.embeddings.length,
            analyses: this.db.data.analyses.length,
            blueprints: this.db.data.blueprints.length,
            generations: this.db.data.generations?.length || 0,
            speakerNotes: this.db.data.speakerNotes?.length || 0,
        };
    }
}

export const db = new DatabaseService();