import { describe, expect, it, vi } from 'vitest';

import { createFrequencyStore } from '../../core/frequency.js';
import { OverlayManager } from '../../core/modals.js';
import { memoryStorage } from '../../core/storage.js';

import type { TriggerEnvironment } from '../../core/triggers.js';
import type { ModalConfig } from '../../core/types.js';
import type { ModalsProvider } from '../../core/provider.js';

function fakeEnv(): TriggerEnvironment & { fireTimeouts(): void; scrollTo(pct: number): void } {
  const timeouts = new Map<number, () => void>();
  let nextId = 1;
  const scrollListeners = new Set<(e: Event) => void>();

  return {
    setTimeout: (fn) => {
      const id = nextId++;
      timeouts.set(id, fn);
      return id;
    },
    clearTimeout: (id) => {
      timeouts.delete(id);
    },
    addEventListener: (type, fn) => {
      if (type === 'scroll') scrollListeners.add(fn);
    },
    removeEventListener: (type, fn) => {
      if (type === 'scroll') scrollListeners.delete(fn);
    },
    scrollPercent: () => 0,
    fireTimeouts() {
      for (const fn of timeouts.values()) fn();
      timeouts.clear();
    },
    scrollTo(pct) {
      for (const fn of [...scrollListeners]) fn({ percent: pct } as unknown as Event);
    },
  };
}

function providerOf(modals: ModalConfig[], hooks: Partial<ModalsProvider> = {}): ModalsProvider {
  return { getActiveModals: async () => modals, ...hooks };
}

function config(overrides: Partial<ModalConfig> = {}): ModalConfig {
  return {
    id: 'a',
    type: 'top-banner',
    message: 'hi',
    trigger: { type: 'manual' },
    ...overrides,
  };
}

function freshStore() {
  return createFrequencyStore({ session: memoryStorage(), local: memoryStorage() });
}

describe('OverlayManager slot selection', () => {
  it('picks 1 overlay per singleton slot by highest priority', async () => {
    const env = fakeEnv();
    const manager = new OverlayManager({
      triggerEnv: env,
      store: freshStore(),
      now: () => new Date('2026-01-01'),
    });
    const provider = providerOf([
      config({ id: 'low', priority: 1, trigger: { type: 'delay', value: 0 } }),
      config({ id: 'high', priority: 5, trigger: { type: 'delay', value: 0 } }),
    ]);

    await manager.load(provider, { path: '/' });
    env.fireTimeouts();

    expect(manager.getState().active['top-banner']?.id).toBe('high');
  });

  it('regression: a slot loser stays independently show()-able by id (manual trigger)', async () => {
    // 'modal' and 'fullscreen' share the same singleton slot. Both configs below are eligible,
    // equal priority, manual trigger — only one can occupy the slot/auto-schedule at a time, but
    // BOTH must remain explicitly show()-able: a caller asking for the loser by id must not
    // silently no-op just because it lost the slot's priority contest during load().
    const env = fakeEnv();
    const manager = new OverlayManager({
      triggerEnv: env,
      store: freshStore(),
      now: () => new Date('2026-01-01'),
    });
    const provider = providerOf([
      config({ id: 'winner', type: 'modal', trigger: { type: 'manual' } }),
      config({ id: 'loser', type: 'fullscreen', trigger: { type: 'manual' } }),
    ]);

    await manager.load(provider, { path: '/' });
    manager.show('loser');

    expect(manager.getState().active.modal?.id).toBe('loser');
  });

  it('regression: showing a config into an already-occupied slot dismisses (not silently overwrites) the previous occupant', async () => {
    const env = fakeEnv();
    const store = freshStore();
    const onInteraction = vi.fn();
    const manager = new OverlayManager({
      triggerEnv: env,
      store,
      now: () => new Date('2026-01-01'),
    });
    const provider = providerOf(
      [
        config({ id: 'first', type: 'modal', trigger: { type: 'manual' } }),
        config({ id: 'second', type: 'fullscreen', trigger: { type: 'manual' } }),
      ],
      { trackInteraction: onInteraction },
    );

    await manager.load(provider, { path: '/' });
    manager.show('first');
    manager.show('second'); // targets the same 'modal' slot 'first' already occupies

    expect(manager.getState().active.modal?.id).toBe('second');
    // The displaced config was dismissed (tracked with a distinct 'replaced' action), not just
    // silently dropped from state with no record of it ever closing.
    expect(onInteraction).toHaveBeenCalledWith(
      expect.objectContaining({ modalId: 'first', action: 'replaced' }),
    );
  });

  it('caps toasts at toastCap and drops the rest', async () => {
    const env = fakeEnv();
    const manager = new OverlayManager({
      triggerEnv: env,
      store: freshStore(),
      now: () => new Date('2026-01-01'),
      toastCap: 2,
    });
    const provider = providerOf([
      config({ id: 't1', type: 'toast', trigger: { type: 'delay', value: 0 } }),
      config({ id: 't2', type: 'toast', trigger: { type: 'delay', value: 0 } }),
      config({ id: 't3', type: 'toast', trigger: { type: 'delay', value: 0 } }),
    ]);

    await manager.load(provider, { path: '/' });
    env.fireTimeouts();

    expect(manager.getState().toasts.map((t) => t.id)).toEqual(['t1', 't2']);
  });
});

