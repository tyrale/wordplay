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
      const unlockId = getThemeUnlockId(theme.name);
      return unlockedThemes.includes(unlockId);
    });
  }, [unlockedThemes]);

  // Ensure classic blue is always first in the list
  const sortedThemes = useMemo(() => {
    const classicBlue = filteredThemes.find(theme => 
      theme.name.toLowerCase() === 'classic blue'
    );
    const otherThemes = filteredThemes.filter(theme => 
      theme.name.toLowerCase() !== 'classic blue'
    );
    
    return classicBlue ? [classicBlue, ...otherThemes] : filteredThemes;
  }, [filteredThemes]);

  return sortedThemes;
}

/**
 * Map theme names to their unlock IDs
 * Handles case-insensitive matching and special mappings
 */
function getThemeUnlockId(themeName: string): string {
  // Convert to lowercase for consistent matching
  const lowerName = themeName.toLowerCase();
  
  // Handle special theme name mappings
  const specialMappings: Record<string, string> = {
    'classic blue': 'classic blue', // Default theme, always unlocked
  };

  return specialMappings[lowerName] || lowerName;
} 