/**
 * Word path graph context and the context-backed `useWordPathGraph` hook
 * (see `WordPathGraphContext.tsx`). Kept apart from the provider so that
 * file only exports a component (React Fast Refresh requirement).
 */

import { createContext, useContext } from 'react';
import type { UseWordPathGraphReturn } from '../hooks/useWordPathGraph';

export const WordPathGraphContext =
  createContext<UseWordPathGraphReturn | null>(null);

export const useWordPathGraph = (): UseWordPathGraphReturn => {
  const context = useContext(WordPathGraphContext);
  if (!context) {
    throw new Error(
      'useWordPathGraph must be used within a WordPathGraphProvider'
    );
  }
  return context;
};
