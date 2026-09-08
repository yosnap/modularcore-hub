import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import RegisterForm from '../../../ui/svelte/RegisterForm.svelte';
import { createAuthKit } from '../../../adapters/svelte/create-auth-kit.svelte.js';

describe('RegisterForm.svelte (headless)', () => {
  it('submits email + password only when every optional field is disabled', async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    const authKit = createAuthKit({ onLogin: vi.fn(), onRegister });
    render(RegisterForm, { authKit });

    await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'Aa1!aaaa' } });
    await fireEvent.input(screen.getByLabelText('Confirm password'), {
      target: { value: 'Aa1!aaaa' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(onRegister).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'Aa1!aaaa',
        firstName: undefined,
        lastName: undefined,
        phone: undefined,
        profileType: undefined,
        termsAccepted: undefined,
        turnstileToken: null,
      }),
    );
  });

  it('blocks submit until a required, enabled optional field (legal consent) is filled', async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    const authKit = createAuthKit({ onLogin: vi.fn(), onRegister });
    render(RegisterForm, {
      authKit,
      fieldConfig: { legalConsent: { enabled: true, text: 'I accept the' } },
    });

    await fireEvent.input(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'Aa1!aaaa' } });
    await fireEvent.input(screen.getByLabelText('Confirm password'), {
      target: { value: 'Aa1!aaaa' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onRegister).not.toHaveBeenCalled();
    await screen.findByText('You must accept the terms');

    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(onRegister).toHaveBeenCalledWith(expect.objectContaining({ termsAccepted: true })),
    );
  });
});
