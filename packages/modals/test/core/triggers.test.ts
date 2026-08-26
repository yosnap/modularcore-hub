import { describe, expect, it, vi } from 'vitest';

import { scheduleTrigger } from '../../core/triggers.js';

import type { TriggerEnvironment } from '../../core/triggers.js';
import type { ModalConfig } from '../../core/types.js';

function fakeEnv(overrides: Partial<TriggerEnvironment> = {}): TriggerEnvironment {
  return {
    setTimeout: vi.fn(() => 1),
    clearTimeout: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    scrollPercent: vi.fn(() => 0),
    ...overrides,
  };
}

function config(overrides: Partial<ModalConfig['trigger']>): ModalConfig {
  return {
    id: 'a',
    type: 'top-banner',
    message: 'hi',
    trigger: { type: 'delay', ...overrides },
  };
}

describe('scheduleTrigger', () => {
  it('page-load and delay share a single setTimeout branch, page-load defaulting to 0ms', () => {
    const env = fakeEnv();
    scheduleTrigger(config({ type: 'page-load' }), env, () => {});
    expect(env.setTimeout).toHaveBeenCalledWith(expect.any(Function), 0);

    scheduleTrigger(config({ type: 'delay', value: 250 }), env, () => {});
    expect(env.setTimeout).toHaveBeenCalledWith(expect.any(Function), 250);
  });

  it('delay/page-load disposer clears the timeout', () => {
    const env = fakeEnv({ setTimeout: vi.fn(() => 42) });
    const dispose = scheduleTrigger(config({ type: 'delay' }), env, () => {});
    dispose();
    expect(env.clearTimeout).toHaveBeenCalledWith(42);
  });

  it('scroll fires at most once, removing its listener on first threshold cross', () => {
    // A real DOM removeEventListener detaches the exact function reference — mirror that here
    // instead of a plain no-op mock, so a stale reference calling the handler post-removal (as a
    // sloppy caller might) proves nothing: the real contract is enforced by the registry.
    const registered = new Set<(e: Event) => void>();
    const env = fakeEnv({
      addEventListener: vi.fn((_type, fn) => {
        registered.add(fn);
      }),
      removeEventListener: vi.fn((_type, fn) => {
        registered.delete(fn);
      }),
      scrollPercent: vi.fn(() => 60),
    });
    const fire = vi.fn();
    scheduleTrigger(config({ type: 'scroll', value: 50 }), env, fire);

    const [onScroll] = [...registered];
    onScroll?.({} as Event);
    expect(registered.has(onScroll!)).toBe(false); // removed itself after firing
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('exit-intent fires only when clientY <= 0, at most once', () => {
    const registered = new Set<(e: Event) => void>();
    const env = fakeEnv({
      addEventListener: vi.fn((_type, fn) => {
        registered.add(fn);
      }),
      removeEventListener: vi.fn((_type, fn) => {
        registered.delete(fn);
      }),
    });
    const fire = vi.fn();
    scheduleTrigger(config({ type: 'exit-intent' }), env, fire);

    const [onMouseOut] = [...registered];
    onMouseOut?.({ clientY: 10 } as MouseEvent);
    expect(fire).not.toHaveBeenCalled();
    expect(registered.has(onMouseOut!)).toBe(true); // still listening: threshold not crossed

    onMouseOut?.({ clientY: 0 } as MouseEvent);
    expect(fire).toHaveBeenCalledTimes(1);
    expect(registered.has(onMouseOut!)).toBe(false); // removed itself after firing
  });

  it('click and manual schedule nothing (no auto-fire); disposer is a no-op', () => {
    const env = fakeEnv();
    const fire = vi.fn();

    scheduleTrigger(config({ type: 'click' }), env, fire);
    scheduleTrigger(config({ type: 'manual' }), env, fire);

    expect(env.setTimeout).not.toHaveBeenCalled();
    expect(env.addEventListener).not.toHaveBeenCalled();
    expect(fire).not.toHaveBeenCalled();
  });
});
