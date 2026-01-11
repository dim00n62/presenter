// backend/src/routes/speaker-notes.ts

import { Router } from 'express';
import { speakerNotesAgent } from '../agents/speaker-notes-agent.js';
import { db } from '../db/index.js';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export const speakerNotesRouter = Router();

// Generate speaker notes
speakerNotesRouter.post('/generate', async (req, res) => {
    try {
        const { projectId } = req.body;

        // Get blueprint and content
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
            return res.status(404).json({ error: 'Контент не сгенерирован' });
        }

        console.log('🎤 Генерация speaker notes...');

        const speakerNotes = await speakerNotesAgent.generateForPresentation(
            blueprint,
            generation.slideContents
        );

        // Save to DB
        const record = {
            id: crypto.randomUUID(),
            projectId,
            blueprintId: blueprint.id,
            notes: speakerNotes,
            createdAt: new Date().toISOString(),
        };

        await db.createSpeakerNotes(record);

        res.json({
            success: true,
            speakerNotes: speakerNotes,
            totalDuration: speakerNotes.reduce((sum, n) => sum + n.speakerNotes.timing.estimated, 0),
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

        const speakerNotesRecord = db.db.data.speakerNotes
            ?.filter((sn: any) => sn.projectId === req.params.projectId)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        if (!speakerNotesRecord) {
            return res.status(404).json({ error: 'Speaker notes не найдены' });
        }

        res.json({
            speakerNotes: speakerNotesRecord.notes,
            totalDuration: speakerNotesRecord.notes.reduce((sum: number, n: any) =>
                sum + (n.speakerNotes?.timing?.estimated || 60), 0
            ),
        });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Export to DOCX
speakerNotesRouter.get('/export-docx/:projectId', async (req, res) => {
    try {
        const speakerNotesRecord = await db.getLatestSpeakerNotes(req.params.projectId);

        if (!speakerNotesRecord) {
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

        speakerNotesRecord.notes.forEach((note: any, idx: number) => {
            // Проверяем что note валидный
            if (!note.speakerNotes) {
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
            if (note.speakerNotes.intro) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Вступление: ', bold: true }),
                            new TextRun({ text: note.speakerNotes.intro }),
                        ],
                    }),
                    new Paragraph({ text: '' })
                );
            }

            // Body
            if (note.speakerNotes.body) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Основной текст: ', bold: true }),
                        ],
                    }),
                    new Paragraph({
                        text: note.speakerNotes.body,
                    }),
                    new Paragraph({ text: '' })
                );
            }

            // Transition
            if (note.speakerNotes.transition) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Переход: ', bold: true }),
                            new TextRun({ text: note.speakerNotes.transition }),
                        ],
                    }),
                    new Paragraph({ text: '' })
                );
            }

            // Key points
            if (note.speakerNotes.keyPoints && note.speakerNotes.keyPoints.length > 0) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Ключевые пункты: ', bold: true }),
                        ],
                    })
                );

                note.speakerNotes.keyPoints.forEach((point: any) => {
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
            if (note.speakerNotes.timing) {
                children.push(
                    new Paragraph({
                        text: `⏱️ Время выступления: ~${note.speakerNotes.timing.estimated} секунд`,
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