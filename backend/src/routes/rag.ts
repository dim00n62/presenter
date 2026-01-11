import { Router } from 'express';
import { ragService } from '../services/rag-service.js';

export const ragRouter = Router();

ragRouter.post('/search', async (req, res) => {
    try {
        const { query, projectId, topK = 5 } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const results = await ragService.search(query, topK, projectId);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

ragRouter.post('/answer', async (req, res) => {
    try {
        const { question, projectId } = req.body;

        if (!question) {
            return res.status(400).json({ error: 'Question is required' });
        }

        const result = await ragService.answerQuestion(question, projectId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default ragRouter;