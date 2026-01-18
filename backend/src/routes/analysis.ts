// backend/src/routes/analysis.ts

import { Router } from 'express';
import { analysisAgent } from '../agents/analysis-agent.js';
import { db } from '../db/index.js';
import { analyzeService } from '../services/analyze.js';

export const analysisRouter = Router();

// Manual analysis (existing)
analysisRouter.post('/analyze', async (req, res) => {
    try {
        const { projectId } = req.body;

        // Get all documents for project
        await db.db.read();
        const documents = db.db.data.documents.filter((d: any) => d.projectId === projectId);
        const documentIds = documents.map((d: any) => d.id);

        if (documentIds.length === 0) {
            return res.status(400).json({ error: 'No documents found for analysis' });
        }

        // Run analysis
        const analysis = await analysisAgent.analyze(projectId, documentIds);

        // Save analysis
        await db.createAnalysis(analysis);

        res.json(analysis);
    } catch (error: any) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Server-Sent Events для прогресса
analysisRouter.get('/progress/:projectId', async (req, res) => {
    const { projectId } = req.params;

    // Setup SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial message
    res.write(`data: ${JSON.stringify({ status: 'connected', message: 'Подключено' })}\n\n`);

    // Register progress callback
    const unsubscribe = analyzeService.onProgress(projectId, (progress) => {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);

        // Close connection when complete or error
        if (progress.status === 'complete' || progress.status === 'error') {
            setTimeout(() => {
                res.end();
            }, 1000);
        }
    });

    // Cleanup on disconnect
    req.on('close', () => {
        unsubscribe();
        res.end();
    });
});

// Get latest analysis
analysisRouter.get('/project/:projectId', async (req, res) => {
    try {
        await db.db.read();

        const analyses = db.db.data.analyses
            ?.filter((a: any) => a.projectId === req.params.projectId)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Return array (empty if no analysis yet)
        res.json(analyses || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default analysisRouter;