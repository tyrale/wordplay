/**
 * Falling Animation Theme
 * 
 * Letters fall from the top with gravity effects, bounce physics,
 * and dramatic entry/exit animations. More expressive and playful.
 */

import type { AnimationTheme } from '../types';

export const fallingTheme: AnimationTheme = {
  name: 'falling',
  description: 'Gravity-based animations with falling letters and bounce effects',
  
  config: {
    respectsReducedMotion: true,
    supportsCSSAnimations: true,
    supportsWebAnimationsAPI: true,
    defaultDuration: 500,
    defaultEasing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Back easing with overshoot
  },
  
  gridCell: {
    letterEntry: {
      name: 'falling-gridCell-letterEntry',
      duration: 800,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Back with overshoot
      keyframes: [
        { offset: 0, opacity: 0, scale: 0.3, transform: 'scale(0.3) translateY(-50px) rotate(-180deg)' },
        { offset: 0.4, opacity: 0.6, scale: 0.8, transform: 'scale(0.8) translateY(10px) rotate(-30deg)' },
        { offset: 0.7, opacity: 0.9, scale: 1.15, transform: 'scale(1.15) translateY(-5px) rotate(10deg)' },
        { offset: 0.9, opacity: 1, scale: 0.95, transform: 'scale(0.95) translateY(2px) rotate(-2deg)' },
        { offset: 1, opacity: 1, scale: 1, transform: 'scale(1) translateY(0px) rotate(0deg)' }
      ],
      fillMode: 'forwards'
    },
    
    letterExit: {
      name: 'falling-gridCell-letterExit',
      duration: 600,
      easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)', // Ease-in-quad with gravity
      keyframes: [
        { offset: 0, opacity: 1, scale: 1, transform: 'scale(1) translateY(0px) rotate(0deg)' },
        { offset: 0.3, opacity: 0.8, scale: 1.1, transform: 'scale(1.1) translateY(-10px) rotate(5deg)' },
        { offset: 0.6, opacity: 0.4, scale: 0.7, transform: 'scale(0.7) translateY(20px) rotate(45deg)' },
        { offset: 1, opacity: 0, scale: 0.2, transform: 'scale(0.2) translateY(60px) rotate(180deg)' }
      ],
      fillMode: 'forwards'
    },
    
    letterMove: {
      name: 'falling-gridCell-letterMove',
      duration: 700,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Ease-out-quad
      keyframes: [
        { offset: 0, transform: 'translateX(0px) translateY(0px) rotate(0deg)' },
        { offset: 0.2, transform: 'translateX(var(--move-x, 0px)) translateY(-15px) rotate(10deg) scale(1.1)' },
        { offset: 0.6, transform: 'translateX(var(--move-x, 0px)) translateY(var(--move-y, 0px)) rotate(-5deg) scale(1.05)' },
        { offset: 1, transform: 'translateX(var(--target-x, 0px)) translateY(var(--target-y, 0px)) rotate(0deg) scale(1)' }
      ],
      fillMode: 'forwards'
    },
    
    letterHover: {
      name: 'falling-gridCell-letterHover',
      duration: 300,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      keyframes: [
        { offset: 0, scale: 1, transform: 'scale(1) translateY(0px)' },
        { offset: 0.5, scale: 1.1, transform: 'scale(1.1) translateY(-5px)' },
        { offset: 1, scale: 1.08, transform: 'scale(1.08) translateY(-3px)' }
      ],
      fillMode: 'forwards'
    },
    
    letterPress: {
      name: 'falling-gridCell-letterPress',
      duration: 200,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, scale: 1, transform: 'scale(1) translateY(0px)' },
        { offset: 0.3, scale: 0.85, transform: 'scale(0.85) translateY(8px)' },
        { offset: 0.7, scale: 1.1, transform: 'scale(1.1) translateY(-3px)' },
        { offset: 1, scale: 1, transform: 'scale(1) translateY(0px)' }
      ],
      fillMode: 'none'
    },
    
    letterSuccess: {
      name: 'falling-gridCell-letterSuccess',
      duration: 1000,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      keyframes: [
        { offset: 0, scale: 1, filter: 'brightness(1) hue-rotate(0deg)', transform: 'translateY(0px) rotate(0deg)' },
        { offset: 0.2, scale: 1.3, filter: 'brightness(1.5) hue-rotate(120deg)', transform: 'translateY(-15px) rotate(10deg)' },
        { offset: 0.5, scale: 1.1, filter: 'brightness(1.3) hue-rotate(240deg)', transform: 'translateY(5px) rotate(-5deg)' },
        { offset: 0.8, scale: 1.05, filter: 'brightness(1.1) hue-rotate(360deg)', transform: 'translateY(-2px) rotate(2deg)' },
        { offset: 1, scale: 1, filter: 'brightness(1) hue-rotate(0deg)', transform: 'translateY(0px) rotate(0deg)' }
      ],
      fillMode: 'none'
    },
    
    letterError: {
      name: 'falling-gridCell-letterError',
      duration: 600,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, transform: 'translateX(0px) translateY(0px) rotate(0deg)' },
        { offset: 0.1, transform: 'translateX(-8px) translateY(-5px) rotate(-5deg)' },
        { offset: 0.2, transform: 'translateX(8px) translateY(5px) rotate(5deg)' },
        { offset: 0.3, transform: 'translateX(-6px) translateY(-3px) rotate(-3deg)' },
        { offset: 0.4, transform: 'translateX(6px) translateY(3px) rotate(3deg)' },
        { offset: 0.5, transform: 'translateX(-4px) translateY(-2px) rotate(-2deg)' },
        { offset: 0.6, transform: 'translateX(4px) translateY(2px) rotate(2deg)' },
        { offset: 0.7, transform: 'translateX(-2px) translateY(-1px) rotate(-1deg)' },
        { offset: 0.8, transform: 'translateX(2px) translateY(1px) rotate(1deg)' },
        { offset: 1, transform: 'translateX(0px) translateY(0px) rotate(0deg)' }
      ],
      fillMode: 'none'
    },
    
    wordComplete: {
      name: 'falling-gridCell-wordComplete',
      duration: 1200,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      keyframes: [
        { offset: 0, transform: 'scale(1) rotate(0deg)', filter: 'hue-rotate(0deg) brightness(1)' },
        { offset: 0.3, transform: 'scale(1.2) rotate(10deg)', filter: 'hue-rotate(90deg) brightness(1.3)' },
        { offset: 0.6, transform: 'scale(0.9) rotate(-5deg)', filter: 'hue-rotate(180deg) brightness(1.1)' },
        { offset: 0.8, transform: 'scale(1.05) rotate(2deg)', filter: 'hue-rotate(270deg) brightness(1.2)' },
        { offset: 1, transform: 'scale(1) rotate(0deg)', filter: 'hue-rotate(360deg) brightness(1)' }
      ],
      fillMode: 'none'
    },
    
    wordInvalid: {
      name: 'falling-gridCell-wordInvalid',
      duration: 500,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, opacity: 1, filter: 'brightness(1)' },
        { offset: 0.2, opacity: 0.3, filter: 'brightness(0.5)' },
        { offset: 0.4, opacity: 0.8, filter: 'brightness(1.2)' },
        { offset: 0.6, opacity: 0.4, filter: 'brightness(0.7)' },
        { offset: 0.8, opacity: 0.9, filter: 'brightness(1.1)' },
        { offset: 1, opacity: 1, filter: 'brightness(1)' }
      ],
      fillMode: 'none'
    },
    
    wordClear: {
      name: 'falling-gridCell-wordClear',
      duration: 400,
      easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
      keyframes: [
        { offset: 0, opacity: 1, scale: 1, transform: 'translateY(0px) rotate(0deg)' },
        { offset: 0.5, opacity: 0.6, scale: 0.8, transform: 'translateY(10px) rotate(15deg)' },
        { offset: 1, opacity: 0, scale: 0.3, transform: 'translateY(30px) rotate(45deg)' }
      ],
      fillMode: 'forwards'
    },
    
    scoreUpdate: {
      name: 'falling-gridCell-scoreUpdate',
      duration: 800,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      keyframes: [
        { offset: 0, scale: 1, opacity: 1, transform: 'translateY(0px) rotate(0deg)' },
        { offset: 0.4, scale: 1.4, opacity: 0.8, transform: 'translateY(-20px) rotate(10deg)' },
        { offset: 0.7, scale: 1.1, opacity: 1, transform: 'translateY(5px) rotate(-3deg)' },
        { offset: 1, scale: 1, opacity: 1, transform: 'translateY(0px) rotate(0deg)' }
      ],
      fillMode: 'none'
    },
    
    scorePulse: {
      name: 'falling-gridCell-scorePulse',
      duration: 1500,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, opacity: 1, transform: 'translateY(0px)' },
        { offset: 0.33, opacity: 0.6, transform: 'translateY(-3px)' },
        { offset: 0.66, opacity: 0.8, transform: 'translateY(2px)' },
        { offset: 1, opacity: 1, transform: 'translateY(0px)' }
      ],
      fillMode: 'none',
      iterations: 'infinite'
    },
    
    backgroundIdle: {
      name: 'falling-gridCell-backgroundIdle',
      duration: 6000,
      easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
      keyframes: [
        { offset: 0, filter: 'brightness(1) saturate(1)', transform: 'translateY(0px)' },
        { offset: 0.25, filter: 'brightness(1.03) saturate(1.1)', transform: 'translateY(-1px)' },
        { offset: 0.5, filter: 'brightness(0.98) saturate(0.9)', transform: 'translateY(2px)' },
        { offset: 0.75, filter: 'brightness(1.02) saturate(1.05)', transform: 'translateY(-0.5px)' },
        { offset: 1, filter: 'brightness(1) saturate(1)', transform: 'translateY(0px)' }
      ],
      fillMode: 'none',
      iterations: 'infinite'
    },
    
    backgroundTransition: {
      name: 'falling-gridCell-backgroundTransition',
      duration: 2000,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      keyframes: [
        { offset: 0, filter: 'brightness(1) saturate(1) hue-rotate(0deg)', transform: 'scale(1)' },
        { offset: 0.3, filter: 'brightness(1.2) saturate(1.3) hue-rotate(30deg)', transform: 'scale(1.02)' },
        { offset: 0.7, filter: 'brightness(1.1) saturate(1.1) hue-rotate(-10deg)', transform: 'scale(0.98)' },
        { offset: 1, filter: 'brightness(1) saturate(1) hue-rotate(0deg)', transform: 'scale(1)' }
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

// Populate other components with falling-theme-specific animations
fallingTheme.wordBuilder = {
  ...fallingTheme.gridCell,
  
  // Override specific animations for word builder
  letterMove: {
    ...fallingTheme.gridCell.letterMove,
    duration: 400, // Slightly faster for word building
    name: 'falling-wordBuilder-letterMove'
  },
  
  letterEntry: {
    name: 'falling-wordBuilder-letterEntry',
    duration: 600,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: [
      { offset: 0, opacity: 0, scale: 0.5, transform: 'scale(0.5) translateY(-30px) rotate(-90deg)' },
      { offset: 0.6, opacity: 0.8, scale: 1.1, transform: 'scale(1.1) translateY(5px) rotate(10deg)' },
      { offset: 1, opacity: 1, scale: 1, transform: 'scale(1) translateY(0px) rotate(0deg)' }
    ],
    fillMode: 'forwards'
  }
};

fallingTheme.scoreDisplay = {
  ...fallingTheme.gridCell,
  
  // Score-specific falling animations
  scoreUpdate: {
    name: 'falling-scoreDisplay-scoreUpdate',
    duration: 1000,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: [
      { offset: 0, scale: 1, filter: 'brightness(1)', transform: 'translateY(0px) rotate(0deg)' },
      { offset: 0.2, scale: 1.5, filter: 'brightness(1.5)', transform: 'translateY(-30px) rotate(15deg)' },
      { offset: 0.5, scale: 1.2, filter: 'brightness(1.3)', transform: 'translateY(10px) rotate(-10deg)' },
      { offset: 0.8, scale: 1.1, filter: 'brightness(1.2)', transform: 'translateY(-5px) rotate(5deg)' },
      { offset: 1, scale: 1, filter: 'brightness(1)', transform: 'translateY(0px) rotate(0deg)' }
    ],
    fillMode: 'none'
  }
};

fallingTheme.wordTrail = {
  ...fallingTheme.gridCell,
  
  // Word trail specific falling animations
  letterEntry: {
    name: 'falling-wordTrail-letterEntry',
    duration: 500,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: [
      { offset: 0, opacity: 0, scale: 0.7, transform: 'scale(0.7) translateX(-30px) translateY(-20px) rotate(-45deg)' },
      { offset: 0.7, opacity: 0.9, scale: 1.05, transform: 'scale(1.05) translateX(5px) translateY(3px) rotate(5deg)' },
      { offset: 1, opacity: 1, scale: 1, transform: 'scale(1) translateX(0px) translateY(0px) rotate(0deg)' }
    ],
    fillMode: 'forwards'
  }
};

fallingTheme.alphabetGrid = {
  ...fallingTheme.gridCell
};

fallingTheme.background = {
  ...fallingTheme.gridCell,
  
  // Dramatic background animations
  backgroundIdle: {
    name: 'falling-background-idle',
    duration: 12000,
    easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
    keyframes: [
      { offset: 0, filter: 'brightness(1) contrast(1) hue-rotate(0deg)', transform: 'translateY(0px)' },
      { offset: 0.2, filter: 'brightness(1.05) contrast(1.05) hue-rotate(10deg)', transform: 'translateY(-2px)' },
      { offset: 0.4, filter: 'brightness(0.95) contrast(0.95) hue-rotate(-5deg)', transform: 'translateY(3px)' },
      { offset: 0.6, filter: 'brightness(1.02) contrast(1.02) hue-rotate(15deg)', transform: 'translateY(-1px)' },
      { offset: 0.8, filter: 'brightness(0.98) contrast(0.98) hue-rotate(-3deg)', transform: 'translateY(1px)' },
      { offset: 1, filter: 'brightness(1) contrast(1) hue-rotate(0deg)', transform: 'translateY(0px)' }
    ],
    fillMode: 'none',
    iterations: 'infinite'
  },
  
  backgroundTransition: {
    name: 'falling-background-transition',
    duration: 2500,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    keyframes: [
      { offset: 0, filter: 'brightness(1) saturate(1) hue-rotate(0deg)', transform: 'scale(1) rotate(0deg)' },
      { offset: 0.3, filter: 'brightness(1.3) saturate(1.4) hue-rotate(45deg)', transform: 'scale(1.05) rotate(2deg)' },
      { offset: 0.6, filter: 'brightness(1.1) saturate(1.2) hue-rotate(-20deg)', transform: 'scale(0.95) rotate(-1deg)' },
      { offset: 1, filter: 'brightness(1) saturate(1) hue-rotate(0deg)', transform: 'scale(1) rotate(0deg)' }
    ],
    fillMode: 'none'
  }
}; 