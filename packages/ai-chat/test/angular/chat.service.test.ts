import { describe, expect, it, vi } from 'vitest';

import { createChatService } from '../../adapters/angular/chat.service.js';

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

const config = {
  apiKey: 'test-key',
  models: ['test-model'],
  fetchImpl: vi.fn(async () => {
    throw new Error('network failure');
  }),
};

describe('createChatService', () => {
  it('reflects core errors through its readonly signal', async () => {
    const service = createChatService(new TestDestroyRef(), config);

    await service.send('hello');

    expect(service.state().status).toBe('error');
    expect(service.state().error?.message).toContain('network failure');
  });

  it('aborts its stream and stops reflecting state after destruction', async () => {
    let aborted = false;
    const destroyRef = new TestDestroyRef();
    const ownedService = createChatService(destroyRef, {
      apiKey: 'test-key',
      models: ['test-model'],
      fetchImpl: vi.fn((_, init) => {
        const signal = init?.signal as AbortSignal;
        return new Promise<Response>((_, reject) => {
          signal.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      }),
    });

    const sending = ownedService.send('hello');
    await vi.waitFor(() => expect(ownedService.state().status).toBe('streaming'));
    await vi.waitFor(() => expect(ownedService.state().messages).toHaveLength(2));
    expect(ownedService.state().status).toBe('streaming');
    destroyRef.destroy();
    await sending;

    expect(aborted).toBe(true);
    expect(ownedService.state().status).toBe('streaming');
  });
});
