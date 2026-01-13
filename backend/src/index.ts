// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import 'dotenv/config'
import { db } from './db/index.js';
import { blueprintsRouter } from './routes/blueprints.js';
import { uploadRouter } from './routes/upload.js';
import { ragRouter } from './routes/rag.js';
import { projectsRouter } from './routes/projects.js';
import { analysisRouter } from './routes/analysis.js';
import { generationRouter } from './routes/generation.js';
import { speakerNotesRouter } from './routes/speaker-notes.js';
import { healthRouter } from './routes/health.js';
import { presentationsRouter } from './routes/presentations.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
await db.init();

// Routes
app.use('/api/documents', uploadRouter);
app.use('/api/rag', ragRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/blueprints', blueprintsRouter);
app.use('/api/generation', generationRouter);
app.use('/api/speaker-notes', speakerNotesRouter);
app.use('/api/presentations', presentationsRouter);
app.use('/health', healthRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            database: db ? 'connected' : 'disconnected',
            qwen: process.env.QWEN_API_URL ? 'configured' : 'not configured'
        }
    });
});

// Error handling
app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error:', err);
    res.status(500).json({
        error: err.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${process.env.DB_PATH || './data/db.json'}`);
    console.log(`🤖 Qwen API: ${process.env.QWEN_API_URL}`);
});