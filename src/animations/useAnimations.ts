/**
 * useAnimations Hook
 * 
 * Provides component-specific animation methods with easy-to-use API.
 * Handles the complexity of animation system while providing simple
 * trigger functions for components.
 */

import { useCallback } from 'react';
import { useAnimationContext } from './AnimationProvider';
import type { AnimationHookReturn, AnimationComponent } from './types';

export const useAnimations = (component: AnimationComponent): AnimationHookReturn => {
  const { animate, currentTheme, isReducedMotion } = useAnimationContext();

  // Helper to create animation trigger functions
  const createAnimationTrigger = useCallback((animationName: string) => {
    return async (element: HTMLElement): Promise<void> => {
      return animate(element, animationName, component);
    };
  }, [animate, component]);

  // Letter animations
  const animateLetterEntry = useCallback(
    (element: HTMLElement) => createAnimationTrigger('letterEntry')(element),
    [createAnimationTrigger]
  );

  const animateLetterExit = useCallback(
    (element: HTMLElement) => createAnimationTrigger('letterExit')(element),
    [createAnimationTrigger]
  );

  const animateLetterMove = useCallback(
    (element: HTMLElement) => createAnimationTrigger('letterMove')(element),
    [createAnimationTrigger]
  );

  const animateLetterHover = useCallback(
    (element: HTMLElement) => createAnimationTrigger('letterHover')(element),
    [createAnimationTrigger]
  );

  const animateLetterPress = useCallback(
    (element: HTMLElement) => createAnimationTrigger('letterPress')(element),
    [createAnimationTrigger]
  );

  const animateLetterSuccess = useCallback(
    (element: HTMLElement) => createAnimationTrigger('letterSuccess')(element),
    [createAnimationTrigger]
  );

  const animateLetterError = useCallback(
    (element: HTMLElement) => createAnimationTrigger('letterError')(element),
    [createAnimationTrigger]
  );

  // Word animations
  const animateWordComplete = useCallback(
    (element: HTMLElement) => createAnimationTrigger('wordComplete')(element),
    [createAnimationTrigger]
  );

  const animateWordInvalid = useCallback(
    (element: HTMLElement) => createAnimationTrigger('wordInvalid')(element),
    [createAnimationTrigger]
  );

  const animateWordClear = useCallback(
    (element: HTMLElement) => createAnimationTrigger('wordClear')(element),
    [createAnimationTrigger]
  );

  // Score animations
  const animateScoreUpdate = useCallback(
    (element: HTMLElement) => createAnimationTrigger('scoreUpdate')(element),
    [createAnimationTrigger]
  );

  const animateScorePulse = useCallback(
    (element: HTMLElement) => createAnimationTrigger('scorePulse')(element),
    [createAnimationTrigger]
  );

  // Background animations
  const animateBackgroundIdle = useCallback(
    (element: HTMLElement) => createAnimationTrigger('backgroundIdle')(element),
    [createAnimationTrigger]
  );

  const animateBackgroundTransition = useCallback(
    (element: HTMLElement) => createAnimationTrigger('backgroundTransition')(element),
    [createAnimationTrigger]
  );

  return {
    animateLetterEntry,
    animateLetterExit,
    animateLetterMove,
    animateLetterHover,
    animateLetterPress,
    animateLetterSuccess,
    animateLetterError,
    animateWordComplete,
    animateWordInvalid,
    animateWordClear,
    animateScoreUpdate,
    animateScorePulse,
    animateBackgroundIdle,
    animateBackgroundTransition,
    isAnimating: false, // TODO: Track individual component animation state
    currentTheme: currentTheme.name,
    isReducedMotion
  };
};

// Convenience hooks for specific components
export const useGridCellAnimations = () => useAnimations('gridCell');
export const useWordBuilderAnimations = () => useAnimations('wordBuilder');
export const useScoreDisplayAnimations = () => useAnimations('scoreDisplay');
export const useWordTrailAnimations = () => useAnimations('wordTrail');
export const useAlphabetGridAnimations = () => useAnimations('alphabetGrid');
export const useBackgroundAnimations = () => useAnimations('background'); 