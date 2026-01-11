// backend/src/services/pptx-generator.ts

import pkg from 'pptxgenjs';
const PptxGenJS = pkg.default || pkg;
import { EThemeName, getTheme, ThemeConfig } from './pptx-themes.js';
import { cleanContent, cleanSlideContent } from '../utils/content-cleaner.js';

interface PresentationOptions {
    title: string;
    author?: string;
    company?: string;
    theme?: EThemeName;
}

export class PPTXGenerator {
    private pptx: any;
    private theme: ThemeConfig;

    constructor(options: PresentationOptions) {
        this.pptx = new PptxGenJS();
        this.theme = getTheme(options.theme || EThemeName.SBER_MAIN);

        // Set presentation metadata
        this.pptx.author = options.author || 'Enterprise Presentation Agent';
        this.pptx.company = options.company || 'Сбербанк';
        this.pptx.title = options.title;
        this.pptx.subject = 'Корпоративная презентация';

        // Set default layout
        this.pptx.layout = 'LAYOUT_16x9';

        // Apply theme
        this.setupMasterSlides();
    }

    private setupMasterSlides() {
        // Define master slide with header/footer
        this.pptx.defineSlideMaster({
            title: 'MASTER_SLIDE',
            background: { color: this.theme.colors.background },
            objects: [
                // Верхняя полоска с градиентом
                {
                    rect: {
                        x: 0,
                        y: 0,
                        w: '100%',
                        h: 0.15,
                        fill: {
                            type: 'solid',
                            color: this.theme.colors.primary,
                        }
                    }
                },
                // Нижняя полоска
                {
                    rect: {
                        x: 0,
                        y: 5.4,
                        w: '100%',
                        h: 0.15,
                        fill: {
                            type: 'solid',
                            color: this.theme.colors.secondary,
                        }
                    }
                },
                // Номер слайда (справа внизу)
                {
                    text: {
                        text: '',
                        options: {
                            x: 9.2,
                            y: 5.5,
                            w: 0.5,
                            h: 0.3,
                            fontSize: 10,
                            color: this.theme.colors.textLight,
                            align: 'right',
                        }
                    }
                }
            ]
        });
    }

    private addSpeakerNotesToSlide(slide: any, speakerNotes: any) {
        if (!speakerNotes) return;

        // Формируем полный текст для Notes
        const notesText = this.formatSpeakerNotesForPPTX(speakerNotes);

        // Добавляем Notes в слайд
        slide.addNotes(notesText);
    }

    private formatSpeakerNotesForPPTX(speakerNotes: any): string {
        let text = '';

        // Вступление
        if (speakerNotes.intro) {
            text += `${speakerNotes.intro}\n\n`;
        }

        // Основной текст
        if (speakerNotes.body) {
            text += `${speakerNotes.body}\n\n`;
        }

        // Переход
        if (speakerNotes.transition) {
            text += `${speakerNotes.transition}\n\n`;
        }

        // Ключевые пункты
        if (speakerNotes.keyPoints?.length > 0) {
            text += `КЛЮЧЕВЫЕ ПУНКТЫ:\n`;
            speakerNotes.keyPoints.forEach((point: string) => {
                text += `• ${point}\n`;
            });
            text += '\n';
        }

        // Акценты
        if (speakerNotes.emphasis?.length > 0) {
            text += `АКЦЕНТЫ:\n`;
            speakerNotes.emphasis.forEach((emp: any) => {
                text += `• "${emp.text}" — ${emp.reason}\n`;
            });
            text += '\n';
        }

        // Тайминг
        if (speakerNotes.timing) {
            text += `⏱️ Время выступления: ~${speakerNotes.timing.estimated} сек\n`;
        }

        return text.trim();
    }

