import { createContext, useContext } from 'react';
import type { ColorMode, ColorTheme, Palette } from '@/theme';

export interface ThemeContextType {
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

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
