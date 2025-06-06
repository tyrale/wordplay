/**
 * Animation System Types
 * 
 * Cross-platform animation system supporting web (CSS), iOS, and Android
 * with theme-based animation sets and accessibility support.
 */

export interface Keyframe {
  offset: number; // 0 to 1
  transform?: string;
  opacity?: number;
  scale?: number;
  translateX?: string;
  translateY?: string;
  rotate?: string;
  filter?: string;
  [property: string]: any;
}

export interface Animation {
  name: string;
  duration: number; // milliseconds
  easing: string; // CSS easing function
  keyframes: Keyframe[];
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
  delay?: number;
  iterations?: number | 'infinite';
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
}

export interface ComponentAnimations {
  // Letter lifecycle
  letterEntry: Animation;      // Letter appears in grid/word
  letterExit: Animation;       // Letter disappears
  letterMove: Animation;       // Letter moves between positions
  letterPress: Animation;      // Letter press/tap feedback
  letterSuccess: Animation;    // Letter successfully used
  letterError: Animation;      // Letter invalid/error state
  
  // Word operations
  wordComplete: Animation;     // Word submission success
  wordInvalid: Animation;      // Word validation failure
  wordClear: Animation;        // Word cleared/reset
  
  // Score operations
  scoreUpdate: Animation;      // Score change animation
  scorePulse: Animation;       // Score attention grabber
  
  // Background effects
  backgroundIdle: Animation;   // Continuous background animation
  backgroundTransition: Animation; // Background state changes
}

export interface AnimationTheme {
  name: string;
  description: string;
  
  // Component animation sets
  gridCell: ComponentAnimations;
  wordBuilder: ComponentAnimations;
  scoreDisplay: ComponentAnimations;
  wordTrail: ComponentAnimations;
  alphabetGrid: ComponentAnimations;
  
  // Global background animations
  background: ComponentAnimations;
  
  // Theme configuration
  config: {
    respectsReducedMotion: boolean;
    supportsCSSAnimations: boolean;
    supportsWebAnimationsAPI: boolean;
    defaultDuration: number;
    defaultEasing: string;
  };
}

export interface AnimationContextValue {
  currentTheme: AnimationTheme;
  availableThemes: AnimationTheme[];
  setTheme: (themeName: string) => void;
  isReducedMotion: boolean;
  
  // Animation control methods
  animate: (element: HTMLElement, animationName: string, component: string) => Promise<void>;
  stopAnimation: (element: HTMLElement) => void;
  stopAllAnimations: () => void;
}

export interface AnimationHookReturn {
  // Direct animation triggers
  animateLetterEntry: (element: HTMLElement) => Promise<void>;
  animateLetterExit: (element: HTMLElement) => Promise<void>;
  animateLetterMove: (element: HTMLElement) => Promise<void>;
  animateLetterPress: (element: HTMLElement) => Promise<void>;
  animateLetterSuccess: (element: HTMLElement) => Promise<void>;
  animateLetterError: (element: HTMLElement) => Promise<void>;
  
  animateWordComplete: (element: HTMLElement) => Promise<void>;
  animateWordInvalid: (element: HTMLElement) => Promise<void>;
  animateWordClear: (element: HTMLElement) => Promise<void>;
  
  animateScoreUpdate: (element: HTMLElement) => Promise<void>;
  animateScorePulse: (element: HTMLElement) => Promise<void>;
  
  animateBackgroundIdle: (element: HTMLElement) => Promise<void>;
  animateBackgroundTransition: (element: HTMLElement) => Promise<void>;
  
  // Animation state
  isAnimating: boolean;
  currentTheme: string;
  isReducedMotion: boolean;
}

export type AnimationTrigger = 'auto' | 'manual' | 'both';
export type AnimationComponent = 'gridCell' | 'wordBuilder' | 'scoreDisplay' | 'wordTrail' | 'alphabetGrid' | 'background';
export type AnimationEvent = 'entry' | 'exit' | 'move' | 'press' | 'success' | 'error' | 'complete' | 'invalid' | 'clear' | 'update' | 'pulse' | 'idle' | 'transition'; 