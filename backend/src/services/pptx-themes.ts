// backend/src/services/pptx-themes.ts

export enum EThemeName {
    SBER_MAIN = 'sber_main',
}

export interface ThemeConfig {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        accentLight?: string;
        text: string;
        textSecondary?: string;
        textLight?: string;
        background: string;
        backgroundAlt: string;
        success?: string;
        warning?: string;
        danger?: string;
        gradientStart?: string;
        gradientMid?: string;
        gradientEnd?: string;
        gradientLight?: string;
    };
    fonts: {
        title: string;
        body: string;
        code: string;
    };
    logo?: {
        data?: string; // base64
        width: number;
        height: number;
        x: number;
        y: number;
    };
}

export const THEMES: Record<EThemeName, ThemeConfig> = {
    // Основная тема Сбер
    sber_main: {
        name: 'Сбер',
        colors: {
            // Main colors
            primary: '21A038',      // Sber green
            secondary: '00C896',    // Teal
            accent: '00D9A3',       // Light teal
            accentLight: 'B4E876',  // Light yellow-green

            // Text colors
            text: '1A1A1A',         // Dark text
            textSecondary: '6B7885', // Gray text

            // Backgrounds
            background: 'FFFFFF',   // White
            backgroundAlt: 'F5F7FA', // Light gray

            // Gradient colors for background shapes
            gradientStart: '00E5CC', // Bright turquoise
            gradientMid: '00C896',   // Medium turquoise
            gradientEnd: '21A038',   // Green
            gradientLight: 'E8F9F3', // Very light mint
        },
        fonts: {
            title: 'SB Sans Display',  // Фирменный шрифт Сбера
            body: 'SB Sans Text',       // или Calibri как fallback
            code: 'Consolas',
        },
    },
};

export function getTheme(themeName: EThemeName): ThemeConfig {
    return THEMES[themeName] || THEMES.sber_main;
}
