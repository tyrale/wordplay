/**
 * Theme context and the `useTheme` hook. Kept apart from
 * `ThemeProvider.tsx` so that file only exports a component (React Fast
 * Refresh requirement).
 */

import { createContext, useContext } from 'react';
import type { ThemeContextType } from '@wordplay/theme/theme';

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
