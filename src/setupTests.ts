import '@testing-library/jest-dom';

// =============================================================================
// BROWSER API MOCKS FOR NODE.JS TEST ENVIRONMENT
// =============================================================================

// This setup file is also loaded by the Storybook Vitest browser-mode project, which
// runs in a real Chromium browser (via Playwright) that already has native, working
// `indexedDB`/`fetch`/`localStorage`. Overriding/polyfilling them there throws (e.g.
// "Cannot set property indexedDB ... which has only a getter") or is simply
// unnecessary, so all of the mocks below are scoped to Node/jsdom only.
const isRealBrowser = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

// Mock IndexedDB for browser unlock adapter tests
if (!isRealBrowser) {
  // @ts-expect-error - fake-indexeddb's package.json "exports" map doesn't resolve its own .d.ts for dynamic import
  await import('fake-indexeddb/auto');
}

// Mock fetch for dictionary loading in browser adapter
import { vi } from 'vitest';

// Global fetch mock for dictionary loading
if (!isRealBrowser) {
  globalThis.fetch = vi.fn();
}

// Setup default fetch mock responses
beforeEach(() => {
  if (isRealBrowser) {
    return;
  }

  // Reset fetch mock before each test
  vi.mocked(globalThis.fetch).mockClear();
  
  // Default mock for enable1.txt dictionary file
  vi.mocked(globalThis.fetch).mockImplementation((url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    if (urlString.includes('enable1.txt') || urlString.endsWith('/enable1.txt')) {
      // Mock dictionary content for tests
      const mockDictionary = [
        'CAT', 'DOG', 'FISH', 'BIRD', 'MOUSE', 'HORSE', 'COW', 'PIG', 'SHEEP', 'GOAT',
        'CATS', 'DOGS', 'COAT', 'BOAT', 'GOATS', 'COATS', 'BOATS',
        'HELLO', 'WORLD', 'TEST', 'WORD', 'GAME', 'PLAY', 'TURN', 'MOVE',
        'TESTING', 'BROWSER', 'ADAPTER'
      ].join('\n');
      
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(mockDictionary),
        json: () => Promise.resolve({}),
        headers: new Headers(),
        redirected: false,
        type: 'basic' as ResponseType,
        url: urlString,
        clone: function() { return this; },
        body: null,
        bodyUsed: false,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        blob: () => Promise.resolve(new Blob()),
        formData: () => Promise.resolve(new FormData())
      } as Response);
    }
    
    // Default 404 for unknown URLs
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve(''),
      json: () => Promise.resolve({}),
      headers: new Headers(),
      redirected: false,
      type: 'basic' as ResponseType,
      url: urlString,
      clone: function() { return this; },
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData())
    } as Response);
  });
});

// Mock localStorage for fallback unlock persistence
if (!isRealBrowser) {
  Object.defineProperty(window, 'localStorage', {
    value: {
      store: {} as Record<string, string>,
      getItem: function(key: string) {
        return this.store[key] || null;
      },
      setItem: function(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem: function(key: string) {
        delete this.store[key];
      },
      clear: function() {
        this.store = {};
      },
      get length() {
        return Object.keys(this.store).length;
      },
      key: function(index: number) {
        const keys = Object.keys(this.store);
        return keys[index] || null;
      }
    },
    writable: true
  });
}

// Ensure URL constructor is available for test environment
if (typeof URL === 'undefined') {
  const { URL: NodeURL } = await import('url');
  globalThis.URL = class MockURL {
    public href: string;
    constructor(href: string, base?: string) {
      this.href = base ? new NodeURL(href, base).href : href;
    }
    toString() {
      return this.href;
    }
  } as unknown as typeof URL;
}
