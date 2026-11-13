import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCategoryColors,
  getIncomeCategoryColors,
  getPalette,
  type ColorMode,
  type ColorTheme,
  type Palette,
} from '@/theme';

interface ThemeContextType {
  palette: Palette;
  categoryColors: string[];
  incomeCategoryColors: Record<string, string>;
  colorTheme: ColorTheme;
  mode: ColorMode;
  /** 'system' follows the OS setting; the others pin the mode. */
  modePreference: 'system' | ColorMode;
  setColorTheme: (t: ColorTheme) => void;
  setModePreference: (m: 'system' | ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

const THEME_KEY = 'pratiq.colorTheme';
const MODE_KEY = 'pratiq.modePreference';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('midnight');
  const [modePreference, setModePreferenceState] = useState<'system' | ColorMode>('system');

  useEffect(() => {
    (async () => {
      const [savedTheme, savedMode] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(MODE_KEY),
      ]);
      if (savedTheme === 'midnight' || savedTheme === 'original') setColorThemeState(savedTheme);
      if (savedMode === 'system' || savedMode === 'light' || savedMode === 'dark') {
        setModePreferenceState(savedMode);
      }
    })();
  }, []);

  const setColorTheme = (t: ColorTheme) => {
    setColorThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t);
  };

  const setModePreference = (m: 'system' | ColorMode) => {
    setModePreferenceState(m);
    AsyncStorage.setItem(MODE_KEY, m);
  };

  const mode: ColorMode =
    modePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : modePreference;

  const value = useMemo(() => {
    const palette = getPalette(colorTheme, mode);
    return {
      palette,
      categoryColors: getCategoryColors(colorTheme, mode),
      incomeCategoryColors: getIncomeCategoryColors(palette),
      colorTheme,
      mode,
      modePreference,
      setColorTheme,
      setModePreference,
    };
  }, [colorTheme, mode, modePreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
