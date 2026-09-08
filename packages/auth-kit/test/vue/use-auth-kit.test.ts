import { beforeEach, describe, expect, it, vi } from 'vitest';

const unmountCallbacks: Array<() => void> = [];

vi.mock('vue', () => ({
  shallowRef: <T>(value: T) => ({ value }),
  onUnmounted: (callback: () => void) => unmountCallbacks.push(callback),
}));

import { useAuthKit } from '../../adapters/vue/use-auth-kit.js';

describe('useAuthKit (Vue)', () => {
  beforeEach(() => {
    unmountCallbacks.length = 0;
  });

  it('mirrors core state in an isolated ref and forwards commands', async () => {
    const onLogin = vi.fn().mockResolvedValue({ id: '1' });
    const first = useAuthKit({ onLogin, onRegister: vi.fn() });
    const second = useAuthKit({ onLogin: vi.fn(), onRegister: vi.fn() });

    await first.login({ identifier: 'a@b.com', password: 'x' });

    expect(first.state.value.login.status).toBe('success');
    expect(second.state.value.login.status).toBe('idle');
    expect(first.state).not.toBe(second.state);
  });

  it('registers an unmount callback that unsubscribes from the core instance', () => {
    useAuthKit({ onLogin: vi.fn(), onRegister: vi.fn() });
    expect(unmountCallbacks).toHaveLength(1);
    expect(() => unmountCallbacks[0]?.()).not.toThrow();
  });
});
