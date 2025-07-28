/**
 * React Hook for Vanity Filter State Management
 * Now uses centralized context for shared state across all components
 */

import { useVanityFilter as useVanityFilterContext } from '../contexts/VanityFilterContext';

export interface UseVanityFilterReturn {
  // State
  vanityState: any;
  isLoading: boolean;
  
  // Display functions
  getDisplayWord: (word: string, options?: { isEditing?: boolean }) => string;
  
  // Toggle functions
  toggleVanityFilter: () => void;
  unlockVanityToggle: () => void;
  
  // Query functions
  isVanityFilterUnlocked: () => boolean;
  isVanityFilterOn: () => boolean;
  shouldWordUnlockVanity: (word: string) => boolean;
}

export interface UseVanityFilterProps {
  wordData?: any;
  isLoaded?: boolean;
}

/**
 * Hook for managing vanity filter state in React components
 * Now uses centralized context for shared state across all components
 * Legacy props are ignored - all state comes from context
 */
export function useVanityFilter(props?: UseVanityFilterProps): UseVanityFilterReturn {
  // Use the centralized context instead of local state
  return useVanityFilterContext();
} 