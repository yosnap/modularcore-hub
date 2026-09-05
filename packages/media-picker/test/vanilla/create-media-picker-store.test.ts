import { describe, expect, it, vi } from 'vitest';

import { createMediaPickerStore } from '../../adapters/vanilla/create-media-picker-store.js';
import { MediaPicker } from '../../core/media-picker.js';

describe('createMediaPickerStore (sin framework)', () => {
  it('cada store posee su propia instancia del núcleo', () => {
    const first = createMediaPickerStore();
    const second = createMediaPickerStore();
    const file = new Blob(['image']) as File;

    first.loadLocalFile(file);

    expect(first.getState().blob).toBe(file);
    expect(second.getState().blob).toBeNull();
  });

  it('entrega el estado actual al suscribirse, sin esperar al primer cambio', () => {
    const store = createMediaPickerStore();
    const listener = vi.fn();

    store.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(store.getState());
  });

  it('propaga los cambios del núcleo a los oyentes', () => {
    const store = createMediaPickerStore();
    const listener = vi.fn();
    store.subscribe(listener);
    listener.mockClear();

    store.loadLocalFile(new Blob(['image']) as File);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]?.blob).not.toBeNull();
  });

  it('la función devuelta por subscribe da de baja solo a ese oyente', () => {
    const store = createMediaPickerStore();
    const kept = vi.fn();
    const dropped = vi.fn();
    store.subscribe(kept);
    const unsubscribe = store.subscribe(dropped);
    kept.mockClear();
    dropped.mockClear();

    unsubscribe();
    store.loadLocalFile(new Blob(['image']) as File);

    expect(dropped).not.toHaveBeenCalled();
    expect(kept).toHaveBeenCalledTimes(1);
  });

  it('destroy da de baja a todos los oyentes: sin ciclo de vida que lo haga por nosotros', () => {
    const store = createMediaPickerStore();
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe(first);
    store.subscribe(second);
    first.mockClear();
    second.mockClear();

    store.destroy();
    store.loadLocalFile(new Blob(['image']) as File);

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it('destroy es idempotente y no afecta a otros stores', () => {
    const store = createMediaPickerStore();
    const other = createMediaPickerStore();
    const listener = vi.fn();
    other.subscribe(listener);
    listener.mockClear();

    store.destroy();
    store.destroy();
    other.loadLocalFile(new Blob(['image']) as File);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reenvía los comandos al núcleo', async () => {
    const store = createMediaPickerStore();
    const reset = vi.spyOn(MediaPicker.prototype, 'reset');
    const clearSelection = vi.spyOn(MediaPicker.prototype, 'clearSelection');

    store.reset();
    store.clearSelection();

    expect(reset).toHaveBeenCalledTimes(1);
    expect(clearSelection).toHaveBeenCalledTimes(1);

    reset.mockRestore();
    clearSelection.mockRestore();
  });

  it('no toca APIs del navegador al construirse, así que es seguro en servidor', () => {
    expect(() => createMediaPickerStore()).not.toThrow();
  });
});
