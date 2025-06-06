/**
 * Animation Provider
 * 
 * React context provider for managing animation themes and providing
 * cross-platform animation capabilities to components.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AnimationContextValue, AnimationTheme, Animation } from './types';
import { getDefaultTheme, getThemeByName, allThemes } from './themes';

const AnimationContext = createContext<AnimationContextValue | null>(null);

export interface AnimationProviderProps {
  children: React.ReactNode;
  initialTheme?: string;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({
  children,
  initialTheme = 'default'
}) => {
  const [currentTheme, setCurrentTheme] = useState<AnimationTheme>(() => {
    return getThemeByName(initialTheme) || getDefaultTheme();
  });
  
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [activeAnimations, setActiveAnimations] = useState<Set<HTMLElement>>(new Set());

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Set theme by name
  const setTheme = useCallback((themeName: string) => {
    const theme = getThemeByName(themeName);
    if (theme) {
      setCurrentTheme(theme);
      // Save to localStorage for persistence
      localStorage.setItem('wordplay-animation-theme', themeName);
    }
  }, []);

  // Load saved theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('wordplay-animation-theme');
    if (savedTheme && getThemeByName(savedTheme)) {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  // Generate CSS animation from Animation object
  const generateCSSAnimation = useCallback((animation: Animation): string => {
    const keyframes = animation.keyframes.map(frame => {
      const offset = frame.offset * 100;
      const properties = Object.entries(frame)
        .filter(([key]) => key !== 'offset')
        .map(([key, value]) => {
          // Convert camelCase to kebab-case for CSS
          const cssKey = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
          return `${cssKey}: ${value}`;
        })
        .join('; ');
      
      return `${offset}% { ${properties} }`;
    }).join(' ');

    return `
      @keyframes ${animation.name} {
        ${keyframes}
      }
    `;
  }, []);

  // Apply animation to element using CSS animations
  const animate = useCallback(async (
    element: HTMLElement, 
    animationName: string, 
    component: string
  ): Promise<void> => {
    if (!element || isReducedMotion) {
      return Promise.resolve();
    }

    // Get animation from current theme
    const componentAnimations = (currentTheme as any)[component];
    if (!componentAnimations || !componentAnimations[animationName]) {
      console.warn(`Animation ${animationName} not found for component ${component}`);
      return Promise.resolve();
    }

    const animation: Animation = componentAnimations[animationName];

    return new Promise((resolve) => {
      // Add element to active animations
      setActiveAnimations(prev => new Set(prev).add(element));

      // Generate and inject CSS keyframes if needed
      const styleId = `animation-${animation.name}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = generateCSSAnimation(animation);
        document.head.appendChild(style);
      }

      // Apply animation to element
      const animationProperty = [
        animation.name,
        `${animation.duration}ms`,
        animation.easing,
        animation.delay ? `${animation.delay}ms` : '0ms',
        animation.iterations === 'infinite' ? 'infinite' : (animation.iterations || 1),
        animation.direction || 'normal',
        animation.fillMode || 'none'
      ].join(' ');

      element.style.animation = animationProperty;

      // Handle animation end
      const handleAnimationEnd = () => {
        element.removeEventListener('animationend', handleAnimationEnd);
        element.removeEventListener('animationcancel', handleAnimationEnd);
        
        // Reset animation unless fillMode is forwards
        if (animation.fillMode !== 'forwards') {
          element.style.animation = '';
        }
        
        // Remove from active animations
        setActiveAnimations(prev => {
          const newSet = new Set(prev);
          newSet.delete(element);
          return newSet;
        });

        resolve();
      };

      element.addEventListener('animationend', handleAnimationEnd);
      element.addEventListener('animationcancel', handleAnimationEnd);

      // Fallback timeout (animation duration + 100ms buffer)
      setTimeout(handleAnimationEnd, animation.duration + 100);
    });
  }, [currentTheme, isReducedMotion, generateCSSAnimation]);

  // Stop animation on specific element
  const stopAnimation = useCallback((element: HTMLElement) => {
    if (element) {
      element.style.animation = '';
      setActiveAnimations(prev => {
        const newSet = new Set(prev);
        newSet.delete(element);
        return newSet;
      });
    }
  }, []);

  // Stop all animations
  const stopAllAnimations = useCallback(() => {
    activeAnimations.forEach(element => {
      element.style.animation = '';
    });
    setActiveAnimations(new Set());
  }, [activeAnimations]);

  // Context value
  const contextValue: AnimationContextValue = {
    currentTheme,
    availableThemes: allThemes,
    setTheme,
    isReducedMotion,
    animate,
    stopAnimation,
    stopAllAnimations
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

// Hook to use animation context
export const useAnimationContext = (): AnimationContextValue => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimationContext must be used within AnimationProvider');
  }
  return context;
}; 