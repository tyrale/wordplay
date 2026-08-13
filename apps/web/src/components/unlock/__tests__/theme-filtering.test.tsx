/**
 * Theme Filtering Tests
 * 
 * Tests the theme filtering logic to ensure unlocked themes appear correctly.
 */

import { describe, it, expect } from 'vitest';
import { useUnlockedThemes } from '../../../hooks/useUnlockedThemes';
import { renderHook } from '@testing-library/react';
import type { GameTheme } from '../../../types/theme';

describe('Theme Filtering', () => {
  it('should include classic blue as default theme', () => {
    const { result } = renderHook(() => 
      useUnlockedThemes({ unlockedThemes: ['classic blue'] })
    );

    const themes = result.current;
    expect(themes).toHaveLength(1);
    expect(themes[0].name).toBe('Classic Blue');
  });

  it('should include red theme when unlocked', () => {
    const { result } = renderHook(() => 
      useUnlockedThemes({ unlockedThemes: ['classic blue', 'red'] })
    );

    const themes = result.current;
    expect(themes).toHaveLength(2);
    
    // Classic blue should be first
    expect(themes[0].name).toBe('Classic Blue');
    
    // Red should be included
    const redTheme = themes.find((theme: GameTheme) => theme.name === 'red');
    expect(redTheme).toBeDefined();
    expect(redTheme?.name).toBe('red');
  });

  it('should handle case-insensitive theme matching', () => {
    const { result } = renderHook(() => 
      useUnlockedThemes({ unlockedThemes: ['classic blue', 'red', 'blue', 'green'] })
    );

    const themes = result.current;
    expect(themes.length).toBeGreaterThan(1);
    
    // Should find themes regardless of case in unlock list
    const themeNames = themes.map((t: GameTheme) => t.name.toLowerCase());
    expect(themeNames).toContain('classic blue');
    expect(themeNames).toContain('red');
    expect(themeNames).toContain('blue');
    expect(themeNames).toContain('green');
  });

  it('should always put classic blue first', () => {
    const { result } = renderHook(() => 
      useUnlockedThemes({ unlockedThemes: ['red', 'blue', 'classic blue', 'green'] })
    );

    const themes = result.current;
    expect(themes[0].name).toBe('Classic Blue');
  });

  it('should not include themes that are not unlocked', () => {
    const { result } = renderHook(() => 
      useUnlockedThemes({ unlockedThemes: ['classic blue', 'red'] })
    );

    const themes = result.current;
    const themeNames = themes.map((t: GameTheme) => t.name.toLowerCase());
    
    // Should include unlocked themes
    expect(themeNames).toContain('classic blue');
    expect(themeNames).toContain('red');
    
    // Should not include non-unlocked themes
    expect(themeNames).not.toContain('purple');
    expect(themeNames).not.toContain('green');
    expect(themeNames).not.toContain('yellow');
  });
}); 