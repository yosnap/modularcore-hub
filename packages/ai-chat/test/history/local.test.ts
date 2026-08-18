import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createLocalHistory } from '../../core/history/local.js';

import type { Message } from '../../core/history/types.js';

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    role: 'user',
    content: 'hi',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('createLocalHistory — localStorage available', () => {
  beforeEach(() => {
    // jsdom-less Node test env: install a minimal real Storage-like implementation so the
    // feature-detection probe in local.ts succeeds and exercises the localStorage code path.
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('append/load/clear round-trip through localStorage', async () => {
    const history = createLocalHistory({ storageKey: 'test-key' });
    expect(await history.load()).toEqual([]);

    await history.append(makeMessage({ id: 'm1' }));
    await history.append(makeMessage({ id: 'm2', content: 'second' }));
    expect((await history.load()).map((m) => m.id)).toEqual(['m1', 'm2']);

    await history.clear();
    expect(await history.load()).toEqual([]);
  });

  it('rejects appending a message that fails the schema', async () => {
    const history = createLocalHistory({ storageKey: 'test-key-2' });
    // @ts-expect-error intentionally invalid role for the failure-path test
    await expect(
      history.append({ id: 'bad', role: 'nope', content: 'x', createdAt: 'now' }),
    ).rejects.toThrow();
  });

  it('drops entries that no longer match the schema instead of throwing on load', async () => {
    (globalThis as unknown as { localStorage: Storage }).localStorage.setItem(
      'test-key-3',
      JSON.stringify([{ id: 'stale', role: 'user' /* missing content/createdAt */ }]),
    );
    const history = createLocalHistory({ storageKey: 'test-key-3' });
    expect(await history.load()).toEqual([]);
  });
});

describe('createLocalHistory — no localStorage (SSR/Node without a browser global)', () => {
  it('falls back to an in-memory store instead of throwing', async () => {
    expect(typeof (globalThis as { localStorage?: unknown }).localStorage).toBe('undefined');
    const history = createLocalHistory();

    await history.append(makeMessage());
    expect(await history.load()).toHaveLength(1);
    await history.clear();
    expect(await history.load()).toEqual([]);
  });

  it('keeps separate instances independent (no shared module-level state)', async () => {
    const historyA = createLocalHistory();
    const historyB = createLocalHistory();
    await historyA.append(makeMessage({ id: 'only-in-a' }));
    expect(await historyB.load()).toEqual([]);
  });
});
