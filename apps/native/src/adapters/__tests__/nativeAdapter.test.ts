/**
 * Tests for the native dictionary/scoring/bot adapter.
 *
 * Mirrors apps/web/src/adapters/integration.test.ts's "Browser Adapter"
 * suite, but exercises the bundled-JSON-asset loading path instead of
 * `fetch()`, and runs under RN's Jest environment instead of jsdom/Vitest.
 */
import { NativeAdapter, createNativeAdapter } from '../nativeAdapter';

describe('NativeAdapter', () => {
  it('should initialize successfully from bundled word-list assets', async () => {
    const adapter = NativeAdapter.getInstance();
    await adapter.initialize();

    expect(adapter.isInitialized).toBe(true);

    const status = adapter.getDictionaryStatus();
    expect(status.loaded).toBe(true);
    // The full ENABLE word list (~172k words), not the small test fallback.
    expect(status.wordCount).toBeGreaterThan(100000);
  });

  it('should load the full set of bundled word lists, not just enableWords', async () => {
    const adapter = await createNativeAdapter();
    const wordData = adapter.getWordData();

    expect(wordData.slangWords.size).toBeGreaterThan(0);
    expect(wordData.profanityWords.size).toBeGreaterThan(0);
    expect(wordData.properNounWords.size).toBeGreaterThan(0);
    expect(wordData.seussCanonicalWords.size).toBeGreaterThan(0);
    expect(wordData.seussInventedWords.size).toBeGreaterThan(0);
  });

  it('should validate words the same way the browser adapter does', async () => {
    const adapter = await createNativeAdapter();
    const dependencies = adapter.getDictionaryDependencies();

    const valid = dependencies.validateWord('CAT');
    expect(valid.isValid).toBe(true);

    const invalid = dependencies.validateWord('ZZZZZZQXJ');
    expect(invalid.isValid).toBe(false);
  });

  it('should generate a bot move using the bundled dictionary', async () => {
    const adapter = await createNativeAdapter();
    const dependencies = adapter.getGameDependencies();

    const result = await dependencies.generateBotMove('CAT');
    expect(result).toBeDefined();
    if (result.move) {
      expect(typeof result.move.word).toBe('string');
      expect(typeof result.move.score).toBe('number');
    }
  });

  it('should return a random word of the requested length from bundled data', async () => {
    const adapter = await createNativeAdapter();
    const word = adapter.getDictionaryDependencies().getRandomWordByLength(4);
    expect(word).not.toBeNull();
    expect(word!.length).toBe(4);
  });
});
