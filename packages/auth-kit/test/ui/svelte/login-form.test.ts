import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import LoginForm from '../../../ui/svelte/LoginForm.svelte';
import { createAuthKit } from '../../../adapters/svelte/create-auth-kit.svelte.js';

describe('LoginForm.svelte (headless)', () => {
  it('submits identifier + password and reaches success', async () => {
    const onLogin = vi.fn().mockResolvedValue({ id: '1' });
    const authKit = createAuthKit({ onLogin, onRegister: vi.fn() });
    render(LoginForm, { authKit });

    await fireEvent.input(screen.getByLabelText('Email or username'), {
      target: { value: 'a@b.com' },
    });
    await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(onLogin).toHaveBeenCalledWith({
        identifier: 'a@b.com',
        password: 'secret',
        turnstileToken: null,
      }),
    );
    await screen.findByText('Signed in.');
  });

  it('blocks submit and shows a field error when required fields are empty', async () => {
    const onLogin = vi.fn();
    const authKit = createAuthKit({ onLogin, onRegister: vi.fn() });
    render(LoginForm, { authKit });

    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });
});
