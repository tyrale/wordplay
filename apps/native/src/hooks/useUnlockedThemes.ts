/**
 * Direct port of apps/web's `hooks/useUnlockedThemes.ts` - pure filtering
 * logic with no DOM dependency, ported as-is.
 */
import { useMemo } from 'react';
import { availableThemes } from '@wordplay/theme/theme';

interface UseUnlockedThemesProps {
  unlockedThemes: string[];
}

export function useUnlockedThemes({ unlockedThemes }: UseUnlockedThemesProps) {
  const filteredThemes = useMemo(() => {
    return availableThemes.filter(theme => {
      const unlockId = getThemeUnlockId(theme.name);
      return unlockedThemes.includes(unlockId);
    });
  }, [unlockedThemes]);

  const sortedThemes = useMemo(() => {
    const classicBlue = filteredThemes.find(theme => theme.name.toLowerCase() === 'classic blue');
    const otherThemes = filteredThemes.filter(theme => theme.name.toLowerCase() !== 'classic blue');
    return classicBlue ? [classicBlue, ...otherThemes] : filteredThemes;
  }, [filteredThemes]);

  return sortedThemes;
}

function getThemeUnlockId(themeName: string): string {
  const lowerName = themeName.toLowerCase();
  const specialMappings: Record<string, string> = {
    'classic blue': 'classic blue'
  };
  return specialMappings[lowerName] || lowerName;
}
