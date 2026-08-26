import { describe, expect, it, afterEach, vi } from 'vitest';

import { browserStorage, memoryStorage } from '../../core/storage.js';

describe('memoryStorage', () => {
  it('gets/sets/removes without touching any global', () => {
    const store = memoryStorage();
    expect(store.get('k')).toBeNull();
    store.set('k', 'v');
    expect(store.get('k')).toBe('v');
    store.remove('k');
    expect(store.get('k')).toBeNull();
  });
});

describe('browserStorage', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it('degrades to memory when window is undefined (SSR)', () => {
    // @ts-expect-error simulate SSR
    delete globalThis.window;
    const store = browserStorage('session');
    store.set('k', 'v');
    expect(store.get('k')).toBe('v');
  });

  it('degrades to memory when the storage probe throws (quota/private mode)', () => {
    const throwingStorage = {
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      getItem: vi.fn(),
      removeItem: vi.fn(),
    };
    // @ts-expect-error partial Storage mock is sufficient for the probe path
    globalThis.window = { sessionStorage: throwingStorage, localStorage: throwingStorage };

    const store = browserStorage('session');
    // Falls back to memory: set/get roundtrip works even though the real storage always throws.
    store.set('k', 'v');
    expect(store.get('k')).toBe('v');
    expect(throwingStorage.setItem).toHaveBeenCalledTimes(1); // only the probe call
  });
});
