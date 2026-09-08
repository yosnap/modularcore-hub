import { useState } from 'react';

import { useResetPasswordFormState } from './internal/reset-password-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../adapters/react/use-auth-kit.js';
import type { PasswordPolicy } from '../../core/validation.js';

export interface ResetPasswordFormProps {
  authKit: UseAuthKitResult;
  /** Reset token from the URL — the caller extracts it from the query string / route param. */
  token: string;
  passwordPolicy?: PasswordPolicy;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
export function ResetPasswordForm({
  authKit,
  token,
  passwordPolicy,
}: ResetPasswordFormProps): JSX.Element {
  const {
    newPassword,
    setNewPassword,
    onNewPasswordBlur,
    confirmPassword,
    setConfirmPassword,
    onConfirmPasswordBlur,
    fieldErrors,
    handleSubmit,
    flow,
  } = useResetPasswordFormState({ authKit, token, passwordPolicy });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="auth-kit-reset-new">Contraseña nueva</label>
        <input
          id="auth-kit-reset-new"
          type={showPassword ? 'text' : 'password'}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          onBlur={onNewPasswordBlur}
          autoComplete="new-password"
        />
        <button type="button" onClick={() => setShowPassword((value) => !value)}>
          {showPassword ? 'Ocultar' : 'Mostrar'}
        </button>
        {fieldErrors.newPassword && <p role="alert">{fieldErrors.newPassword}</p>}
      </div>
      <div>
        <label htmlFor="auth-kit-reset-confirm">Confirmar contraseña nueva</label>
        <input
          id="auth-kit-reset-confirm"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={onConfirmPasswordBlur}
          autoComplete="new-password"
        />
        {fieldErrors.confirmPassword && <p role="alert">{fieldErrors.confirmPassword}</p>}
      </div>
      <button type="submit" disabled={flow.status === 'submitting'}>
        {flow.status === 'submitting' ? 'Restableciendo…' : 'Restablecer contraseña'}
      </button>
      {flow.status === 'error' && flow.error && <p role="alert">{flow.error.message}</p>}
      {flow.status === 'success' && <p>Contraseña restablecida.</p>}
    </form>
  );
}
