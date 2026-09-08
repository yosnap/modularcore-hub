import { useState } from 'react';

import { useChangePasswordFormState } from './internal/change-password-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../adapters/react/use-auth-kit.js';
import type { PasswordPolicy } from '../../core/validation.js';

export interface ChangePasswordFormProps {
  authKit: UseAuthKitResult;
  passwordPolicy?: PasswordPolicy;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
export function ChangePasswordForm({ authKit, passwordPolicy }: ChangePasswordFormProps): JSX.Element {
  const { currentPassword, setCurrentPassword, onCurrentPasswordBlur, newPassword, setNewPassword, onNewPasswordBlur, confirmPassword, setConfirmPassword, onConfirmPasswordBlur, fieldErrors, handleSubmit, flow } =
    useChangePasswordFormState({ authKit, passwordPolicy });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="auth-kit-change-current">Current password</label>
        <input
          id="auth-kit-change-current"
          type={showCurrent ? 'text' : 'password'}
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
            onBlur={onCurrentPasswordBlur}
          autoComplete="current-password"
        />
        <button type="button" onClick={() => setShowCurrent((value) => !value)}>
          {showCurrent ? 'Hide' : 'Show'}
        </button>
        {fieldErrors.currentPassword && <p role="alert">{fieldErrors.currentPassword}</p>}
      </div>
      <div>
        <label htmlFor="auth-kit-change-new">New password</label>
        <input
          id="auth-kit-change-new"
          type={showNew ? 'text' : 'password'}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
            onBlur={onNewPasswordBlur}
          autoComplete="new-password"
        />
        <button type="button" onClick={() => setShowNew((value) => !value)}>
          {showNew ? 'Hide' : 'Show'}
        </button>
        {fieldErrors.newPassword && <p role="alert">{fieldErrors.newPassword}</p>}
      </div>
      <div>
        <label htmlFor="auth-kit-change-confirm">Confirm new password</label>
        <input
          id="auth-kit-change-confirm"
          type={showNew ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={onConfirmPasswordBlur}
          autoComplete="new-password"
        />
        {fieldErrors.confirmPassword && <p role="alert">{fieldErrors.confirmPassword}</p>}
      </div>
      <button type="submit" disabled={flow.status === 'submitting'}>
        {flow.status === 'submitting' ? 'Updating…' : 'Update password'}
      </button>
      {flow.status === 'error' && flow.error && <p role="alert">{flow.error.message}</p>}
      {flow.status === 'success' && <p>Password updated.</p>}
    </form>
  );
}
