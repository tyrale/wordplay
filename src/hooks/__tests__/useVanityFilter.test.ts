/**
 * Unit tests for useVanityFilter hook with context
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVanityFilter } from '../useVanityFilter';
import { VanityFilterProvider } from '../../contexts/VanityFilterContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock the browser adapter
vi.mock('../../adapters/browserAdapter', () => ({
  createBrowserAdapter: vi.fn().mockResolvedValue({
    getWordData: () => ({
      enableWords: new Set(['CAT', 'DOG', 'TEST']),
      slangWords: new Set(['COOL']),
      profanityWords: new Set(['DAMN', 'SHIT']),
      wordCount: 1000,
      hasWord: () => true,
      isLoaded: () => true,
      waitForLoad: async () => {},
      getRandomWordByLength: () => 'TEST'
    })
  })
}));

describe('useVanityFilter with context', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    expect(result.current.vanityState.hasUnlockedToggle).toBe(false);
    expect(result.current.vanityState.isVanityFilterOn).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should load state from localStorage', () => {
    localStorageMock.setItem('wordplay-vanity-unlocked', 'true');
    localStorageMock.setItem('wordplay-vanity-filter', 'false');
    
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    expect(result.current.vanityState.hasUnlockedToggle).toBe(true);
    expect(result.current.vanityState.isVanityFilterOn).toBe(false);
  });

  it('should toggle vanity filter', () => {
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    act(() => {
      result.current.toggleVanityFilter();
    });
    
    expect(result.current.vanityState.isVanityFilterOn).toBe(false);
    
    act(() => {
      result.current.toggleVanityFilter();
    });
    
    expect(result.current.vanityState.isVanityFilterOn).toBe(true);
  });

  it('should unlock vanity toggle', () => {
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    expect(result.current.vanityState.hasUnlockedToggle).toBe(false);
    
    act(() => {
      result.current.unlockVanityToggle();
    });
    
    expect(result.current.vanityState.hasUnlockedToggle).toBe(true);
  });

  it('should return correct unlock status', () => {
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    expect(result.current.isVanityFilterUnlocked()).toBe(false);
    
    act(() => {
      result.current.unlockVanityToggle();
    });
    
    expect(result.current.isVanityFilterUnlocked()).toBe(true);
  });

  it('should return correct filter status', () => {
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    expect(result.current.isVanityFilterOn()).toBe(true);
    
    act(() => {
      result.current.toggleVanityFilter();
    });
    
    expect(result.current.isVanityFilterOn()).toBe(false);
  });

  it('should persist state to localStorage', () => {
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    act(() => {
      result.current.unlockVanityToggle();
    });
    
    expect(localStorageMock.getItem('wordplay-vanity-unlocked')).toBe('true');
    
    act(() => {
      result.current.toggleVanityFilter();
    });
    
    expect(localStorageMock.getItem('wordplay-vanity-filter')).toBe('false');
  });

  it('should get display word', () => {
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    const displayWord = result.current.getDisplayWord('shit');
    expect(displayWord).toBe('S***'); // Should be censored by default
  });

  it('should check if word unlocks vanity', () => {
    const { result } = renderHook(() => useVanityFilter(), {
      wrapper: VanityFilterProvider
    });
    
    expect(result.current.shouldWordUnlockVanity('shit')).toBe(true);
    expect(result.current.shouldWordUnlockVanity('test')).toBe(false);
  });
}); 