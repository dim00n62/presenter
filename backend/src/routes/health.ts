// backend/src/routes/health.ts (новый файл)

import { Router } from 'express';
import { qwenClient } from '../services/qwen-client.js';
import { db } from '../db/index.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
    try {
        const [qwenHealthy, dbStats] = await Promise.all([
            qwenClient.healthCheck(),
            db.getStats(),
        ]);

        const status = {
            status: qwenHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            services: {
                qwen: {
                    status: qwenHealthy ? 'up' : 'down',
                    retryConfig: qwenClient.getRetryConfig(),
                },
                database: {
                    status: 'up',
                    stats: dbStats,
                },
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
        };

        res.status(qwenHealthy ? 200 : 503).json(status);
    } catch (error: any) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

export default healthRouter;
