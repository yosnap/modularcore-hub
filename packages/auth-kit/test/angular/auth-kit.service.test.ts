import { describe, expect, it, vi } from 'vitest';

import { createAuthKitService } from '../../adapters/angular/auth-kit.service.js';

import type { DestroyRef } from '@angular/core';

class TestDestroyRef implements DestroyRef {
  #callbacks = new Set<() => void>();
  #isDestroyed = false;

  get destroyed(): boolean {
    return this.#isDestroyed;
  }

  onDestroy(callback: () => void): () => void {
    this.#callbacks.add(callback);
    return () => this.#callbacks.delete(callback);
  }

  destroy(): void {
    this.#isDestroyed = true;
    for (const callback of this.#callbacks) callback();
  }
}

describe('createAuthKitService', () => {
  it('keeps state isolated for each standalone owner', async () => {
    const first = createAuthKitService(new TestDestroyRef(), {
      onLogin: vi.fn().mockResolvedValue({ id: '1' }),
      onRegister: vi.fn(),
    });
    const second = createAuthKitService(new TestDestroyRef(), {
      onLogin: vi.fn(),
      onRegister: vi.fn(),
    });

    await first.login({ identifier: 'a@b.com', password: 'x' });

    expect(first.state().login.status).toBe('success');
    expect(second.state().login.status).toBe('idle');
  });

  it('stops reflecting core state after its DestroyRef is destroyed', async () => {
    const destroyRef = new TestDestroyRef();
    const service = createAuthKitService(destroyRef, {
      onLogin: vi.fn().mockRejectedValue(new Error('nope')),
      onRegister: vi.fn(),
    });

    destroyRef.destroy();
    await expect(service.login({ identifier: 'a@b.com', password: 'x' })).rejects.toThrow('nope');

    // The core still transitions internally, but the signal must not have been updated after destroy.
    expect(service.state().login.status).toBe('idle');
  });
});
