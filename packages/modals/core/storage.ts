// Injectable key-value storage for frequency capping. No global window/localStorage access outside
// this file; everything else in the package receives a KeyValueStorage instance as a dependency.

export interface KeyValueStorage {
  get(key: string): string | null;
  /** Never throws: wrapped in try/catch (e.g. QuotaExceededError, Safari private mode). */
  set(key: string, value: string): void;
  remove(key: string): void;
}

const PROBE_KEY = '__modularcore_modals_probe__';

/**
 * Feature-detects the storage instead of just checking `typeof window`: some environments define
 * the global but throw on access (Safari private mode, SSR shims, storage quota) — the probe
 * write/remove surfaces that up front so callers fall back to in-memory storage instead of
 * throwing on first real use. Mirrors ai-chat/core/history/local.ts's detectLocalStorage.
 */
function detectStorage(kind: 'session' | 'local'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage = kind === 'session' ? window.sessionStorage : window.localStorage;
    if (!storage) return null;
    storage.setItem(PROBE_KEY, '1');
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}

function fromWebStorage(storage: Storage): KeyValueStorage {
  return {
    get(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        storage.setItem(key, value);
      } catch {
        // Quota exceeded or storage revoked mid-session: silently drop, never break the caller.
      }
    },
    remove(key) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignore: removal failures must not break the caller.
      }
    },
  };
}

/** In-memory fallback: also used directly by tests as a deterministic, DOM-free store. */
export function memoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

/** Browser storage with probe-based detection; degrades to in-memory when unavailable. */
export function browserStorage(kind: 'session' | 'local'): KeyValueStorage {
  const detected = detectStorage(kind);
  return detected ? fromWebStorage(detected) : memoryStorage();
}
