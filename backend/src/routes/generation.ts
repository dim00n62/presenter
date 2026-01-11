// backend/src/routes/generation.ts
import { Router } from 'express';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '../db/index.js';
import { contentAgent } from '../agents/content-agent.js';
import { generatePresentation } from '../services/pptx-generator.js';
import { EThemeName } from '../services/pptx-themes.js';

export const generationRouter = Router();

// Generate content for all slides
generationRouter.post('/generate', async (req, res) => {
    try {
        const { projectId } = req.body;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId обязателен' });
        }

        // Get approved blueprint
        await db.db.read();
        const blueprints = db.db.data.blueprints
            .filter(b => b.projectId === projectId && b.status === 'approved')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (blueprints.length === 0) {
            return res.status(404).json({
                error: 'Утвержденный blueprint не найден',
                hint: 'Сначала утвердите структуру презентации'
            });
        }

        const blueprint = blueprints[0];
        console.log(`📝 Генерация контента для ${blueprint.slides.length} слайдов`);

        const slideContents = await contentAgent.generateAllSlides(
            projectId,
            blueprint
        );

        // Save to DB (optional - for preview)
        const generationRecord = {
            id: crypto.randomUUID(),
            projectId,
            blueprintId: blueprint.id,
            slideContents,
            status: 'completed',
            createdAt: new Date().toISOString(),
        };

        // Store in a new collection or as part of blueprint
        if (!db.db.data.generations) {
            db.db.data.generations = [];
        }
        db.db.data.generations.push(generationRecord);
        await db.db.write();

        res.json({
            success: true,
            generation: generationRecord,
            slideCount: slideContents.length,
        });

    } catch (error) {
        console.error('Content generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export final PPTX
generationRouter.get('/export-pptx/:projectId', async (req, res) => {
    try {
        const { options, includeSpeakerNotes } = req.body;
        const projectId = req.params.projectId;

        if (!projectId) {
            return res.status(400).json({ error: 'projectId обязателен' });
        }

        const project = await db.getProject(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Проект не найден' });
        }

        await db.db.read();

        const blueprint = db.db.data.blueprints
            .filter(b => b.projectId === projectId && b.status === 'approved')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!blueprint) {
            return res.status(404).json({ error: 'Утвержденный blueprint не найден' });
        }

        const generation = db.db.data.generations
            ?.filter((g: any) => g.projectId === projectId)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!generation) {
            return res.status(404).json({
                error: 'Контент не сгенерирован',
                hint: 'Сначала запустите генерацию контента'
            });
        }

        console.log('🎨 Создание PPTX презентации...');

        const pptxOptions = {
            title: project.name,
            author: options?.author || 'Enterprise Presentation Agent',
            company: options?.company || 'Сбербанк',
            theme: options?.theme || EThemeName.SBER_MAIN,
        };

        const buffer = await generatePresentation(
            blueprint,
            generation.slideContents,
            pptxOptions,
        );

        const filename = `${project.name.replace(/[^a-zа-яё0-9]/gi, '_')}_${Date.now()}.pptx`;
        const filepath = join(process.env.UPLOAD_DIR || './uploads', filename);

        const timestamp = Date.now();
        const safeFilename = `presentation_${timestamp}.pptx`;

        const utf8Filename = `${project.name}_${timestamp}.pptx`;
        const encodedFilename = encodeURIComponent(utf8Filename);

        await writeFile(filepath, buffer);

        console.log(`✅ Презентация сохранена: ${safeFilename}`);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`
        );
        res.send(buffer);

    } catch (error) {
        console.error('PPTX export error:', error);
        res.status(500).json({ error: error.message });
    }
});
// Get generation status
generationRouter.get('/project/:projectId/status', async (req, res) => {
    try {
        await db.db.read();
        const generation = db.db.data.generations
            ?.filter((g: any) => g.projectId === req.params.projectId)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!generation) {
            return res.status(404).json({
                error: 'Генерация не найдена',
                hasContent: false
            });
        }

        res.json({
            hasContent: true,
            generation: {
                id: generation.id,
                slideCount: generation.slideContents.length,
                status: generation.status,
                createdAt: generation.createdAt,
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

generationRouter.get('/project/:projectId', async (req, res) => {
    try {
        await db.db.read();
        const generation = db.db.data.generations
            ?.find((g: any) => g.projectId === req.params.projectId);

        if (!generation) {
            return res.status(404).json({
                error: 'Генерация не найдена'
            });
        }

        res.json(generation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default generationRouter;