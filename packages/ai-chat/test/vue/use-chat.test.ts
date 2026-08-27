import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Chat } from '../../core/chat.js';

const unmountCallbacks: Array<() => void> = [];

vi.mock('vue', () => ({
  shallowRef: <T>(value: T) => ({ value }),
  onUnmounted: (callback: () => void) => unmountCallbacks.push(callback),
}));

import { useChat } from '../../adapters/vue/use-chat.js';

const config = {
  baseURL: 'https://chat.example.test/v1',
  apiKey: 'test-key',
  models: ['test-model'],
};

describe('useChat (Vue)', () => {
  beforeEach(() => {
    unmountCallbacks.length = 0;
  });

  it('creates isolated state refs for separate composable instances', () => {
    const first = useChat(config);
    const second = useChat(config);

    first.reset();

    expect(first.state).not.toBe(second.state);
    expect(first.state.value).not.toBe(second.state.value);
    expect(second.state.value.status).toBe('idle');
  });

  it('unsubscribes and aborts an active chat when its component unmounts', () => {
    const unsubscribe = vi.fn();
    const stop = vi.spyOn(Chat.prototype, 'stop');
    vi.spyOn(Chat.prototype, 'subscribe').mockReturnValueOnce(unsubscribe);

    useChat(config);
    unmountCallbacks.forEach((callback) => callback());

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledOnce();
  });
});
