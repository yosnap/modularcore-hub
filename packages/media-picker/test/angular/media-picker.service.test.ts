import { describe, expect, it } from 'vitest';

import { createMediaPickerService } from '../../adapters/angular/media-picker.service.js';

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

describe('createMediaPickerService', () => {
  it('keeps state isolated for each standalone owner', () => {
    const first = createMediaPickerService(new TestDestroyRef());
    const second = createMediaPickerService(new TestDestroyRef());

    first.loadLocalFile(new File(['first'], 'first.png', { type: 'image/png' }));

    expect(first.state().blob).not.toBeNull();
    expect(second.state().blob).toBeNull();
  });

  it('stops reflecting core state after its DestroyRef is destroyed', () => {
    const destroyRef = new TestDestroyRef();
    const service = createMediaPickerService(destroyRef);

    service.loadLocalFile(new File(['image'], 'image.png', { type: 'image/png' }));
    const beforeDestroy = service.state();
    destroyRef.destroy();
    service.reset();

    expect(service.state()).toBe(beforeDestroy);
  });
});
