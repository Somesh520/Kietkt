import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🎨 Define Color Palettes
const lightColors = {
    background: '#f4f6f8',
    card: '#ffffff',
    text: '#2c3e50',
    subText: '#7f8c8d',
    primary: '#2980b9',
    border: '#eee',
    success: '#27ae60',
    warning: '#f39c12',
    danger: '#c0392b',
    headerBg: '#fff',
    tabBar: '#ffffff',
    gradientWait: ['#e7f2f8', '#f4f6f8', '#f4f6f8']
};

const darkColors = {
    background: '#121212',
    card: '#1e1e1e',
    text: '#ecf0f1',
    subText: '#b0b3b8',
    primary: '#3498db',
    border: '#333',
    success: '#2ecc71',
    warning: '#f1c40f',
    danger: '#e74c3c',
    headerBg: '#1e1e1e',
    tabBar: '#1e1e1e',
    gradientWait: ['#1e1e1e', '#121212', '#121212']
};

type ThemeType = typeof lightColors;

const ThemeContext = createContext<{
    isDark: boolean;
    colors: ThemeType;
    toggleTheme: () => void;
}>({
    isDark: false,
    colors: lightColors,
    toggleTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const systemScheme = useColorScheme();
    const [isDark, setIsDark] = useState(systemScheme === 'dark');

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

    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
