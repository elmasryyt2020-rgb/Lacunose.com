import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

const FONTS = {
  display: 'InstrumentSerif_400Regular',
  displayItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
};

const LIGHT_THEME = {
  bg: '#F1EEE8',
  surface: '#FFFFFF',
  ink: '#0E0E0C',
  inkSoft: '#4A4742',
  muted: '#8A8680',
  hair: 'rgba(14,14,12,0.08)',
  
  mint: '#D7E8D4',
  lavender: '#E2D9EE',
  butter: '#F5EBB8',
  peach: '#F5D9C8',
  sky: '#CFE0EA',
  rose: '#ECD1D1',
  sage: '#C4D1B5',
  
  ...FONTS
};

const DARK_THEME = {
  bg: '#0A0A0A',
  surface: '#171717',
  ink: '#F5F5F5',
  inkSoft: '#B3B3B3',
  muted: '#666666',
  hair: 'rgba(255,255,255,0.12)',
  
  // Slightly glowing, dark-harmonized pastels
  mint: '#9BB898',
  lavender: '#A191BD',
  butter: '#B5A976',
  peach: '#C4A089',
  sky: '#90ABC0',
  rose: '#C9A3A3',
  sage: '#98A68B',
  
  ...FONTS
};

// Ordered palette for cycling card icon backgrounds — ensures variety
export const CARD_COLORS = [
  'lavender', 'mint', 'sky', 'butter', 'peach', 'rose', 'sage',
] as const;

export const RGF = LIGHT_THEME; // Deprecated fallback for static files (e.g. Navigation Container)

// A subtle text-shadow style that imitates the slightly heavier antialiasing
// browsers apply to Instrument Serif. Applied to all large display text.
export const DISPLAY_SHADOW = {
  textShadowColor: 'rgba(14,14,12,0.30)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 0.4,
} as const;

export const DISPLAY_SHADOW_DARK = {
  textShadowColor: 'rgba(245,245,245,0.35)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 0.4,
} as const;

type ThemeOptions = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  mode: ThemeOptions;
  setMode: (mode: ThemeOptions) => void;
  RGF: typeof LIGHT_THEME;
  displayShadow: typeof DISPLAY_SHADOW;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  mode: 'system',
  setMode: () => {},
  RGF: LIGHT_THEME,
  displayShadow: DISPLAY_SHADOW,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeOptions>('light'); // default explicitly configured by user toggles, or default light
  
  const theme = mode === 'system' ? (systemColorScheme || 'light') : mode;
  const currentRGF = theme === 'dark' ? DARK_THEME : LIGHT_THEME;

  const displayShadow = theme === 'dark' ? DISPLAY_SHADOW_DARK : DISPLAY_SHADOW;

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, mode, setMode, RGF: currentRGF, displayShadow } },
    children
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
