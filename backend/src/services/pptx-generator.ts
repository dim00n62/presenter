import pkg from 'pptxgenjs';
const PptxGenJS = pkg.default || pkg;

export class PresentationGenerator {
    private pptx: pkg;
    private theme: Theme;

    constructor(theme: Theme) {
        this.pptx = new PptxGenJS();
        this.theme = theme;

        this.pptx.author = 'Presentation Agent';
        this.pptx.company = 'Сбербанк';
        this.pptx.title = 'Design Playground - Test Presentation';
    }

    generate(slidesConfig: any) {
        slidesConfig.slides
            .sort((a: any, b: any) => a.order - b.order)
            .forEach((slideConfig: any) => {
                switch (slideConfig.type) {
                    case 'title':
                        this.addTitleSlide(slideConfig.content);
                        break;
                    case 'bullet_points':
                        this.addBulletsSlide(slideConfig.content);
                        break;
                    case 'two_column':
                        this.addTwoColumnSlide(slideConfig.content);
                        break;
                    case 'table':
                        this.addTableSlide(slideConfig.content);
                        break;
                    case 'chart':
                        this.addChartSlide(slideConfig.content);
                        break;
                    case 'section_divider':
                        this.addSectionDivider(slideConfig.content);
                        break;
                    case 'summary':
                        this.addSummarySlide(slideConfig.content);
                        break;
                }
            });

        return this.pptx.write({ outputType: 'nodebuffer' });
    }

    private baseSlide() {
        const slide = this.pptx.addSlide();
        slide.background = { color: this.theme.colors.background };
        return slide;
    }

    private addTitleSlide(content: any) {
        const slide = this.baseSlide();

        slide.addText(content.title, {
            x: 0.7,
            y: 2.0,
            w: 8.6,
            h: 1.2,
            fontSize: 40,
            fontFace: this.theme.font,
            color: this.theme.colors.primary,
            bold: true,
            align: 'center',
        });

        slide.addText(content.subtitle, {
            x: 1.2,
            y: 3.4,
            w: 7.6,
            h: 0.8,
            fontSize: 20,
            color: this.theme.colors.secondary,
            align: 'center',
        });
    }

    private addBulletsSlide(content: any) {
        const slide = this.baseSlide();

        slide.addText(content.title, {
            x: 0.6,
            y: 0.5,
            w: 8.8,
            h: 0.8,
            fontSize: 28,
            color: this.theme.colors.primary,
            bold: true,
        });

        const bullets: any[] = [];
        content.body.bullets.forEach((b: any) => {
            if (typeof b === 'string') {
                bullets.push({ text: b, options: { bullet: true } });
            } else {
                bullets.push({ text: b.main, options: { bullet: true, bold: true } });
                b.sub.forEach((s: string) =>
                    bullets.push({ text: s, options: { bullet: true, indentLevel: 1 } })
                );
            }
        });

        slide.addText(bullets, {
            x: 0.8,
            y: 1.6,
            w: 8.0,
            h: 4.8,
            fontSize: 16,
            color: this.theme.colors.text,
            lineSpacing: 28,
        });
    }

    private addTwoColumnSlide(content: any) {
        const slide = this.baseSlide();

        slide.addText(content.title, {
            x: 0.6,
            y: 0.5,
            w: 8.8,
            h: 0.8,
            fontSize: 28,
            color: this.theme.colors.primary,
            bold: true,
        });

        slide.addText(content.body.leftColumn.title, {
            x: 0.6,
            y: 1.5,
            w: 4.0,
            h: 0.6,
            fontSize: 20,
            color: this.theme.colors.accent,
            bold: true,
        });

        slide.addText(
            content.body.leftColumn.content.map((t: string) => ({
                text: t,
                options: { bullet: true },
            })),
            {
                x: 0.6,
                y: 2.2,
                w: 4.0,
                h: 4.0,
                fontSize: 15,
                color: this.theme.colors.text,
            }
        );

        slide.addText(content.body.rightColumn.title, {
            x: 5.0,
            y: 1.5,
            w: 4.0,
            h: 0.6,
            fontSize: 20,
            color: this.theme.colors.primary,
            bold: true,
        });

        slide.addText(
            content.body.rightColumn.content.map((t: string) => ({
                text: t,
                options: { bullet: true },
            })),
            {
                x: 5.0,
                y: 2.2,
                w: 4.0,
                h: 4.0,
                fontSize: 15,
                color: this.theme.colors.text,
            }
        );
    }

