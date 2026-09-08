// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuthKit } from '../../adapters/react/use-auth-kit.js';

describe('useAuthKit', () => {
  it('exposes idle state and forwards login to the underlying AuthKit instance', async () => {
    const onLogin = vi.fn().mockResolvedValue({ id: '1' });
    const { result } = renderHook(() => useAuthKit({ onLogin, onRegister: vi.fn() }));

    expect(result.current.state.login).toEqual({ status: 'idle', error: null });

    await act(async () => {
      await result.current.login({ identifier: 'a@b.com', password: 'x' });
    });

    expect(onLogin).toHaveBeenCalledWith({ identifier: 'a@b.com', password: 'x' });
    expect(result.current.state.login.status).toBe('success');
  });

  it('gives two independent hook instances isolated state', () => {
    const { result: first } = renderHook(() =>
      useAuthKit({ onLogin: vi.fn(), onRegister: vi.fn() }),
    );
    const { result: second } = renderHook(() =>
      useAuthKit({ onLogin: vi.fn(), onRegister: vi.fn() }),
    );

    expect(first.current.state).not.toBe(second.current.state);
  });
});
