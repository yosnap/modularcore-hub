import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import RegisterForm from '../../../ui/vue/RegisterForm.vue';
import { useAuthKit } from '../../../adapters/vue/use-auth-kit.js';

import type { AuthKitFieldConfig } from '../../../core/field-config.js';

function renderWithAuthKit(
  onRegister: (payload: unknown) => Promise<unknown>,
  fieldConfig?: AuthKitFieldConfig,
) {
  const authKit = useAuthKit({ onLogin: vi.fn(), onRegister: onRegister as never });
  return render(RegisterForm, { props: { authKit, fieldConfig } });
}

describe('RegisterForm.vue (headless)', () => {
  it('submits email + password only when every optional field is disabled', async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    renderWithAuthKit(onRegister);

    await fireEvent.update(screen.getByLabelText('Email'), 'a@b.com');
    await fireEvent.update(screen.getByLabelText('Password'), 'Aa1!aaaa');
    await fireEvent.update(screen.getByLabelText('Confirm password'), 'Aa1!aaaa');
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
    renderWithAuthKit(onRegister, { legalConsent: { enabled: true, text: 'I accept the' } });

    await fireEvent.update(screen.getByLabelText('Email'), 'a@b.com');
    await fireEvent.update(screen.getByLabelText('Password'), 'Aa1!aaaa');
    await fireEvent.update(screen.getByLabelText('Confirm password'), 'Aa1!aaaa');
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
