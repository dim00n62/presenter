// backend/src/routes/speaker-notes.ts

import { Router } from 'express';
import { speakerNotesAgent } from '../agents/speaker-notes-agent.js';
import { db } from '../db/index.js';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';

export const speakerNotesRouter = Router();

// Generate speaker notes
speakerNotesRouter.post('/generate', async (req, res) => {
    try {
        const { projectId } = req.body;

        // Get blueprint with content
        await db.db.read();

        const blueprint = db.db.data.blueprints
            .filter(b => b.projectId === projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!blueprint) {
            return res.status(404).json({ error: 'Blueprint не найден' });
        }

        // Check if slides have content
        const slidesWithContent = blueprint.slides.filter(s => s.content);
        if (slidesWithContent.length === 0) {
            return res.status(404).json({
                error: 'Контент не сгенерирован. Сначала сгенерируйте контент слайдов.'
            });
        }

        console.log('🎤 Генерация speaker notes для', slidesWithContent.length, 'слайдов...');

        // Generate speaker notes for each slide
        const speakerNotes = await speakerNotesAgent.generateForPresentation(
            blueprint
        );

        // Update slides with speaker notes in blueprint
        for (let i = 0; i < speakerNotes.length; i++) {
            const note = speakerNotes[i];
            const slide = blueprint.slides.find(s => s.id === note.slideId);
            if (slide) {
                slide.speakerNotes = note.speakerNotes;
            }
        }

        blueprint.updatedAt = new Date().toISOString();
        await db.db.write();

        res.json({
            success: true,
            speakerNotes: speakerNotes,
            totalDuration: speakerNotes.reduce((sum, n) =>
                sum + (n.speakerNotes?.timing?.estimated || 60), 0
            ),
        });

    } catch (error: any) {
        console.error('Speaker notes generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get speaker notes for project
speakerNotesRouter.get('/project/:projectId', async (req, res) => {
    try {
        await db.db.read();

        const blueprint = db.db.data.blueprints
            .filter(b => b.projectId === req.params.projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!blueprint) {
            // Return empty array - blueprint not created yet
            return res.json([]);
        }

        // Extract speaker notes from slides
        const speakerNotes = blueprint.slides
            .filter(s => s.speakerNotes)
            .map(s => ({
                slideId: s.id,
                speakerNotes: s.speakerNotes,
            }));

        res.json(speakerNotes);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get speaker notes for project
speakerNotesRouter.post('/project/:projectId', async (req, res) => {
    try {
        const notes = req.body;
        await db.db.read();

        const blueprint = db.db.data.blueprints
            .filter(b => b.projectId === req.params.projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!blueprint || Array.isArray(notes) === false) {
            return res.status(404).json({ error: 'Speaker notes не найден' });
        }

        blueprint.slides.forEach((slide, index) => {
            slide.speakerNotes[index] = notes.find((n: any) => n.slideId === slide.id)?.speakerNotes || slide.speakerNotes;
        });

        res.status(200).json({ success: true });
        await db.db.write();

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Export to DOCX
speakerNotesRouter.get('/export-docx/:projectId', async (req, res) => {
    try {
        await db.db.read();

        const blueprint = db.db.data.blueprints
            .filter(b => b.projectId === req.params.projectId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!blueprint) {
            return res.status(404).json({ error: 'Blueprint не найден' });
        }

        // Get slides with speaker notes
        const slidesWithNotes = blueprint.slides.filter(s => s.speakerNotes);

        if (slidesWithNotes.length === 0) {
            return res.status(404).json({ error: 'Speaker notes не найдены' });
        }

        console.log('📄 Создание DOCX файла...');

        // Create DOCX document
        const children: any[] = [
            new Paragraph({
                text: 'Текст для выступления',
                heading: HeadingLevel.TITLE,
            }),
            new Paragraph({ text: '' }),
        ];

        slidesWithNotes.forEach((slide, idx: number) => {
            const speakerNotes = slide.speakerNotes;

            if (!speakerNotes) {
                console.warn(`⚠️ Пропускаем слайд ${idx + 1} - нет speaker notes`);
                return;
            }

            // Slide number
            children.push(
                new Paragraph({
                    text: `Слайд ${idx + 1}`,
                    heading: HeadingLevel.HEADING_1,
                }),
                new Paragraph({ text: '' })
            );

            // Intro
            if (speakerNotes.intro) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Вступление: ', bold: true }),
                            new TextRun({ text: speakerNotes.intro }),
                        ],
                    }),
                    new Paragraph({ text: '' })
                );
            }

            // Body
            if (speakerNotes.body) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Основной текст: ', bold: true }),
                        ],
                    }),
                    new Paragraph({
                        text: speakerNotes.body,
                    }),
                    new Paragraph({ text: '' })
                );
            }

            // Transition
            if (speakerNotes.transition) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Переход: ', bold: true }),
                            new TextRun({ text: speakerNotes.transition }),
                        ],
                    }),
                    new Paragraph({ text: '' })
                );
            }

            // Key points
            if (speakerNotes.keyPoints && speakerNotes.keyPoints.length > 0) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Ключевые пункты: ', bold: true }),
                        ],
                    })
                );

                speakerNotes.keyPoints.forEach((point: any) => {
                    const pointText = typeof point === 'string' ? point :
                        (point && point.main) ? point.main :
                            String(point);

                    children.push(
                        new Paragraph({
                            text: `• ${pointText}`,
                            bullet: { level: 0 },
                        })
                    );
                });

                children.push(new Paragraph({ text: '' }));
            }

            // Timing
            if (speakerNotes.timing) {
                children.push(
                    new Paragraph({
                        text: `⏱️ Время выступления: ~${speakerNotes.timing.estimated} секунд`,
                        italics: true,
                    }),
                    new Paragraph({ text: '' })
                );
            }

            // Separator
            children.push(
                new Paragraph({ text: '─'.repeat(50) }),
                new Paragraph({ text: '' })
            );
        });

        // Create document
        const doc = new Document({
            sections: [{
                properties: {},
                children,
            }],
        });

        // Generate buffer
        const buffer = await Packer.toBuffer(doc);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="speaker-notes_${Date.now()}.docx"`);
        res.send(buffer);

        console.log('✅ DOCX файл создан');

    } catch (error: any) {
        console.error('DOCX export error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default speakerNotesRouter;
