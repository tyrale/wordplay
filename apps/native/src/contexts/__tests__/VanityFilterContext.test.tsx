import React from 'react';
import { render, renderHook, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeAdapter } from '../../adapters/nativeAdapter';
import { VanityFilterProvider, useVanityFilter } from '../VanityFilterContext';

jest.mock('../../adapters/nativeAdapter', () => ({
  createNativeAdapter: jest.fn()
}));

function mockWordData() {
  return {
    enableWords: new Set(['CAT', 'SHIT']),
    slangWords: new Set(),
    profanityWords: new Set(['SHIT']),
    properNounWords: new Set(),
    seussCanonicalWords: new Set(),
    seussInventedWords: new Set(),
    wordCount: 2,
    waitForLoad: jest.fn().mockResolvedValue(undefined)
  };
}

function renderVanityFilter() {
  return renderHook(() => useVanityFilter(), {
    wrapper: ({ children }) => <VanityFilterProvider>{children}</VanityFilterProvider>
  });
}

describe('native VanityFilterContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createNativeAdapter as jest.Mock).mockResolvedValue({ getWordData: () => mockWordData() });
    AsyncStorage.clear();
  });

  it('defaults the filter to on', async () => {
    const { result } = renderVanityFilter();
    expect(result.current.isVanityFilterOn).toBe(true);
  });

  it('never censors a non-profane word, filter on or off', async () => {
    const { result } = renderVanityFilter();
    await waitFor(() => expect(result.current.getDisplayWord('cat')).toBe('CAT'));

    act(() => result.current.toggleVanityFilter());
    await waitFor(() => expect(result.current.isVanityFilterOn).toBe(false));
    expect(result.current.getDisplayWord('cat')).toBe('CAT');
  });

  it('censors a profane word into symbols while the filter is on', async () => {
    const { result } = renderVanityFilter();
    await waitFor(() => expect(result.current.getDisplayWord('shit')).not.toBe('SHIT'));
    // transformToSymbols is one symbol per letter - same length, no real letters leak through.
    expect(result.current.getDisplayWord('shit')).toHaveLength(4);
    expect(result.current.getDisplayWord('shit')).not.toMatch(/[A-Z]/);
  });

  it('shows the real word once the filter is toggled off', async () => {
    const { result } = renderVanityFilter();
    await waitFor(() => expect(result.current.getDisplayWord('shit')).not.toBe('SHIT'));

    act(() => result.current.toggleVanityFilter());
    await waitFor(() => expect(result.current.isVanityFilterOn).toBe(false));
    expect(result.current.getDisplayWord('shit')).toBe('SHIT');
  });

  it('persists the toggle to AsyncStorage under the same key web uses (wordplay-vanity-filter)', async () => {
    const { result } = renderVanityFilter();
    await waitFor(() => expect(result.current.isVanityFilterOn).toBe(true));

    act(() => result.current.toggleVanityFilter());
    await waitFor(async () => expect(await AsyncStorage.getItem('wordplay-vanity-filter')).toBe('false'));
  });

  it('loads a persisted "off" state from AsyncStorage on mount', async () => {
    await AsyncStorage.setItem('wordplay-vanity-filter', 'false');
    const { result } = renderVanityFilter();
    await waitFor(() => expect(result.current.isVanityFilterOn).toBe(false));
  });

  it('throws when used outside a VanityFilterProvider', () => {
    const BadComponent = () => {
      useVanityFilter();
      return null;
    };
    // Suppress the expected React error boundary console noise for this assertion.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<BadComponent />)).toThrow('useVanityFilter must be used within a VanityFilterProvider');
    spy.mockRestore();
  });
});
