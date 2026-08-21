import { renderHook, waitFor } from '@testing-library/react-native';
import { useDictionaryData } from '../useDictionaryData';
import { createNativeAdapter } from '../../adapters/nativeAdapter';

jest.mock('../../adapters/nativeAdapter', () => ({
  createNativeAdapter: jest.fn()
}));

describe('native useDictionaryData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads word data and waits for it, then reports loaded', async () => {
    const waitForLoad = jest.fn().mockResolvedValue(undefined);
    const fakeWordData = {
      enableWords: new Set(['CAT']),
      slangWords: new Set(),
      profanityWords: new Set(),
      properNounWords: new Set(),
      seussCanonicalWords: new Set(),
      seussInventedWords: new Set(),
      wordCount: 1,
      waitForLoad
    };
    (createNativeAdapter as jest.Mock).mockResolvedValue({
      getWordData: () => fakeWordData
    });

    const { result } = renderHook(() => useDictionaryData());

    expect(result.current.isLoaded).toBe(false);
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.wordData).toBe(fakeWordData);
    expect(waitForLoad).toHaveBeenCalledTimes(1);
  });

  it('still reports loaded (with null wordData) if adapter initialization throws', async () => {
    (createNativeAdapter as jest.Mock).mockRejectedValue(new Error('init failed'));

    const { result } = renderHook(() => useDictionaryData());

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.wordData).toBeNull();
  });
});
