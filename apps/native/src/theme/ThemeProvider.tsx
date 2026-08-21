/**
 * Native Theme Provider
 *
 * Mirrors apps/web's `components/theme/ThemeProvider.tsx`, but the theme
 * is exposed as a plain React Context value for components to read
 * directly (via `useTheme()`) and build their own `StyleSheet`s from,
 * instead of writing CSS custom properties onto `document.documentElement`
 * - there's no DOM here, and RN has no CSS variables.
 *
 * The other real difference: `localStorage` is synchronous, so the web
 * provider can read the saved theme directly inside its `useState`
 * initializer. AsyncStorage is not, so this provider starts with
 * `defaultTheme` and an explicit `isLoading` flag, then swaps in the
 * persisted theme once AsyncStorage resolves - consumers that care about
 * "did we finish loading the real saved theme yet" (e.g. to avoid a
 * flash of the wrong theme) should check `isLoading`.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultTheme, availableThemes } from '@wordplay/theme/theme';
import type { GameTheme, ThemeContextType } from '@wordplay/theme/theme';

const THEME_STORAGE_KEY = 'wordplay-theme';
const INVERTED_STORAGE_KEY = 'wordplay-inverted';

export type NativeThemeContextType = ThemeContextType & {
  /** True until the persisted theme/inverted settings have been read from
   * AsyncStorage (or confirmed absent). See module doc comment above. */
  isLoading: boolean;
};

const ThemeContext = createContext<NativeThemeContextType | undefined>(undefined);

export const useTheme = (): NativeThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<GameTheme>(defaultTheme);
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load the persisted theme/inverted settings once on mount.
  useEffect(() => {
    let isMounted = true;

    async function loadPersistedTheme() {
      try {
        const [savedThemeJson, savedInverted] = await Promise.all([
          AsyncStorage.getItem(THEME_STORAGE_KEY),
          AsyncStorage.getItem(INVERTED_STORAGE_KEY)
        ]);

        if (!isMounted) return;

        if (savedThemeJson) {
          try {
            const parsed = JSON.parse(savedThemeJson);
            const foundTheme = availableThemes.find(theme => theme.name === parsed.name);
            if (foundTheme) setCurrentTheme(foundTheme);
          } catch {
            // Corrupt saved value - keep defaultTheme.
          }
        }

        setIsInverted(savedInverted === 'true');
      } catch (error) {
        console.warn('Failed to load persisted theme from AsyncStorage:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPersistedTheme();
    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = (theme: GameTheme) => {
    setCurrentTheme(theme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ name: theme.name })).catch(error => {
      console.warn('Failed to persist theme to AsyncStorage:', error);
    });
  };

  const setInverted = (value: boolean) => {
    setIsInverted(value);
    AsyncStorage.setItem(INVERTED_STORAGE_KEY, value.toString()).catch(error => {
      console.warn('Failed to persist inverted setting to AsyncStorage:', error);
    });
  };

  const toggleInverted = () => {
    setInverted(!isInverted);
  };

  const value: NativeThemeContextType = {
    currentTheme,
    setTheme,
    availableThemes,
    isInverted,
    toggleInverted,
    setInverted,
    isLoading
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Resolves the effective color palette for the current theme, applying
 * inversion the same way the web provider's CSS-variable effect does
 * (swap background/text) - use this in components instead of reading
 * `currentTheme.colors` directly whenever `isInverted` should be
 * respected.
 */
export function getEffectiveColors(theme: GameTheme, isInverted: boolean): GameTheme['colors'] {
  if (!isInverted) return theme.colors;
  return {
    ...theme.colors,
    background: theme.colors.text,
    text: theme.colors.background
  };
}

/**
 * Perceived (ITU-R BT.601) luminance of a `#rgb`/`#rrggbb` hex color, 0
 * (black) to 1 (white). Every theme's `colors.background` is a hex
 * string (verified against all 75 themes in `@wordplay/theme/theme`),
 * so this doesn't need to handle `rgb()`/named CSS colors.
 */
export function getPerceivedLuminance(hexColor: string): number {
  const hex = hexColor.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
  const value = parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Whether `hexColor` is light enough that dark (not light) status bar
 * content should be used against it - i.e. the same "is this background
 * light or dark" question web never has to answer explicitly (a browser
 * chrome's own status bar isn't themed), but native's status bar sits
 * directly over the app's own background per-theme.
 */
export function isLightBackground(hexColor: string): boolean {
  return getPerceivedLuminance(hexColor) > 0.5;
}
