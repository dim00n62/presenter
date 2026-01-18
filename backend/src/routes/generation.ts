// backend/src/routes/generation.ts

import { Router } from 'express';
import { db } from '../db/index.js';
import { analysisAgent } from '../agents/analysis-agent.js';
import { contentAgent } from '../agents/content-agent.js';
import { generatePresentation } from '../services/pptx-generator.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// =============================================================================
// РУЧНЫЕ ЭТАПЫ ГЕНЕРАЦИИ
// =============================================================================

/**
 * Шаг 1: Запустить анализ документов
 * POST /api/generation/projects/:id/analyze
 */
router.post('/projects/:id/analyze', async (req, res) => {
    try {
        const { id: projectId } = req.params;

        console.log('🔍 Starting manual analysis for project', projectId);

        // Update status
        await db.updateProject(projectId, {
            status: 'parsing',
            progress: { analysis: 10 }
        });

        // Get documents
        const documents = await db.getDocumentsByProject(projectId);
        const documentIds = documents.map(d => d.id);

        if (documentIds.length === 0) {
            throw new Error('No documents found. Upload documents first.');
        }

        // Check if documents are parsed
        const unparsedDocs = documents.filter(d => d.status !== 'parsed');
        if (unparsedDocs.length > 0) {
            throw new Error(`${unparsedDocs.length} documents are not parsed yet. Wait for parsing to complete.`);
        }

        // Run analysis
        await db.updateProject(projectId, { progress: { analysis: 50 } });
        const analysis = await analysisAgent.analyze(projectId, documentIds);

        // Save analysis
        const savedAnalysis = await db.createAnalysis(analysis);
        await db.updateProject(projectId, {
            status: 'analyzed',
            analysisId: savedAnalysis.id,
            progress: { analysis: 100 }
        });

        console.log('✅ Analysis complete');

        res.json({
            success: true,
            analysisId: savedAnalysis.id,
            analysis: savedAnalysis
        });

    } catch (error: any) {
        console.error('❌ Analysis failed:', error);

        await db.updateProject(req.params.id, {
            status: 'error',
            errors: [error.message]
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Шаг 3: Сгенерировать контент для слайдов
 * POST /api/generation/projects/:id/content
 */
router.post('/projects/:id/content', async (req, res) => {
    try {
        const { id: projectId } = req.params;

        console.log('✍️ Generating content for project', projectId);

        await db.updateProject(projectId, {
            status: 'blueprint_ready',
            progress: { content: 10 }
        });

        // Get blueprint
        const project = await db.getProject(projectId);
        if (!project.blueprintId) {
            throw new Error('Blueprint not found. Create blueprint first.');
        }

        const blueprint = await db.getBlueprint(project.blueprintId);

        // Generate content
        await db.updateProject(projectId, { progress: { content: 30 } });
        const slideContents = await contentAgent.generateAllSlides(projectId, blueprint);

        // Save slide contents directly into blueprint.slides
        await db.updateMultipleSlideContents(
            blueprint.id,
            slideContents.map(sc => ({
                slideId: sc.slideId,
                content: sc.content,
                contentMetadata: sc.metadata
            }))
        );

        await db.updateProject(projectId, {
            status: 'content_generated',
            progress: { content: 100 }
        });

        console.log('✅ Content generated for', slideContents.length, 'slides');

        res.json({
            success: true,
            contentCount: slideContents.length,
            slideContents: slideContents
        });

    } catch (error: any) {
        console.error('❌ Content generation failed:', error);

        await db.updateProject(req.params.id, {
            status: 'error',
            errors: [error.message]
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Шаг 4: Сгенерировать финальную PPTX презентацию
 * POST /api/generation/projects/:id/generate-pptx
 */
router.post('/projects/:id/generate-pptx', async (req, res) => {
    try {
        const { id: projectId } = req.params;

        console.log('🎨 Generating PPTX for project', projectId);

        await db.updateProject(projectId, {
            status: 'content_generated',
            progress: { generation: 10 }
        });

        // Get project data
        const project = await db.getProject(projectId);
        if (!project.blueprintId) {
            throw new Error('Blueprint not found. Complete previous steps first.');
        }

        const blueprint = await db.getBlueprint(project.blueprintId);

        // Get slides with content from blueprint
        const slidesWithContent = blueprint.slides.filter(s => s.content);

        if (slidesWithContent.length === 0) {
            throw new Error('No slide content found. Generate content first.');
        }

        console.log('📊 Generating presentation:', {
            slidesInBlueprint: blueprint.slides.length,
            slideContentsAvailable: slidesWithContent.length
        });

        // Generate PPTX
        await db.updateProject(projectId, { progress: { generation: 50 } });

        const pptxBuffer = await generatePresentation(
            blueprint,
            slidesWithContent,
            {
                title: project.name,
                author: 'Presentation Agent',
                company: 'Сбербанк',
                theme: 'SBER_MAIN'
            }
        );

        // Save file
        const filename = `presentation_${projectId}_${Date.now()}.pptx`;
        const outputDir = path.join(process.cwd(), 'outputs');
        const outputPath = path.join(outputDir, filename);

        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputPath, pptxBuffer);

        await db.updateProject(projectId, {
            status: 'presentation_ready',
            presentationFile: filename,
            progress: { generation: 100 }
        });

        console.log('✅ PPTX generated:', filename);

        res.json({
            success: true,
            filename: filename,
            downloadUrl: `/api/presentations/download/${filename}`
        });

    } catch (error: any) {
        console.error('❌ PPTX generation failed:', error);

        await db.updateProject(req.params.id, {
            status: 'error',
            errors: [error.message]
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// ПОЛУЧЕНИЕ ДАННЫХ
// =============================================================================

/**
 * Получить контент слайдов
 * GET /api/generation/projects/:id/content
 */
router.get('/projects/:id/content', async (req, res) => {
    try {
        const { id: projectId } = req.params;

        const project = await db.getProject(projectId);
        if (!project.blueprintId) {
            return res.status(404).json({
                success: false,
                error: 'Blueprint not found'
            });
        }

        const slideContents = await db.getSlideContentsByBlueprint(project.blueprintId);

        res.json({
            success: true,
            slideContents
        });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// PLAYGROUND: Тестирование дизайна
// =============================================================================

/**
 * Создать тестовую презентацию с примерами слайдов
 * POST /api/generation/playground/test-presentation
 */
router.post('/playground/test-presentation', async (req, res) => {
    try {
        const { theme = 'SBER_MAIN', includeCharts = true } = req.body;

        console.log('🎨 Creating test presentation');

        // Mock blueprint с примерами всех типов слайдов
        const mockBlueprint = {
            slides: [
                { id: '1', type: 'title', order: 0 },
                { id: '2', type: 'bullet_points', order: 1 },
                { id: '3', type: 'two_column', order: 2 },
                { id: '4', type: 'table', order: 3 },
                ...(includeCharts ? [{ id: '5', type: 'chart', order: 4 }] : []),
                { id: '6', type: 'section_divider', order: includeCharts ? 5 : 4 },
                { id: '7', type: 'summary', order: includeCharts ? 6 : 5 },
            ]
        };

        // Mock content с красивыми примерами
        const mockContents = [
            {
                slideId: '1',
                content: {
                    title: 'Цифровая трансформация банковских услуг',
                    subtitle: 'Стратегия развития на 2025-2027',
                    footer: ''
                }
            },
            {
                slideId: '2',
                content: {
                    title: 'Ключевые направления развития',
                    body: {
                        bullets: [
                            'Персонализация клиентского опыта на основе AI/ML',
                            'Open Banking и экосистемный подход',
                            {
                                main: 'Модернизация технологической платформы:',
                                sub: [
                                    'Миграция на облачную инфраструктуру',
                                    'Внедрение микросервисной архитектуры',
                                    'Автоматизация CI/CD процессов'
                                ]
                            },
                            'Развитие супер-приложения для B2C/B2B',
                            'Интеграция с Госуслугами и ЦПФР'
                        ]
                    }
                }
            },
            {
                slideId: '3',
                content: {
                    title: 'Текущее состояние vs Целевая модель',
                    body: {
                        leftColumn: {
                            title: 'Сейчас (As-Is)',
                            content: [
                                'Монолитная архитектура',
                                'On-premise инфраструктура',
                                'Водопадная разработка',
                                'Ручное тестирование',
                                'Time-to-market: 6-9 месяцев'
                            ]
                        },
                        rightColumn: {
                            title: 'Цель (To-Be)',
                            content: [
                                'Микросервисная архитектура',
                                'Гибридное облако (Public + Private)',
                                'Agile/DevOps культура',
                                'Автоматизация 80%+ тестов',
                                'Time-to-market: 2-4 недели'
                            ]
                        }
                    }
                }
            },
            {
                slideId: '4',
                content: {
                    title: 'Roadmap реализации',
                    body: {
                        headers: ['Этап', 'Сроки', 'Ключевые результаты', 'Бюджет'],
                        rows: [
                            ['Подготовка', 'Q1 2025', 'Пилотные проекты, обучение команд', '50 млн ₽'],
                            ['Фаза 1', 'Q2-Q3 2025', 'Миграция 30% сервисов', '200 млн ₽'],
                            ['Фаза 2', 'Q4 2025 - Q1 2026', 'Миграция 60% сервисов', '300 млн ₽'],
                            ['Завершение', 'Q2-Q3 2026', 'Полная миграция, оптимизация', '150 млн ₽']
                        ]
                    }
                }
            },
        ];

        if (includeCharts) {
            mockContents.push({
                slideId: '5',
                content: {
                    title: 'Динамика ключевых метрик',
                    body: {
                        chartType: 'line',
                        data: {
                            labels: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025 (план)'],
                            values: {
                                'MAU, млн': [12.5, 13.2, 14.1, 15.8, 17.5],
                                'NPS': [45, 48, 52, 58, 65],
                                'Доля digital, %': [68, 72, 76, 82, 88]
                            }
                        },
                        insight: 'Рост MAU на 40%, NPS на 44%, digital-проникновение достигло 82%'
                    }
                }
            });
        }

        mockContents.push(
            {
                slideId: '6',
                content: {
                    title: 'Технологический стек'
                }
            },
            {
                slideId: '7',
                content: {
                    title: 'Ключевые выводы',
                    body: {
                        bullets: [
                            'Digital-трансформация ускорит time-to-market в 3-4 раза',
                            'Ожидаемый рост клиентской базы +40% к 2027 году',
                            'ROI проекта: 250% за 3 года',
                            'Ключевые риски: нехватка компетенций, legacy интеграции'
                        ]
                    }
                }
            }
        );

        // Generate PPTX
        const pptxBuffer = await generatePresentation(
            mockBlueprint,
            mockContents,
            {
                title: 'Design Playground - Test Presentation',
                author: 'Presentation Agent',
                company: 'Сбербанк',
                theme: theme
            }
        );

        // Save file
        const filename = `test_presentation_${Date.now()}.pptx`;
        const outputDir = path.join(process.cwd(), 'outputs');
        const outputPath = path.join(outputDir, filename);

        await fs.mkdir(outputDir, { recursive: true });
        await fs.writeFile(outputPath, pptxBuffer);

        console.log('✅ Test presentation created:', filename);

        res.json({
            success: true,
            filename: filename,
            downloadUrl: `/api/presentations/download/${filename}`
        });

    } catch (error: any) {
        console.error('❌ Test presentation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================================================
// GET ENDPOINTS - Получение данных
// =============================================================================

/**
 * GET /api/generation/project/:id/slides
 * Получить все slide contents для проекта
 */
router.get('/project/:id/slides', async (req, res) => {
    try {
        const { id: projectId } = req.params;

        // Get latest blueprint for project
        const blueprints = await db.getBlueprintsByProject(projectId);
        if (blueprints.length === 0) {
            return res.status(404).json({
                error: 'No blueprint found for project'
            });
        }

        // Get latest blueprint (sorted by createdAt)
        const latestBlueprint = blueprints.sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        // Get slide contents
        const slideContents = await db.getSlideContentsByBlueprint(latestBlueprint.id);

        res.json(slideContents);

    } catch (error: any) {
        console.error('Failed to get slide contents:', error);
        res.status(500).json({
            error: error.message
        });
    }
});

/**
 * GET /api/generation/project/:id
 * Получить статус генерации для проекта
 */
router.get('/project/:id', async (req, res) => {
    try {
        const { id: projectId } = req.params;
        const project = await db.getProject(projectId);

        const blueprints = await db.getBlueprintsByProject(projectId);
        const latestBlueprint = blueprints.length > 0
            ? blueprints.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            : null;

        const slideContents = latestBlueprint
            ? await db.getSlideContentsByBlueprint(latestBlueprint.id)
            : [];

        res.json({
            project,
            blueprint: latestBlueprint,
            slideContents,
            hasBlueprint: !!latestBlueprint,
            hasContent: slideContents.length > 0
        });

    } catch (error: any) {
        res.status(500).json({
            error: error.message
        });
    }
});

export const generationRouter = router;