import { useState } from 'react';

import '../../vanilla-styles.css';
import { useChangePasswordFormState } from '../internal/change-password-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface ChangePasswordFormProps {
  authKit: UseAuthKitResult;
  passwordPolicy?: PasswordPolicy;
}

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
export function ChangePasswordForm({ authKit, passwordPolicy }: ChangePasswordFormProps): JSX.Element {
  const { currentPassword, setCurrentPassword, onCurrentPasswordBlur, newPassword, setNewPassword, onNewPasswordBlur, confirmPassword, setConfirmPassword, onConfirmPasswordBlur, fieldErrors, handleSubmit, flow } =
    useChangePasswordFormState({ authKit, passwordPolicy });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <form onSubmit={handleSubmit} noValidate className="auth-kit-form">
      <label className="auth-kit-field" htmlFor="auth-kit-change-current">
        Current password
        <span className="auth-kit-field__row">
          <input
            id="auth-kit-change-current"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            onBlur={onCurrentPasswordBlur}
            autoComplete="current-password"
            className="auth-kit-input"
          />
          <button type="button" onClick={() => setShowCurrent((value) => !value)} className="auth-kit-button auth-kit-button--ghost">
            {showCurrent ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>
      {fieldErrors.currentPassword && <p className="auth-kit-error">{fieldErrors.currentPassword}</p>}

      <label className="auth-kit-field" htmlFor="auth-kit-change-new">
        New password
        <span className="auth-kit-field__row">
          <input
            id="auth-kit-change-new"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            onBlur={onNewPasswordBlur}
            autoComplete="new-password"
            className="auth-kit-input"
          />
          <button type="button" onClick={() => setShowNew((value) => !value)} className="auth-kit-button auth-kit-button--ghost">
            {showNew ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>
      {fieldErrors.newPassword && <p className="auth-kit-error">{fieldErrors.newPassword}</p>}

      <label className="auth-kit-field" htmlFor="auth-kit-change-confirm">
        Confirm new password
        <input
          id="auth-kit-change-confirm"
          type={showNew ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={onConfirmPasswordBlur}
          autoComplete="new-password"
          className="auth-kit-input"
        />
      </label>
      {fieldErrors.confirmPassword && <p className="auth-kit-error">{fieldErrors.confirmPassword}</p>}

      <button type="submit" disabled={flow.status === 'submitting'} className="auth-kit-button auth-kit-button--primary">
        {flow.status === 'submitting' ? 'Updating…' : 'Update password'}
      </button>
      {flow.status === 'error' && flow.error && <p className="auth-kit-error">{flow.error.message}</p>}
      {flow.status === 'success' && <p className="auth-kit-success">Password updated.</p>}
    </form>
  );
}