    addTitleSlide(content: any, speakerNotes?: any) {
        const cleanedContent = cleanSlideContent(content);
        const slide = this.pptx.addSlide({ masterName: 'MASTER_SLIDE' });

        // Фоновый градиент (левая часть)
        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0,
            y: 0,
            w: 5,
            h: '100%',
            fill: {
                type: 'solid',
                color: this.theme.colors.backgroundAlt,
            }
        });

        // Акцентная полоска слева
        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0,
            y: 0,
            w: 0.3,
            h: '100%',
            fill: {
                type: 'solid',
                color: this.theme.colors.primary,
            }
        });

        // Декоративный элемент (круг) - УМЕНЬШАЕМ и СДВИГАЕМ
        slide.addShape(this.pptx.ShapeType.ellipse, {
            x: 8.5,  // 🔧 Было 7.5, сдвигаем вправо
            y: 1.5,  // 🔧 Было 0.5, сдвигаем вниз
            w: 1.5,  // 🔧 Было 2, уменьшаем
            h: 1.5,  // 🔧 Было 2, уменьшаем
            fill: {
                type: 'solid',
                color: this.theme.colors.accent,
                transparency: 80,
            },
            line: { type: 'none' }
        });

        // Главный заголовок - УЛУЧШАЕМ РАЗМЕЩЕНИЕ
        const title = cleanContent(cleanedContent.title);
        const titleLines = Math.ceil(title.length / 50); // Примерное количество строк
        const titleHeight = Math.min(titleLines * 0.5, 2.0); // Высота заголовка

        slide.addText(title, {
            x: 0.8,
            y: 1.8,  // 🔧 Было 2.0, сдвигаем выше
            w: 7.5,  // 🔧 Было 8, уменьшаем ширину чтобы не наезжало на круг
            h: titleHeight,
            fontSize: 40,  // 🔧 Было 48, немного уменьшаем
            bold: true,
            color: this.theme.colors.primary,
            fontFace: this.theme.fonts.title,
            align: 'left',
            valign: 'top',  // 🔧 Было 'middle', меняем на 'top'
            wrap: true,  // 🔧 Включаем перенос
        });

        // Подзаголовок
        if (cleanedContent.subtitle) {
            slide.addText(cleanContent(cleanedContent.subtitle), {
                x: 0.8,
                y: 1.8 + titleHeight + 0.2,  // 🔧 Динамически от высоты заголовка
                w: 7.5,
                h: 0.6,
                fontSize: 18,  // 🔧 Было 20, уменьшаем
                color: this.theme.colors.text,
                fontFace: this.theme.fonts.body,
                align: 'left',
                wrap: true,
            });
        }

        // Дата и автор (внизу) - НЕ footer с источниками!
        const dateText = new Date().toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        slide.addText(dateText, {  // 🔧 Используем дату, НЕ cleanedContent.footer
            x: 0.8,
            y: 4.8,
            w: 5,
            h: 0.4,
            fontSize: 12,  // 🔧 Было 14, уменьшаем
            color: this.theme.colors.textLight,
            fontFace: this.theme.fonts.body,
            italic: true,
        });

        if (speakerNotes) {
            this.addSpeakerNotesToSlide(slide, speakerNotes.speakerNotes);
        }
    }

    addBulletPointsSlide(rawContent: any, speakerNotes?: any) {
        const content = cleanSlideContent(rawContent);
        const slide = this.pptx.addSlide({ masterName: 'MASTER_SLIDE' });

        // Заголовок с подложкой
        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0.5,
            y: 0.4,
            w: 9,
            h: 0.8,
            fill: {
                type: 'solid',
                color: this.theme.colors.backgroundAlt,
            },
            line: { type: 'none' }
        });

        // Акцентная полоска слева от заголовка
        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0.5,
            y: 0.4,
            w: 0.15,
            h: 0.8,
            fill: {
                type: 'solid',
                color: this.theme.colors.primary,
            },
            line: { type: 'none' }
        });

        slide.addText(content.title, {
            x: 0.9,
            y: 0.5,
            w: 8.5,
            h: 0.6,
            fontSize: 32,
            bold: true,
            color: this.theme.colors.primary,
            fontFace: this.theme.fonts.title,
            valign: 'middle',
        });

        // Bullets
        if (content.body?.bullets) {
            const processedBullets: any[] = [];

            content.body.bullets.forEach((item: any) => {
                if (typeof item === 'string') {
                    processedBullets.push({
                        text: item,
                        options: {
                            bullet: { type: 'number', code: '●' },
                            indentLevel: 0,
                            fontSize: 18,
                            color: this.theme.colors.text,
                            paraSpaceAfter: 12,
                        }
                    });
                } else if (item.main) {
                    processedBullets.push({
                        text: item.main,
                        options: {
                            bullet: { type: 'number', code: '●' },
                            indentLevel: 0,
                            bold: true,
                            fontSize: 18,
                            color: this.theme.colors.text,
                            paraSpaceAfter: 8,
                        }
                    });

                    if (item.sub) {
                        item.sub.forEach((sub: string) => {
                            processedBullets.push({
                                text: sub,
                                options: {
                                    bullet: { type: 'number', code: '○' },
                                    indentLevel: 1,
                                    fontSize: 16,
                                    color: this.theme.colors.textLight,
                                    paraSpaceAfter: 6,
                                }
                            });
                        });
                    }
                }
            });

            slide.addText(processedBullets, {
                x: 0.9,
                y: 1.6,
                w: 8.5,
                h: 3.5,
                fontFace: this.theme.fonts.body,
            });
        }

        // Footer
        if (content.footer) {
            slide.addText(content.footer, {
                x: 0.9,
                y: 5.1,
                w: 8,
                h: 0.25,
                fontSize: 11,
                color: this.theme.colors.textLight,
                fontFace: this.theme.fonts.body,
                italic: true,
            });
        }

        if (speakerNotes) {
            this.addSpeakerNotesToSlide(slide, speakerNotes.speakerNotes);
        }
    }

    addTwoColumnSlide(rawContent: any, speakerNotes?: any) {
        const content = cleanSlideContent(rawContent);
        const slide = this.pptx.addSlide({ masterName: 'MASTER_SLIDE' });

        // Заголовок
        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0.5,
            y: 0.4,
            w: 9,
            h: 0.8,
            fill: {
                type: 'solid',
                color: this.theme.colors.backgroundAlt,
            },
            line: { type: 'none' }
        });

        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0.5,
            y: 0.4,
            w: 0.15,
            h: 0.8,
            fill: {
                type: 'solid',
                color: this.theme.colors.primary,
            },
            line: { type: 'none' }
        });

        slide.addText(content.title, {
            x: 0.9,
            y: 0.5,
            w: 8.5,
            h: 0.6,
            fontSize: 32,
            bold: true,
            color: this.theme.colors.primary,
            fontFace: this.theme.fonts.title,
            valign: 'middle',
        });

        // Разделитель между колонками
        slide.addShape(this.pptx.ShapeType.line, {
            x: 5.0,
            y: 1.6,
            w: 0,
            h: 3.5,
            line: {
                color: this.theme.colors.secondary,
                width: 2,
            }
        });

        // Left column
        if (content.body?.leftColumn) {
            // Заголовок левой колонки
            slide.addText(content.body.leftColumn.title, {
                x: 0.7,
                y: 1.6,
                w: 4,
                h: 0.5,
                fontSize: 22,
                bold: true,
                color: this.theme.colors.secondary,
                fontFace: this.theme.fonts.title,
            });

            const leftBullets = content.body.leftColumn.content.map((text: string) => ({
                text,
                options: {
                    bullet: { code: '●' },
                    fontSize: 16,
                    color: this.theme.colors.text,
                    paraSpaceAfter: 8,
                }
            }));

            slide.addText(leftBullets, {
                x: 0.9,
                y: 2.2,
                w: 3.8,
                h: 2.9,
                fontFace: this.theme.fonts.body,
            });
        }

        // Right column
        if (content.body?.rightColumn) {
            // Заголовок правой колонки
            slide.addText(content.body.rightColumn.title, {
                x: 5.3,
                y: 1.6,
                w: 4,
                h: 0.5,
                fontSize: 22,
                bold: true,
                color: this.theme.colors.secondary,
                fontFace: this.theme.fonts.title,
            });

            const rightBullets = content.body.rightColumn.content.map((text: string) => ({
                text,
                options: {
                    bullet: { code: '●' },
                    fontSize: 16,
                    color: this.theme.colors.text,
                    paraSpaceAfter: 8,
                }
            }));

            slide.addText(rightBullets, {
                x: 5.5,
                y: 2.2,
                w: 3.8,
                h: 2.9,
                fontFace: this.theme.fonts.body,
            });
        }

        if (speakerNotes) {
            this.addSpeakerNotesToSlide(slide, speakerNotes.speakerNotes);
        }
    }

    addTableSlide(rawContent: any, speakerNotes?: any) {
        const content = cleanSlideContent(rawContent);
        const slide = this.pptx.addSlide({ masterName: 'MASTER_SLIDE' });

        // Заголовок
        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0.5,
            y: 0.4,
            w: 9,
            h: 0.8,
            fill: {
                type: 'solid',
                color: this.theme.colors.backgroundAlt,
            },
            line: { type: 'none' }
        });

        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0.5,
            y: 0.4,
            w: 0.15,
            h: 0.8,
            fill: {
                type: 'solid',
                color: this.theme.colors.primary,
            },
            line: { type: 'none' }
        });

        slide.addText(content.title, {
            x: 0.9,
            y: 0.5,
            w: 8.5,
            h: 0.6,
            fontSize: 32,
            bold: true,
            color: this.theme.colors.primary,
            fontFace: this.theme.fonts.title,
            valign: 'middle',
        });

        // Table
        if (content.body?.headers && content.body?.rows) {
            const tableData = [
                // Header row
                content.body.headers.map((h: string) => ({
                    text: h,
                    options: {
                        bold: true,
                        fontSize: 14,
                        fontFace: this.theme.fonts.body,
                        fill: { color: this.theme.colors.primary },
                        color: 'FFFFFF',
                        align: 'center',
                        valign: 'middle',
                    }
                })),
                // Data rows
                ...content.body.rows.map((row: any[], rowIdx: number) =>
                    row.map((cell: any) => ({
                        text: String(cell),
                        options: {
                            fontSize: 13,
                            fontFace: this.theme.fonts.body,
                            fill: { color: rowIdx % 2 === 0 ? 'FFFFFF' : this.theme.colors.backgroundAlt },
                            color: this.theme.colors.text,
                            align: 'left',
                            valign: 'middle',
                        }
                    }))
                )
            ];

            slide.addTable(tableData, {
                x: 0.7,
                y: 1.6,
                w: 8.6,
                border: {
                    type: 'solid',
                    pt: 1,
                    color: this.theme.colors.secondary
                },
                margin: 0.1,
                rowH: 0.4,
            });
        }

        // Footer
        if (content.footer) {
            slide.addText(content.footer, {
                x: 0.9,
                y: 5.1,
                w: 8,
                h: 0.25,
                fontSize: 11,
                color: this.theme.colors.textLight,
                fontFace: this.theme.fonts.body,
                italic: true,
            });
        }

        if (speakerNotes) {
            this.addSpeakerNotesToSlide(slide, speakerNotes.speakerNotes);
        }
    }

    addChartSlide(content: any, speakerNotes?: any) {
        const cleanedContent = cleanSlideContent(content);
        const slide = this.pptx.addSlide({ masterName: 'MASTER_SLIDE' });

        // Заголовок (код остается прежним)
        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0.5, y: 0.4, w: 9, h: 0.8,
            fill: { type: 'solid', color: this.theme.colors.backgroundAlt },
            line: { type: 'none' }
        });

        slide.addShape(this.pptx.ShapeType.rect, {
            x: 0.5, y: 0.4, w: 0.15, h: 0.8,
            fill: { type: 'solid', color: this.theme.colors.primary },
            line: { type: 'none' }
        });

        slide.addText(cleanContent(cleanedContent.title), {
            x: 0.9, y: 0.5, w: 8.5, h: 0.6,
            fontSize: 32, bold: true,
            color: this.theme.colors.primary,
            fontFace: this.theme.fonts.title,
            valign: 'middle',
        });

        console.log('📊 Chart data:', JSON.stringify(cleanedContent.body, null, 2));

        // Chart
        if (cleanedContent.body?.chartType && cleanedContent.body?.data) {
            try {
                let chartType: any = this.pptx.charts.BAR;

                if (cleanedContent.body.chartType === 'pie') {
                    chartType = this.pptx.charts.PIE;
                } else if (cleanedContent.body.chartType === 'line') {
                    chartType = this.pptx.charts.LINE;
                }

                const data = cleanedContent.body.data;

                if (!Array.isArray(data.labels)) {
                    throw new Error('Chart labels must be an array');
                }

                let chartData: any[];

                // 🔧 ИСПРАВЛЕНИЕ: Поддержка двух форматов данных

                // Формат 1: Single series - values это массив
                if (Array.isArray(data.values)) {
                    console.log('📊 Single series chart detected');

                    const numericValues = data.values.map((v: any) => {
                        const num = Number(v);
                        return isNaN(num) ? 0 : num;
                    });

                    chartData = [{
                        name: data.unit || '',
                        labels: data.labels.map((l: any) => String(l)),
                        values: numericValues,
                    }];
                }
                // Формат 2: Multi-series - values это объект с массивами
                else if (typeof data.values === 'object' && data.values !== null) {
                    console.log('📊 Multi-series chart detected');

                    chartData = [];

                    for (const [seriesName, seriesValues] of Object.entries(data.values)) {
                        if (!Array.isArray(seriesValues)) {
                            console.warn(`⚠️ Series "${seriesName}" is not an array, skipping`);
                            continue;
                        }

                        const numericValues = seriesValues.map((v: any) => {
                            const num = Number(v);
                            return isNaN(num) ? 0 : num;
                        });

                        chartData.push({
                            name: seriesName,
                            labels: data.labels.map((l: any) => String(l)),
                            values: numericValues,
                        });
                    }

                    if (chartData.length === 0) {
                        throw new Error('No valid series found in multi-series data');
                    }
                }
                else {
                    throw new Error('Chart values must be an array or object with arrays');
                }

                // Validate lengths
                for (const series of chartData) {
                    if (series.labels.length !== series.values.length) {
                        console.error(`❌ Length mismatch in series "${series.name}":`, {
                            labelsLength: series.labels.length,
                            valuesLength: series.values.length
                        });
                        throw new Error(`Labels and values length mismatch in series "${series.name}"`);
                    }
                }

                console.log('✅ Normalized chart data:', JSON.stringify(chartData, null, 2));

                slide.addChart(chartType, chartData, {
                    x: 1.2,
                    y: 1.7,
                    w: 7.6,
                    h: 3.2,
                    showTitle: false,
                    showLegend: true,
                    legendPos: 'r',
                    legendFontSize: 11,
                    chartColors: [
                        this.theme.colors.primary,
                        this.theme.colors.secondary,
                        this.theme.colors.accent,
                        this.theme.colors.success,
                        this.theme.colors.warning,
                    ],
                    valAxisMaxVal: null,
                    catAxisLabelColor: this.theme.colors.text,
                    valAxisLabelColor: this.theme.colors.text,
                    catAxisLabelFontSize: 11,
                    valAxisLabelFontSize: 11,
                });

            } catch (chartError) {
                console.error('❌ Chart creation failed:', chartError);

                // Fallback: показываем таблицу вместо графика
                slide.addText('График недоступен (ошибка данных)', {
                    x: 1.2, y: 2.5, w: 7.6, h: 2.0,
                    fontSize: 24,
                    color: this.theme.colors.textLight,
                    align: 'center', valign: 'middle',
                    italic: true,
                });
            }
        } else {
            console.warn('⚠️ Missing chart data or chartType');

            slide.addText('Данные для графика отсутствуют', {
                x: 1.2, y: 2.5, w: 7.6, h: 2.0,
                fontSize: 24,
                color: this.theme.colors.textLight,
                align: 'center', valign: 'middle',
                italic: true,
            });
        }

        // Insight box
        if (cleanedContent.body?.insight) {
            slide.addShape(this.pptx.ShapeType.rect, {
                x: 0.7, y: 5.0, w: 8.6, h: 0.35,
                fill: {
                    type: 'solid',
                    color: this.theme.colors.accent,
                    transparency: 85,
                },
                line: { type: 'none' }
            });

            slide.addText(cleanContent(cleanedContent.body.insight), {
                x: 0.9, y: 5.05, w: 8.2, h: 0.25,
                fontSize: 13, bold: true,
                color: this.theme.colors.text,
                fontFace: this.theme.fonts.body,
                valign: 'middle',
            });
        }

        if (speakerNotes) {
            this.addSpeakerNotesToSlide(slide, speakerNotes.speakerNotes);
        }
    }

    addSectionDivider(rawContent: any, speakerNotes?: any) {
        const content = cleanSlideContent(rawContent);
        const slide = this.pptx.addSlide();

        // Градиентный фон
        slide.background = {
            fill: this.theme.colors.primary,
        };

        // Декоративные круги
        slide.addShape(this.pptx.ShapeType.ellipse, {
            x: -1,
            y: -1,
            w: 3,
            h: 3,
            fill: {
                type: 'solid',
                color: this.theme.colors.secondary,
                transparency: 70,
            },
            line: { type: 'none' }
        });

        slide.addShape(this.pptx.ShapeType.ellipse, {
            x: 8,
            y: 3.5,
            w: 2.5,
            h: 2.5,
            fill: {
                type: 'solid',
                color: this.theme.colors.accent,
                transparency: 70,
            },
            line: { type: 'none' }
        });

        // Заголовок секции
        slide.addText(content.title, {
            x: 1,
            y: 2.3,
            w: 8,
            h: 1.2,
            fontSize: 56,
            bold: true,
            color: 'FFFFFF',
            fontFace: this.theme.fonts.title,
            align: 'left',
            valign: 'middle',
        });

        // Декоративная линия
        slide.addShape(this.pptx.ShapeType.rect, {
            x: 1,
            y: 3.6,
            w: 3,
            h: 0.1,
            fill: {
                type: 'solid',
                color: this.theme.colors.accent,
            },
            line: { type: 'none' }
        });

        if (speakerNotes) {
            this.addSpeakerNotesToSlide(slide, speakerNotes.speakerNotes);
        }
    }

    async generate(): Promise<Buffer> {
        console.log('🎨 Генерация PPTX файла...');
        const buffer = await this.pptx.write({ outputType: 'nodebuffer' });
        console.log('✅ PPTX файл создан');
        return buffer as Buffer;
    }
}

