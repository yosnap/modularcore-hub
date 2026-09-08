import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuthKit } from '../../../adapters/react/use-auth-kit.js';
import { LoginForm } from '../../../ui/react/LoginForm.js';

function Harness({ onLogin }: { onLogin: (payload: unknown) => Promise<unknown> }) {
  const authKit = useAuthKit({ onLogin: onLogin as never, onRegister: vi.fn() });
  return <LoginForm authKit={authKit} />;
}

describe('LoginForm (headless)', () => {
  it('submits identifier + password and reaches success', async () => {
    const onLogin = vi.fn().mockResolvedValue({ id: '1' });
    render(<Harness onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith({ identifier: 'a@b.com', password: 'secret', turnstileToken: null }));
    await screen.findByText('Signed in.');
  });

  it('blocks submit and shows a field error when required fields are empty', () => {
    const onLogin = vi.fn();
    render(<Harness onLogin={onLogin} />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onLogin).not.toHaveBeenCalled();
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  });

  it('shows the flow error when the hook rejects', async () => {
    const onLogin = vi.fn().mockRejectedValue(new Error('bad credentials'));
    render(<Harness onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await screen.findByText('bad credentials');
  });
});
