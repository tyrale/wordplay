/**
 * Animation context and the `useAnimationContext` hook. Kept apart from
 * `AnimationProvider.tsx` so that file only exports a component (React
 * Fast Refresh requirement).
 */

import { createContext, useContext } from 'react';
import type { AnimationContextValue } from './types';

export const AnimationContext = createContext<AnimationContextValue | null>(
  null
);

// Hook to use animation context
export const useAnimationContext = (): AnimationContextValue => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error(
      'useAnimationContext must be used within AnimationProvider'
    );
  }
  return context;
};
