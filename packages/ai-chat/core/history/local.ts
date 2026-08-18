import { messageSchema } from './types.js';

import type { ChatHistory, Message } from './types.js';

export interface LocalHistoryOptions {
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'modularcore:ai-chat:history';

/**
 * Feature-detects `localStorage` instead of just checking `typeof localStorage`: some
 * environments define the global but throw on access (Safari private mode, SSR shims, storage
 * quota exceeded) — the probe write/remove surfaces that up front so `local.ts` falls back to
 * in-memory storage instead of throwing on the first real `append()`.
 */
function detectLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probeKey = '__modularcore_ai_chat_probe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    return localStorage;
  } catch {
    return null;
  }
}

export function createLocalHistory(options: LocalHistoryOptions = {}): ChatHistory {
  const storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
  const storage = detectLocalStorage();
  let memory: Message[] = [];

  function readAll(): Message[] {
    if (!storage) return memory;
    const raw = storage.getItem(storageKey);
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    // Silently drop entries that no longer match the schema (e.g. an older schema version)
    // rather than failing `load()` — local storage is not a trust boundary the way a backend
    // is (AD5), it is data this same client previously wrote.
    return parsed.filter((entry): entry is Message => messageSchema.safeParse(entry).success);
  }

  function writeAll(messages: Message[]): void {
    if (!storage) {
      memory = messages;
      return;
    }
    storage.setItem(storageKey, JSON.stringify(messages));
  }

  return {
    async load() {
      return readAll();
    },
    async append(message) {
      const validated = messageSchema.parse(message);
      writeAll([...readAll(), validated]);
    },
    async clear() {
      writeAll([]);
    },
  };
}
