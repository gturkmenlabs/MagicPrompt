import { useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'sr_theme';

function getInitialTheme(): Theme {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch { }
    return 'dark';
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
        document.body.style.removeProperty('background-color');
        document.body.style.removeProperty('color');
    }, [theme]);

    const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

    return { theme, setTheme, toggle };
}
