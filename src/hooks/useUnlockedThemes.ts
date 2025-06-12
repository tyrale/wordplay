/**
 * Hook for Unlocked Themes
 * 
 * Provides filtered theme list based on unlock state.
 * Used by menu and other components that should only show unlocked themes.
 */

import { useMemo } from 'react';
import { availableThemes } from '../types/theme';
import type { GameTheme } from '../types/theme';

interface UseUnlockedThemesProps {
  unlockedThemes: string[];
}

export function useUnlockedThemes({ unlockedThemes }: UseUnlockedThemesProps) {
  const filteredThemes = useMemo(() => {
    return availableThemes.filter(theme => {
      // Map theme names to unlock IDs
      // Most themes use their name directly, but some have special mappings
      const unlockId = getThemeUnlockId(theme.name);
      return unlockedThemes.includes(unlockId);
    });
  }, [unlockedThemes]);

  return filteredThemes;
}

/**
 * Map theme names to their unlock IDs
 * Most themes use their name directly, but some have special cases
 */
function getThemeUnlockId(themeName: string): string {
  // Handle special theme name mappings
  const specialMappings: Record<string, string> = {
    'classic blue': 'classic blue', // Default theme, always unlocked
    // Add any other special mappings here if needed
  };

  return specialMappings[themeName] || themeName;
} 