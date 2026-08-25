import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🎨 Define Color Palettes
const lightColors = {
    background: '#F9FAFB', // Extremely light gray, cleaner than before
    card: '#FFFFFF',
    text: '#111827',
    subText: '#6B7280',
    primary: '#4f46e5', // Cohesive Indigo
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    headerBg: '#FFFFFF',
    tabBar: '#FFFFFF',
    gradientWait: ['#F3F4F6', '#F9FAFB', '#FFFFFF']
};

const darkColors = {
    background: '#0F172A', // Slate 900 for deeper, richer dark mode
    card: '#1E293B',       // Slate 800
    text: '#F8FAFC',       // Slate 50
    subText: '#94A3B8',    // Slate 400
    primary: '#6366f1',    // Light Indigo for Dark Mode
    border: '#334155',     // Slate 700
    success: '#10B981',
    warning: '#FBBF24',
    danger: '#EF4444',
    headerBg: '#1E293B',
    tabBar: '#1E293B',
    gradientWait: ['#1E293B', '#0F172A', '#0F172A']
};

// 🔥 Ultra-Vivid Neo-Brutalism Palette (Light)
const brutalistLightColors = {
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    subText: '#000000',
    primary: '#FFD166', // Retro Yellow as main accent
    border: '#000000',
    success: '#06D6A0', // Bright Mint
    warning: '#FFD166',
    danger: '#EF476F',  // Hot Pink
    headerBg: '#118AB2', // Cyan header
    tabBar: '#FFFFFF',
    gradientWait: ['#FFFFFF', '#FFFFFF', '#FFFFFF']
};

// 🌑 Ultra-Vivid Neo-Brutalism Palette (Dark)
const brutalistDarkColors = {
    background: '#000000',
    card: '#000000',
    text: '#FFFFFF',
    subText: '#FFFFFF',
    primary: '#FFD166', // Keep bright accents for stark contrast
    border: '#FFFFFF',
    success: '#06D6A0', 
    warning: '#FFD166',
    danger: '#EF476F',  
    headerBg: '#118AB2', 
    tabBar: '#000000',
    gradientWait: ['#000000', '#000000', '#000000']
};

type ThemeType = typeof lightColors;

// 📝 Typography & Spacing Tokens
const typography = {
    normal: {
        h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
        h2: { fontSize: 24, fontWeight: '600' as const, letterSpacing: -0.3 },
        body: { fontSize: 16, fontWeight: '400' as const },
        caption: { fontSize: 13, fontWeight: '500' as const, color: '#6B7280' }
    },
    brutalist: {
        h1: { fontSize: 36, fontWeight: '900' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
        h2: { fontSize: 26, fontWeight: '900' as const, letterSpacing: 1, textTransform: 'uppercase' as const },
        body: { fontSize: 16, fontWeight: 'bold' as const },
        caption: { fontSize: 14, fontWeight: '900' as const, textTransform: 'uppercase' as const }
    }
};

const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
};

export type TypographyStyle = {
    fontSize: number;
    fontWeight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
    letterSpacing?: number;
    textTransform?: "none" | "capitalize" | "uppercase" | "lowercase";
    color?: string;
};

export type TypographyConfig = {
    h1: TypographyStyle;
    h2: TypographyStyle;
    body: TypographyStyle;
    caption: TypographyStyle;
};

const ThemeContext = createContext<{
    isDark: boolean;
    isBrutalist: boolean;
    colors: ThemeType;
    typography: TypographyConfig;
    spacing: typeof spacing;
    toggleTheme: () => void;
    toggleBrutalist: () => void;
}>({
    isDark: false,
    isBrutalist: false,
    colors: lightColors,
    typography: typography.normal,
    spacing: spacing,
    toggleTheme: () => { },
    toggleBrutalist: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemScheme = useColorScheme();
    const [isDark, setIsDark] = useState(systemScheme === 'dark');
    const [isBrutalist, setIsBrutalist] = useState(false);

    // Load saved theme on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('appTheme');
                if (savedTheme) {
                    setIsDark(savedTheme === 'dark');
                } else {
                    setIsDark(systemScheme === 'dark');
                }

                const savedBrutalist = await AsyncStorage.getItem('isBrutalist');
                if (savedBrutalist !== null) {
                    setIsBrutalist(savedBrutalist === 'true');
                }
            } catch (e) {
                console.log('Failed to load theme:', e);
            }
        };
        loadTheme();
    }, []);

    // ✅ LISTEN FOR SYSTEM THEME CHANGES (Smart Sync)
    useEffect(() => {
        const syncWithSystem = async () => {
            try {
                // Only follow system if NO manual override exists
                const savedTheme = await AsyncStorage.getItem('appTheme');
                if (!savedTheme) {
                    setIsDark(systemScheme === 'dark');
                }
            } catch (e) {
                // Ignore error
            }
        };
        syncWithSystem();
    }, [systemScheme]); // Runs whenever phone theme changes

    const toggleTheme = async () => {
        const newMode = !isDark;
        setIsDark(newMode);
        try {
            // Save preference (User is now in Manual Mode)
            await AsyncStorage.setItem('appTheme', newMode ? 'dark' : 'light');
        } catch (e) {
            console.log('Failed to save theme:', e);
        }
    };

    const toggleBrutalist = async () => {
        const newMode = !isBrutalist;
        setIsBrutalist(newMode);
        try {
            await AsyncStorage.setItem('isBrutalist', newMode ? 'true' : 'false');
        } catch (e) {
            console.log('Failed to save brutalist mode:', e);
        }
    };

    const colors = isBrutalist ? (isDark ? brutalistDarkColors : brutalistLightColors) : (isDark ? darkColors : lightColors);
    const activeTypography = isBrutalist ? typography.brutalist : typography.normal;

    return (
        <ThemeContext.Provider value={{ isDark, isBrutalist, colors, typography: activeTypography, spacing, toggleTheme, toggleBrutalist }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
