import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import { mountLoginForm } from '../../../ui/vanilla/tailwind/LoginForm.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mountLoginForm (tailwind)', () => {
  it('submits identifier + password and reaches success', async () => {
    const onLogin = vi.fn().mockResolvedValue({ id: '1' });
    const authKit = createAuthKitStore({ onLogin, onRegister: vi.fn() });
    const container = document.body.appendChild(document.createElement('div'));
    mountLoginForm(container, { authKit });

    await fireEvent.input(screen.getByLabelText('Email or username'), { target: { value: 'a@b.com' } });
    await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ identifier: 'a@b.com', password: 'secret', turnstileToken: null }));
    await screen.findByText('Signed in.');
  });
});
