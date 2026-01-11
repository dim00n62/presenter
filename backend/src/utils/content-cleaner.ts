// backend/src/utils/content-cleaner.ts

/**
 * Очистка контента от служебных маркеров
 */
export function cleanContent(text: any): string {
    if (!text) return '';

    let cleaned = String(text);

    // Убираем [HIGHLIGHT]
    cleaned = cleaned.replace(/\s*\[HIGHLIGHT\]\s*/g, '');

    // Убираем [Источник:...]
    cleaned = cleaned.replace(/\s*\[Источник:.*?\]\s*/g, '');

    // Убираем [ICON:...]
    cleaned = cleaned.replace(/\s*\[ICON:.*?\]\s*/g, '');

    // Убираем [COLOR:...]
    cleaned = cleaned.replace(/\s*\[COLOR:.*?\]\s*/g, '');

    // Убираем [CHART_DATA]
    cleaned = cleaned.replace(/\s*\[CHART_DATA\]\s*/g, '');

    // Убираем множественные пробелы
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

/**
 * Рекурсивная очистка объекта от маркеров
 */
export function cleanSlideContent(content: any): any {
    if (typeof content === 'string') {
        return cleanContent(content);
    }

    if (Array.isArray(content)) {
        return content.map(item => cleanSlideContent(item));
    }

    if (typeof content === 'object' && content !== null) {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(content)) {
            // Пропускаем служебные поля
            if (key === 'visualHints' || key === 'sources') {
                continue;
            }
            // Очищаем footer от источников
            if (key === 'footer') {
                cleaned[key] = cleanContent(value);
                continue;
            }
            cleaned[key] = cleanSlideContent(value);
        }
        return cleaned;
    }

    return content;
}
