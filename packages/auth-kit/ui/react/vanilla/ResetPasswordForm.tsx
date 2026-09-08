import { useState } from 'react';

import '../../vanilla-styles.css';
import { useResetPasswordFormState } from '../internal/reset-password-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface ResetPasswordFormProps {
  authKit: UseAuthKitResult;
  token: string;
  passwordPolicy?: PasswordPolicy;
}

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
export function ResetPasswordForm({ authKit, token, passwordPolicy }: ResetPasswordFormProps): JSX.Element {
  const { newPassword, setNewPassword, onNewPasswordBlur, confirmPassword, setConfirmPassword, onConfirmPasswordBlur, fieldErrors, handleSubmit, flow } =
    useResetPasswordFormState({ authKit, token, passwordPolicy });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit} noValidate className="auth-kit-form">
      <label className="auth-kit-field" htmlFor="auth-kit-reset-new">
        New password
        <span className="auth-kit-field__row">
          <input
            id="auth-kit-reset-new"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            onBlur={onNewPasswordBlur}
            autoComplete="new-password"
            className="auth-kit-input"
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="auth-kit-button auth-kit-button--ghost">
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>
      {fieldErrors.newPassword && <p className="auth-kit-error">{fieldErrors.newPassword}</p>}

      <label className="auth-kit-field" htmlFor="auth-kit-reset-confirm">
        Confirm new password
        <input
          id="auth-kit-reset-confirm"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={onConfirmPasswordBlur}
          autoComplete="new-password"
          className="auth-kit-input"
        />
      </label>
      {fieldErrors.confirmPassword && <p className="auth-kit-error">{fieldErrors.confirmPassword}</p>}

      <button type="submit" disabled={flow.status === 'submitting'} className="auth-kit-button auth-kit-button--primary">
        {flow.status === 'submitting' ? 'Resetting…' : 'Reset password'}
      </button>
      {flow.status === 'error' && flow.error && <p className="auth-kit-error">{flow.error.message}</p>}
      {flow.status === 'success' && <p className="auth-kit-success">Password reset.</p>}
    </form>
  );
}
