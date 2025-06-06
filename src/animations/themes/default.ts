/**
 * Default Animation Theme
 * 
 * Smooth, elegant transitions that enhance the game experience
 * without being distracting. Focus on accessibility and performance.
 */

import type { AnimationTheme } from '../types';

export const defaultTheme: AnimationTheme = {
  name: 'default',
  description: 'Smooth, elegant transitions with subtle feedback',
  
  config: {
    respectsReducedMotion: true,
    supportsCSSAnimations: true,
    supportsWebAnimationsAPI: true,
    defaultDuration: 300,
    defaultEasing: 'cubic-bezier(0.25, 0.8, 0.25, 1)', // Material Design easing
  },
  
  gridCell: {
    letterEntry: {
      name: 'gridCell-letterEntry',
      duration: 400,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bounce easing
      keyframes: [
        { offset: 0, opacity: 0, scale: 0.8, transform: 'scale(0.8) translateY(-10px)' },
        { offset: 0.6, opacity: 0.8, scale: 1.05, transform: 'scale(1.05) translateY(0px)' },
        { offset: 1, opacity: 1, scale: 1, transform: 'scale(1) translateY(0px)' }
      ],
      fillMode: 'forwards'
    },
    
    letterExit: {
      name: 'gridCell-letterExit',
      duration: 250,
      easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)', // Ease-in-quad
      keyframes: [
        { offset: 0, opacity: 1, scale: 1, transform: 'scale(1) translateY(0px)' },
        { offset: 0.5, opacity: 0.5, scale: 0.95, transform: 'scale(0.95) translateY(5px)' },
        { offset: 1, opacity: 0, scale: 0.8, transform: 'scale(0.8) translateY(10px)' }
      ],
      fillMode: 'forwards'
    },
    
    letterMove: {
      name: 'gridCell-letterMove',
      duration: 350,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Ease-out-quad
      keyframes: [
        { offset: 0, transform: 'translateX(0px) translateY(0px)' },
        { offset: 0.3, transform: 'translateX(var(--move-x, 0px)) translateY(var(--move-y, 0px)) scale(1.02)' },
        { offset: 1, transform: 'translateX(var(--target-x, 0px)) translateY(var(--target-y, 0px)) scale(1)' }
      ],
      fillMode: 'forwards'
    },
    
    letterHover: {
      name: 'gridCell-letterHover',
      duration: 200,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, scale: 1, transform: 'scale(1)' },
        { offset: 1, scale: 1.05, transform: 'scale(1.05)' }
      ],
      fillMode: 'forwards'
    },
    
    letterPress: {
      name: 'gridCell-letterPress',
      duration: 100,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, scale: 1, transform: 'scale(1)' },
        { offset: 0.5, scale: 0.95, transform: 'scale(0.95)' },
        { offset: 1, scale: 1, transform: 'scale(1)' }
      ],
      fillMode: 'none'
    },
    
    letterSuccess: {
      name: 'gridCell-letterSuccess',
      duration: 600,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, scale: 1, filter: 'brightness(1)' },
        { offset: 0.3, scale: 1.1, filter: 'brightness(1.2)' },
        { offset: 0.6, scale: 1.05, filter: 'brightness(1.1)' },
        { offset: 1, scale: 1, filter: 'brightness(1)' }
      ],
      fillMode: 'none'
    },
    
    letterError: {
      name: 'gridCell-letterError',
      duration: 400,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, transform: 'translateX(0px)' },
        { offset: 0.2, transform: 'translateX(-2px)' },
        { offset: 0.4, transform: 'translateX(2px)' },
        { offset: 0.6, transform: 'translateX(-1px)' },
        { offset: 0.8, transform: 'translateX(1px)' },
        { offset: 1, transform: 'translateX(0px)' }
      ],
      fillMode: 'none'
    },
    
    wordComplete: {
      name: 'gridCell-wordComplete',
      duration: 800,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, transform: 'scale(1)', filter: 'hue-rotate(0deg)' },
        { offset: 0.5, transform: 'scale(1.02)', filter: 'hue-rotate(90deg)' },
        { offset: 1, transform: 'scale(1)', filter: 'hue-rotate(0deg)' }
      ],
      fillMode: 'none'
    },
    
    wordInvalid: {
      name: 'gridCell-wordInvalid',
      duration: 300,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, opacity: 1 },
        { offset: 0.5, opacity: 0.6 },
        { offset: 1, opacity: 1 }
      ],
      fillMode: 'none'
    },
    
    wordClear: {
      name: 'gridCell-wordClear',
      duration: 250,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, opacity: 1, scale: 1 },
        { offset: 1, opacity: 0.3, scale: 0.98 }
      ],
      fillMode: 'forwards'
    },
    
    scoreUpdate: {
      name: 'gridCell-scoreUpdate',
      duration: 500,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      keyframes: [
        { offset: 0, scale: 1, opacity: 1 },
        { offset: 0.5, scale: 1.15, opacity: 0.9 },
        { offset: 1, scale: 1, opacity: 1 }
      ],
      fillMode: 'none'
    },
    
    scorePulse: {
      name: 'gridCell-scorePulse',
      duration: 1000,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, opacity: 1 },
        { offset: 0.5, opacity: 0.7 },
        { offset: 1, opacity: 1 }
      ],
      fillMode: 'none',
      iterations: 'infinite'
    },
    
    backgroundIdle: {
      name: 'gridCell-backgroundIdle',
      duration: 4000,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, filter: 'brightness(1)' },
        { offset: 0.5, filter: 'brightness(1.02)' },
        { offset: 1, filter: 'brightness(1)' }
      ],
      fillMode: 'none',
      iterations: 'infinite'
    },
    
    backgroundTransition: {
      name: 'gridCell-backgroundTransition',
      duration: 1000,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, filter: 'brightness(1) saturate(1)' },
        { offset: 0.5, filter: 'brightness(1.1) saturate(1.1)' },
        { offset: 1, filter: 'brightness(1) saturate(1)' }
      ],
      fillMode: 'none'
    }
  },
  
  // Copy the same animations for other components (they can be customized per component)
  wordBuilder: {} as any, // Will be populated below
  scoreDisplay: {} as any,
  wordTrail: {} as any,
  alphabetGrid: {} as any,
  background: {} as any
};