export async function generatePresentation(
    blueprint: any,
    slideContents: any[],
    options: PresentationOptions,
    speakerNotes?: any[]
): Promise<Buffer> {
    const generator = new PPTXGenerator(options);

    const sortedSlides = blueprint.slides.sort((a: any, b: any) => a.order - b.order);

    for (const slide of sortedSlides) {
        const content = slideContents.find(c => c.slideId === slide.id);
        const notes = speakerNotes?.find(n => n.slideId === slide.id);

        if (!content) {
            console.warn(`⚠️ Контент не найден для слайда ${slide.id}`);
            continue;
        }

        console.log(`Добавление слайда [${slide.type}]: ${content.content.title}`);

        // 🔍 ДИАГНОСТИКА: Логируем структуру контента
        if (slide.type === 'chart' || slide.type === 'timeline') {
            console.log('📊 Chart/Timeline content structure:', {
                hasBody: !!content.content.body,
                hasChartType: !!content.content.body?.chartType,
                hasData: !!content.content.body?.data,
                dataStructure: content.content.body?.data ? {
                    hasLabels: !!content.content.body.data.labels,
                    hasValues: !!content.content.body.data.values,
                    labelsType: Array.isArray(content.content.body.data.labels) ? 'array' : typeof content.content.body.data.labels,
                    valuesType: Array.isArray(content.content.body.data.values) ? 'array' : typeof content.content.body.data.values,
                    labelsLength: content.content.body.data.labels?.length,
                    valuesLength: content.content.body.data.values?.length,
                } : null
            });
        }

        try {
            switch (slide.type) {
                case 'title':
                    generator.addTitleSlide(content.content, notes);
                    break;

                case 'section_divider':
                    generator.addSectionDivider(content.content, notes);
                    break;

                case 'bullet_points':
                case 'summary':
                    generator.addBulletPointsSlide(content.content, notes);
                    break;

                case 'two_column':
                    generator.addTwoColumnSlide(content.content, notes);
                    break;

                case 'table':
                case 'risks_matrix':
                    generator.addTableSlide(content.content, notes);
                    break;

                case 'chart':
                case 'timeline':
                    generator.addChartSlide(content.content, notes);
                    break;

                default:
                    console.warn(`⚠️ Unknown slide type: ${slide.type}, using bullet_points`);
                    generator.addBulletPointsSlide(content.content, notes);
            }

            console.log(`✅ Слайд добавлен успешно`);

        } catch (error) {
            console.error(`❌ Ошибка добавления слайда ${slide.id} [${slide.type}]:`, error);
            console.error('Содержимое слайда:', JSON.stringify(content, null, 2));

            // Не прерываем генерацию, продолжаем со следующим слайдом
        }
    }

    return await generator.generate();
}
