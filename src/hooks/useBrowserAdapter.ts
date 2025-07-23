/**
 * Singleton hook for browser adapter
 * Prevents multiple adapter instances and React hooks order issues
 */

import { useState, useEffect, useRef } from 'react';
import { createBrowserAdapter } from '../adapters/browserAdapter';
import type { BrowserAdapter } from '../adapters/browserAdapter';
import type { WordDataDependencies } from '../../packages/engine/interfaces';

interface UseBrowserAdapterReturn {
  adapter: BrowserAdapter | null;
  wordData: WordDataDependencies | null;
  isLoaded: boolean;
  error: string | null;
}

// Global singleton state
let globalAdapter: BrowserAdapter | null = null;
let globalWordData: WordDataDependencies | null = null;
let globalIsLoaded = false;
let globalError: string | null = null;
let initializationPromise: Promise<void> | null = null;

// Listeners for state changes
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

const initializeAdapter = async (): Promise<void> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('Initializing browser adapter singleton...');
      const adapter = await createBrowserAdapter();
      const wordData = adapter.getWordData();
      
      // Wait for word data to load
      if (wordData && typeof wordData.waitForLoad === 'function') {
        await wordData.waitForLoad();
      }
      
      globalAdapter = adapter;
      globalWordData = wordData;
      globalIsLoaded = true;
      globalError = null;
      
      console.log('Browser adapter singleton initialized successfully');
      notifyListeners();
    } catch (error) {
      globalError = error instanceof Error ? error.message : 'Failed to initialize adapter';
      globalIsLoaded = false;
      console.error('Failed to initialize browser adapter singleton:', error);
      notifyListeners();
    }
  })();

  return initializationPromise;
};

/**
 * Hook that provides access to the singleton browser adapter
 */
export function useBrowserAdapter(): UseBrowserAdapterReturn {
  const [, forceUpdate] = useState({});
  const hasInitialized = useRef(false);

  const rerender = () => forceUpdate({});

  useEffect(() => {
    // Add this component as a listener
    listeners.add(rerender);

    // Initialize adapter if not already done
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      initializeAdapter();
    }

    return () => {
      listeners.delete(rerender);
    };
  }, []);

  return {
    adapter: globalAdapter,
    wordData: globalWordData,
    isLoaded: globalIsLoaded,
    error: globalError
  };
} 