// Populate other components with similar animations (with component-specific tweaks)
defaultTheme.wordBuilder = {
  ...defaultTheme.gridCell,
  
  // Override specific animations for word builder
  letterMove: {
    ...defaultTheme.gridCell.letterMove,
    duration: 250, // Faster for word building
    name: 'wordBuilder-letterMove'
  },
  
  letterEntry: {
    ...defaultTheme.gridCell.letterEntry,
    duration: 300, // Slightly faster
    name: 'wordBuilder-letterEntry'
  }
};

defaultTheme.scoreDisplay = {
  ...defaultTheme.gridCell,
  
  // Score-specific animations
  scoreUpdate: {
    name: 'scoreDisplay-scoreUpdate',
    duration: 700,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    keyframes: [
      { offset: 0, scale: 1, filter: 'brightness(1)' },
      { offset: 0.3, scale: 1.2, filter: 'brightness(1.3)' },
      { offset: 0.7, scale: 1.1, filter: 'brightness(1.2)' },
      { offset: 1, scale: 1, filter: 'brightness(1)' }
    ],
    fillMode: 'none'
  }
};

defaultTheme.wordTrail = {
  ...defaultTheme.gridCell,
  
  // Word trail specific tweaks
  letterEntry: {
    ...defaultTheme.gridCell.letterEntry,
    duration: 350,
    name: 'wordTrail-letterEntry',
    keyframes: [
      { offset: 0, opacity: 0, scale: 0.9, transform: 'scale(0.9) translateX(-20px)' },
      { offset: 1, opacity: 1, scale: 1, transform: 'scale(1) translateX(0px)' }
    ]
  }
};

defaultTheme.alphabetGrid = {
  ...defaultTheme.gridCell
};

defaultTheme.background = {
  ...defaultTheme.gridCell,
  
  // Subtle background animations
  backgroundIdle: {
    name: 'background-idle',
    duration: 8000,
    easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    keyframes: [
      { offset: 0, filter: 'brightness(1) contrast(1)' },
      { offset: 0.33, filter: 'brightness(1.01) contrast(1.01)' },
      { offset: 0.66, filter: 'brightness(0.99) contrast(0.99)' },
      { offset: 1, filter: 'brightness(1) contrast(1)' }
    ],
    fillMode: 'none',
    iterations: 'infinite'
  },
  
  backgroundTransition: {
    name: 'background-transition',
    duration: 1500,
    easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    keyframes: [
      { offset: 0, filter: 'brightness(1) saturate(1) hue-rotate(0deg)' },
      { offset: 0.5, filter: 'brightness(1.05) saturate(1.05) hue-rotate(5deg)' },
      { offset: 1, filter: 'brightness(1) saturate(1) hue-rotate(0deg)' }
    ],
    fillMode: 'none'
  }
}; 