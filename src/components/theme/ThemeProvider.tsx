import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { defaultTheme, availableThemes } from '../../types/theme';
import type { GameTheme, ThemeContextType } from '../../types/theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
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
  const [currentTheme, setCurrentTheme] = useState<GameTheme>(() => {
    // Try to load saved theme from localStorage
    const savedTheme = localStorage.getItem('wordplay-theme');
    if (savedTheme) {
      try {
        const parsed = JSON.parse(savedTheme);
        // Validate that it's a valid theme
        const foundTheme = availableThemes.find(theme => theme.name === parsed.name);
        return foundTheme || defaultTheme;
      } catch {
        return defaultTheme;
      }
    }
    return defaultTheme;
  });

  const setTheme = (theme: GameTheme) => {
    setCurrentTheme(theme);
    // Save theme to localStorage
    localStorage.setItem('wordplay-theme', JSON.stringify({ name: theme.name }));
  };

  // Apply theme CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply color variables
    root.style.setProperty('--theme-primary', currentTheme.colors.primary);
    root.style.setProperty('--theme-text', currentTheme.colors.text);
    root.style.setProperty('--theme-text-secondary', currentTheme.colors.textSecondary);
    root.style.setProperty('--theme-background', currentTheme.colors.background);
    root.style.setProperty('--theme-surface', currentTheme.colors.surface);
    root.style.setProperty('--theme-surface-hover', currentTheme.colors.surfaceHover);
    root.style.setProperty('--theme-accent', currentTheme.colors.accent);
    root.style.setProperty('--theme-accent-text', currentTheme.colors.accentText);
    root.style.setProperty('--theme-locked', currentTheme.colors.locked);
    root.style.setProperty('--theme-disabled', currentTheme.colors.disabled);
    
    // Apply typography variables
    root.style.setProperty('--theme-font-family', currentTheme.typography.fontFamily);
    root.style.setProperty('--theme-font-weight', currentTheme.typography.fontWeight.toString());
    root.style.setProperty('--theme-font-size-xl', currentTheme.typography.fontSizeXL);
    root.style.setProperty('--theme-font-size-lg', currentTheme.typography.fontSizeLG);
    root.style.setProperty('--theme-font-size-md', currentTheme.typography.fontSizeMD);
    root.style.setProperty('--theme-font-size-sm', currentTheme.typography.fontSizeSM);
  }, [currentTheme]);

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    availableThemes,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 