// backend/src/routes/blueprint.ts
import { Router } from 'express';
import { db } from '../db/index.js';
import { blueprintAgent } from '../agents/blueprint-agent.js';
import { Blueprint } from '../types/database.js';

export const blueprintsRouter = Router();

// Create blueprint from analysis
blueprintsRouter.post('/create', async (req, res) => {
    try {
        const { projectId, userPreferences } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId обязателен' });
        }

        // Get latest analysis
        await db.db.read();
        const analyses = db.db.data.analyses
            .filter(a => a.projectId === projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (analyses.length === 0) {
            return res.status(404).json({
                error: 'Анализ не найден',
                hint: 'Сначала запустите анализ документов'
            });
        }

        const latestAnalysis = analyses[0];
        console.log(`📐 Создание blueprint для проекта ${projectId}`);

        const blueprint = await blueprintAgent.createBlueprint(
            projectId,
            latestAnalysis,
            userPreferences
        );

        // Save to DB
        const blueprintRecord: Blueprint = {
            id: crypto.randomUUID(),
            projectId,
            analysisId: latestAnalysis.id,
            slides: blueprint.slides,
            metadata: blueprint.metadata,
            structure: blueprint.structure,
            dataUsageStats: blueprint.dataUsageStats,
            validationWarnings: blueprint.validationWarnings,
            status: 'draft',
            createdAt: new Date().toISOString(),
        };

        db.db.data.blueprints.push(blueprintRecord);
        await db.db.write();

        res.json({
            success: true,
            blueprint: blueprintRecord
        });

    } catch (error) {
        console.error('Blueprint creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get blueprint for project
blueprintsRouter.get('/project/:projectId', async (req, res) => {
    try {
        await db.db.read();
        const blueprints = db.db.data.blueprints
            .filter(b => b.projectId === req.params.projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (blueprints.length === 0) {
            return res.status(404).json({
                error: 'Blueprint не найден',
                hint: 'Создайте blueprint на основе анализа'
            });
        }

        res.json({ blueprint: blueprints[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update blueprint (reorder, edit titles, etc)
blueprintsRouter.put('/:id', async (req, res) => {
    try {
        const { slides, metadata } = req.body;

        await db.db.read();
        const blueprint = db.db.data.blueprints.find(b => b.id === req.params.id);

        if (!blueprint) {
            return res.status(404).json({ error: 'Blueprint не найден' });
        }

        if (slides) {
            // Validate slide order
            const slideIds = new Set(slides.map((s: any) => s.id));
            const originalIds = new Set(blueprint.slides.map(s => s.id));

            if (slideIds.size !== originalIds.size ||
                ![...slideIds].every(id => originalIds.has(id))) {
                return res.status(400).json({
                    error: 'Некорректные слайды',
                    hint: 'ID слайдов должны совпадать с оригинальными'
                });
            }

            blueprint.slides = slides;
        }

        if (metadata) {
            blueprint.metadata = { ...blueprint.metadata, ...metadata };
        }

        blueprint.updatedAt = new Date().toISOString();
        await db.db.write();

        res.json({ success: true, blueprint });
    } catch (error) {
        console.error('Blueprint update error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Approve blueprint
blueprintsRouter.post('/:id/approve', async (req, res) => {
    try {
        await db.db.read();
        const blueprint = db.db.data.blueprints.find(b => b.id === req.params.id);

        if (!blueprint) {
            return res.status(404).json({ error: 'Blueprint не найден' });
        }

        blueprint.status = 'approved';
        blueprint.approvedAt = new Date().toISOString();
        await db.db.write();

        console.log(`✅ Blueprint ${blueprint.id} одобрен`);

        res.json({ success: true, blueprint });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default blueprintsRouter;
