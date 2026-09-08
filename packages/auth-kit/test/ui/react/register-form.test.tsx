import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuthKit } from '../../../adapters/react/use-auth-kit.js';
import { RegisterForm } from '../../../ui/react/RegisterForm.js';

import type { AuthKitFieldConfig } from '../../../core/field-config.js';

function Harness({
  onRegister,
  fieldConfig,
}: {
  onRegister: (payload: unknown) => Promise<unknown>;
  fieldConfig?: AuthKitFieldConfig;
}) {
  const authKit = useAuthKit({ onLogin: vi.fn(), onRegister: onRegister as never });
  return <RegisterForm authKit={authKit} fieldConfig={fieldConfig} />;
}

function fillPasswords(value = 'Aa1!aaaa') {
  fireEvent.change(screen.getByLabelText('Password'), { target: { value } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value } });
}

describe('RegisterForm (headless)', () => {
  it('submits email + password only when every optional field is disabled', async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    render(<Harness onRegister={onRegister} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fillPasswords();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

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
    render(
      <Harness
        onRegister={onRegister}
        fieldConfig={{ legalConsent: { enabled: true, text: 'I accept the' } }}
      />,
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fillPasswords();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(onRegister).not.toHaveBeenCalled();
    expect(await screen.findByText('You must accept the terms')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(onRegister).toHaveBeenCalledWith(expect.objectContaining({ termsAccepted: true })),
    );
  });
});
