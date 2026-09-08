import { describe, expect, it, vi } from 'vitest';

import { AuthKit } from '../core/auth-kit.js';

describe('AuthKit', () => {
  it('starts every flow idle', () => {
    const kit = new AuthKit({ onLogin: vi.fn(), onRegister: vi.fn() });
    const state = kit.getState();
    expect(state.login).toEqual({ status: 'idle', error: null });
    expect(state.register).toEqual({ status: 'idle', error: null });
  });

  it('transitions login through submitting -> success and notifies subscribers', async () => {
    const onLogin = vi.fn().mockResolvedValue({ userId: '1' });
    const kit = new AuthKit({ onLogin, onRegister: vi.fn() });
    const seen: string[] = [];
    kit.subscribe((state) => seen.push(state.login.status));

    const result = await kit.login({ identifier: 'a@b.com', password: 'x' });

    expect(result).toEqual({ userId: '1' });
    expect(onLogin).toHaveBeenCalledWith({ identifier: 'a@b.com', password: 'x' });
    expect(seen).toEqual(['submitting', 'success']);
    expect(kit.getState().login).toEqual({ status: 'success', error: null });
  });

  it('captures a hook rejection as flow error', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('bad credentials'));
    const kit = new AuthKit({ onLogin, onRegister: vi.fn() });

    await expect(kit.login({ identifier: 'a@b.com', password: 'x' })).rejects.toThrow(
      'bad credentials',
    );
    expect(kit.getState().login.status).toBe('error');
    expect(kit.getState().login.error?.message).toBe('bad credentials');
  });

  it('rejects with a clear error when an optional hook is not configured', async () => {
    const kit = new AuthKit({ onLogin: vi.fn(), onRegister: vi.fn() });

    await expect(kit.changePassword({ currentPassword: 'a', newPassword: 'b' })).rejects.toThrow(
      /onChangePassword \(optional\) hook was configured/,
    );
    expect(kit.getState().changePassword.status).toBe('error');
  });

  it('drops a superseded call instead of overwriting the newer one (last-one-wins)', async () => {
    let resolveFirst!: (value: { id: string }) => void;
    const onLogin = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ id: 'second' });
    const kit = new AuthKit({ onLogin, onRegister: vi.fn() });

    const first = kit.login({ identifier: 'a', password: 'x' });
    const second = kit.login({ identifier: 'a', password: 'x' });
    resolveFirst({ id: 'first' });

    await expect(second).resolves.toEqual({ id: 'second' });
    await first; // resolves too (the promise itself isn't cancelled), but state must reflect the newer call
    expect(kit.getState().login.status).toBe('success');
  });

  it('reset() clears a single flow back to idle without touching others', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('nope'));
    const kit = new AuthKit({ onLogin, onRegister: vi.fn() });
    await expect(kit.login({ identifier: 'a', password: 'x' })).rejects.toThrow();

    kit.reset('login');

    expect(kit.getState().login).toEqual({ status: 'idle', error: null });
    expect(kit.getState().register).toEqual({ status: 'idle', error: null });
  });
});
