/**
 * Animation System Index
 * 
 * Main entry point for the WordPlay animation system.
 * Exports all types, providers, hooks, and themes.
 */

// Core types
export type {
  Animation,
  AnimationTheme,
  AnimationContextValue,
  AnimationHookReturn,
  AnimationComponent,
  AnimationEvent,
  AnimationTrigger,
  ComponentAnimations,
  Keyframe
} from './types';

// Animation Provider and Context
export {
  AnimationProvider,
  useAnimationContext,
  type AnimationProviderProps
} from './AnimationProvider';

// Animation Hooks
export {
  useAnimations,
  useGridCellAnimations,
  useWordBuilderAnimations,
  useScoreDisplayAnimations,
  useWordTrailAnimations,
  useAlphabetGridAnimations,
  useBackgroundAnimations
} from './useAnimations';

// Animation Themes
export {
  defaultTheme,
  fallingTheme,
  allThemes,
  getThemeByName,
  getDefaultTheme
} from './themes'; 