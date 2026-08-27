import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaPicker } from '../../core/media-picker.js';

const unmountCallbacks: Array<() => void> = [];

vi.mock('vue', () => ({
  shallowRef: <T>(value: T) => ({ value }),
  onUnmounted: (callback: () => void) => unmountCallbacks.push(callback),
}));

import { useMediaPicker } from '../../adapters/vue/use-media-picker.js';

describe('useMediaPicker (Vue)', () => {
  beforeEach(() => {
    unmountCallbacks.length = 0;
  });

  it('mirrors core state in an isolated ref and forwards commands', () => {
    const first = useMediaPicker();
    const second = useMediaPicker();
    const file = new Blob(['image']) as File;

    first.loadLocalFile(file);

    expect(first.state.value.blob).toBe(file);
    expect(second.state.value.blob).toBeNull();
    expect(first.state).not.toBe(second.state);
  });

  it('unsubscribes when its component unmounts', () => {
    const unsubscribe = vi.fn();
    vi.spyOn(MediaPicker.prototype, 'subscribe').mockReturnValueOnce(unsubscribe);

    useMediaPicker();
    unmountCallbacks.forEach((callback) => callback());

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
