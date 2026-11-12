import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyColorTheme, type ColorTheme } from '../styles/theme';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // 1. Use saved preference
    const saved = localStorage.getItem('theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    // 2. Fall back to system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  });

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('colorTheme') as ColorTheme | null;
    const initial = saved === 'original' ? 'original' : 'midnight';
    // Mutates the static theme.colors tokens before the first render so
    // inline styles are already in the chosen palette (and mode) on initial
    // paint. `theme` is initialized by the useState above, so it is safe to
    // read here.
    applyColorTheme(initial, theme);
    return initial;
  });

  useEffect(() => {
    // Apply to <html> so global CSS can react
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', colorTheme);
    localStorage.setItem('colorTheme', colorTheme);
  }, [colorTheme]);

  // Mutate tokens BEFORE the state change so the re-render it triggers
  // already reads the new palette/mode.
  const toggleTheme = () => {
    setThemeState(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyColorTheme(colorTheme, next);
      return next;
    });
  };
  const setTheme = (t: Theme) => {
    applyColorTheme(colorTheme, t);
    setThemeState(t);
  };

  const setColorTheme = (ct: ColorTheme) => {
    applyColorTheme(ct, theme);
    setColorThemeState(ct);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
