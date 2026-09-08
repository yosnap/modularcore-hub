import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';

import LoginForm from '../../../ui/vue/LoginForm.vue';
import { useAuthKit } from '../../../adapters/vue/use-auth-kit.js';

function renderWithAuthKit(onLogin: (payload: unknown) => Promise<unknown>) {
  const authKit = useAuthKit({ onLogin: onLogin as never, onRegister: vi.fn() });
  return render(LoginForm, { props: { authKit } });
}

describe('LoginForm.vue (headless)', () => {
  it('submits identifier + password and reaches success', async () => {
    const onLogin = vi.fn().mockResolvedValue({ id: '1' });
    renderWithAuthKit(onLogin);

    await fireEvent.update(screen.getByLabelText('Email or username'), 'a@b.com');
    await fireEvent.update(screen.getByLabelText('Password'), 'secret');
    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ identifier: 'a@b.com', password: 'secret', turnstileToken: null }));
    await screen.findByText('Signed in.');
  });

  it('blocks submit and shows a field error when required fields are empty', async () => {
    const onLogin = vi.fn();
    renderWithAuthKit(onLogin);

    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });
});