describe('OverlayManager load() disposes previous triggers', () => {
  it('a pending delay from a previous load does not fire after a reload with a new path', async () => {
    const env = fakeEnv();
    const manager = new OverlayManager({
      triggerEnv: env,
      store: freshStore(),
      now: () => new Date('2026-01-01'),
    });
    const firstProvider = providerOf([
      config({ id: 'stale', trigger: { type: 'delay', value: 1000 } }),
    ]);
    const secondProvider = providerOf([]);

    await manager.load(firstProvider, { path: '/pricing' });
    await manager.load(secondProvider, { path: '/blog' }); // disposes the pending timer from the first load

    env.fireTimeouts(); // if the stale disposer leaked, this would still show 'stale'

    expect(manager.getState().active['top-banner']).toBeUndefined();
  });
});

describe('OverlayManager idempotency', () => {
  it('show/dismiss are idempotent per id; a late toast timer after dismiss is a no-op', async () => {
    const env = fakeEnv();
    const manager = new OverlayManager({
      triggerEnv: env,
      store: freshStore(),
      now: () => new Date('2026-01-01'),
    });
    const provider = providerOf([config({ id: 't', type: 'toast', trigger: { type: 'manual' } })]);

    await manager.load(provider, { path: '/' });
    manager.show('t');
    manager.show('t'); // second show is a no-op
    expect(manager.getState().toasts).toHaveLength(1);

    manager.dismiss('t');
    manager.dismiss('t'); // second dismiss is a no-op
    expect(manager.getState().toasts).toHaveLength(0);
  });
});

describe('OverlayManager tracking', () => {
  it('calls store.record + trackView once on show, trackInteraction on dismiss, with pathname only', async () => {
    const env = fakeEnv();
    const store = freshStore();
    const recordSpy = vi.spyOn(store, 'record');
    const onView = vi.fn();
    const onInteraction = vi.fn();
    const manager = new OverlayManager({
      triggerEnv: env,
      store,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    const provider = providerOf([config({ id: 'a', trigger: { type: 'delay', value: 0 } })], {
      trackView: onView,
      trackInteraction: onInteraction,
    });

    await manager.load(provider, { path: '/blog?utm_source=x#top' });
    env.fireTimeouts();

    expect(recordSpy).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledWith({
      modalId: 'a',
      path: '/blog',
      at: '2026-01-01T00:00:00.000Z',
    });

    manager.dismiss('a', 'close-button');
    expect(onInteraction).toHaveBeenCalledWith({
      modalId: 'a',
      action: 'close-button',
      path: '/blog',
      at: '2026-01-01T00:00:00.000Z',
    });
  });
});

describe('OverlayManager reload consistency', () => {
  it('regression: dismiss() still removes a still-visible overlay after a reload drops it from pending', async () => {
    const env = fakeEnv();
    const manager = new OverlayManager({
      triggerEnv: env,
      store: freshStore(),
      now: () => new Date('2026-01-01'),
    });
    const firstProvider = providerOf([
      config({ id: 'a', type: 'top-banner', trigger: { type: 'manual' } }),
    ]);
    const secondProvider = providerOf([]); // 'a' is no longer eligible on the next load

    await manager.load(firstProvider, { path: '/' });
    manager.show('a');
    expect(manager.getState().active['top-banner']?.id).toBe('a');

    await manager.load(secondProvider, { path: '/' }); // clears `pending`; 'a' stays in state.active
    expect(manager.getState().active['top-banner']?.id).toBe('a'); // still visible, unaffected by reload

    manager.dismiss('a');
    expect(manager.getState().active['top-banner']).toBeUndefined();
  });

  it("regression: an always-frequency toast whose trigger refires after a reload doesn't duplicate", async () => {
    const env = fakeEnv();
    const manager = new OverlayManager({
      triggerEnv: env,
      store: freshStore(),
      now: () => new Date('2026-01-01'),
    });
    const provider = providerOf([
      config({
        id: 't',
        type: 'toast',
        frequency: 'always',
        trigger: { type: 'delay', value: 0 },
      }),
    ]);

    await manager.load(provider, { path: '/' });
    env.fireTimeouts(); // shows the toast

    await manager.load(provider, { path: '/' }); // still eligible ('always'); reschedules the trigger
    env.fireTimeouts(); // the rescheduled trigger refires while the toast is still on screen

    expect(manager.getState().toasts.filter((toast) => toast.id === 't')).toHaveLength(1);
  });
});

describe('OverlayManager `now` resolution', () => {
  it('resolves now once per load and threads it to eligibility (respects date window)', async () => {
    const env = fakeEnv();
    let calls = 0;
    const manager = new OverlayManager({
      triggerEnv: env,
      store: freshStore(),
      now: () => {
        calls++;
        return new Date('2026-06-01T00:00:00.000Z');
      },
    });
    const provider = providerOf([
      config({
        id: 'out-of-window',
        startDate: '2027-01-01T00:00:00.000Z',
        trigger: { type: 'delay', value: 0 },
      }),
    ]);

    await manager.load(provider, { path: '/' });
    env.fireTimeouts();

    expect(manager.getState().active['top-banner']).toBeUndefined();
    expect(calls).toBe(1); // load() resolves now() exactly once
  });
});