    private addTableSlide(content: any) {
        const slide = this.baseSlide();

        slide.addText(content.title, {
            x: 0.6,
            y: 0.5,
            w: 8.8,
            h: 0.8,
            fontSize: 28,
            color: this.theme.colors.primary,
            bold: true,
        });

        slide.addTable(
            [
                content.body.headers.map((h: string) => ({
                    text: h,
                    options: { bold: true },
                })),
                ...content.body.rows,
            ],
            {
                x: 0.5,
                y: 1.6,
                w: 9.0,
                fontSize: 14,
                border: { type: 'solid', pt: 1, color: this.theme.colors.muted },
                fill: { color: 'F9FAFB' },
            }
        );
    }

    private addChartSlide(content: any) {
        const slide = this.baseSlide();

        slide.addText(content.title, {
            x: 0.6,
            y: 0.5,
            w: 8.8,
            h: 0.8,
            fontSize: 28,
            color: this.theme.colors.primary,
            bold: true,
        });

        const chartData = Object.keys(content.body.data.values).map((key) => ({
            name: key,
            labels: content.body.data.labels,
            values: content.body.data.values[key],
        }));
        const normalizedChartData = this.normalizeChartData(chartData);

        if (normalizedChartData.length === 0) {
            console.warn('⚠️ Empty or invalid chart data, skipping chart slide');
            return;
        }

        slide.addChart(this.pptx.charts.LINE, normalizedChartData, {
            x: 0.7,
            y: 1.6,
            w: 8.6,
            h: 3.8,
            showLegend: true,
            legendPos: 'b',
            lineDataSymbol: 'circle',
            chartColors: [
                this.theme.colors.primary,
                this.theme.colors.accent,
                this.theme.colors.secondary,
            ],
        });

        slide.addText(content.insight, {
            x: 0.8,
            y: 5.6,
            w: 8.4,
            h: 0.6,
            fontSize: 16,
            color: this.theme.colors.accent,
            italic: true,
        });
    }

    private normalizeChartData(chartBody: any) {
        if (!chartBody?.labels || !chartBody?.values) return [];

        const labels = chartBody.labels;

        return Object.entries(chartBody.values)
            .filter(([_, values]) => Array.isArray(values))
            .map(([name, values]) => ({
                name,
                labels,
                values,
            }))
            .filter(
                s =>
                    s.labels &&
                    s.values &&
                    s.labels.length > 0 &&
                    s.values.length > 0 &&
                    s.labels.length === s.values.length
            );
    }

    private addSectionDivider(content: any) {
        const slide = this.baseSlide();

        slide.addText(content.title, {
            x: 0,
            y: 2.8,
            w: 10,
            h: 1.2,
            fontSize: 42,
            color: this.theme.colors.primary,
            bold: true,
            align: 'center',
        });
    }

    private addSummarySlide(content: any) {
        const slide = this.baseSlide();

        slide.addText(content.title, {
            x: 0.6,
            y: 0.5,
            w: 8.8,
            h: 0.8,
            fontSize: 28,
            color: this.theme.colors.primary,
            bold: true,
        });

        slide.addText(
            content.body.bullets.map((b: string) => ({
                text: b,
                options: { bullet: true },
            })),
            {
                x: 0.8,
                y: 1.6,
                w: 8.0,
                h: 4.8,
                fontSize: 18,
                color: this.theme.colors.text,
                lineSpacing: 30,
            }
        );
    }
}

export interface Theme {
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
        muted: string;
        gradientFrom?: string;
        gradientTo?: string;
    };
    font: {
        title: string;
        body: string;
    };
    charts?: {
        colors: string[];
        gridColor?: string;
    };
    table?: {
        headerBg: string;
        headerText: string;
        rowBorder: string;
    };
    effects?: {
        softShadow?: {
            blur: number;
            offset: number;
            color: string;
            opacity: number;
        };
    };
}

// sberGreenTheme.ts
export const sberGreenTheme: Theme = {
    colors: {
        primary: "21A038",
        secondary: "6C757D",
        accent: "00E676",
        background: "FFFFFF",
        text: "212529",
        muted: "6C757D",
        gradientFrom: "21A038",
        gradientTo: "0FB9B1",
    },

    font: {
        title: "Arial",
        body: "Arial",
    },

    charts: {
        colors: [
            "21A038",
            "00E676",
            "0FB9B1",
            "6C757D",
        ],
        gridColor: "E6F4EA",
    },

    table: {
        headerBg: "E6F4EA",
        headerText: "1E7F34",
        rowBorder: "D0E9D7",
    },

    effects: {
        softShadow: {
            blur: 10,
            offset: 2,
            color: "000000",
            opacity: 0.08,
        },
    },
};

export async function generatePresentation(slidesConfig: any, theme: Theme = sberGreenTheme) {
    const generator = new PresentationGenerator(sberGreenTheme);
    return generator.generate(slidesConfig);
}