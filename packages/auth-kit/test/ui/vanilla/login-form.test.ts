import { fireEvent, screen, waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import { mountLoginForm } from '../../../ui/vanilla/LoginForm.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mountLoginForm', () => {
  it('submits identifier + password and reaches success', async () => {
    const onLogin = vi.fn().mockResolvedValue({ id: '1' });
    const authKit = createAuthKitStore({ onLogin, onRegister: vi.fn() });
    const container = document.body.appendChild(document.createElement('div'));
    const unmount = mountLoginForm(container, { authKit });

    await fireEvent.input(screen.getByLabelText('Email or username'), { target: { value: 'a@b.com' } });
    await fireEvent.input(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ identifier: 'a@b.com', password: 'secret', turnstileToken: null }));
    await screen.findByText('Signed in.');

    unmount();
    expect(container.children.length).toBe(0);
  });

  it('blocks submit and shows a field error when required fields are empty', () => {
    const onLogin = vi.fn();
    const authKit = createAuthKitStore({ onLogin, onRegister: vi.fn() });
    const container = document.body.appendChild(document.createElement('div'));
    mountLoginForm(container, { authKit });

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert', { hidden: false }).length).toBeGreaterThan(0);
  });

  it('a second mount into a fresh container does not throw after unmount', () => {
    const authKit = createAuthKitStore({ onLogin: vi.fn(), onRegister: vi.fn() });
    const container = document.body.appendChild(document.createElement('div'));
    const unmount = mountLoginForm(container, { authKit });
    unmount();

    expect(() => mountLoginForm(container, { authKit })).not.toThrow();
  });
});
