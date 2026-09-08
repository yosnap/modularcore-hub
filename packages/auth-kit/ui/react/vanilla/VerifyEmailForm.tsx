import '../../vanilla-styles.css';
import { TurnstileWidget } from '../TurnstileWidget.js';
import { useVerifyEmailFormState } from '../internal/verify-email-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

export interface VerifyEmailFormProps {
  authKit: UseAuthKitResult;
  token?: string;
  email?: string;
  turnstile?: TurnstileFieldConfig;
}

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
export function VerifyEmailForm({
  authKit,
  token,
  email: initialEmail,
  turnstile,
}: VerifyEmailFormProps): JSX.Element {
  const {
    email,
    setEmail,
    setTurnstileToken,
    fieldErrors,
    handleResendSubmit,
    verifyFlow,
    resendFlow,
  } = useVerifyEmailFormState({ authKit, token, email: initialEmail });

  return (
    <div>
      {token && (
        <div role="status" className="auth-kit-status">
          {verifyFlow.status === 'submitting' && <p>Verificando tu email…</p>}
          {verifyFlow.status === 'success' && (
            <p className="auth-kit-success">Tu email está verificado.</p>
          )}
          {verifyFlow.status === 'error' && verifyFlow.error && (
            <p className="auth-kit-error">{verifyFlow.error.message}</p>
          )}
        </div>
      )}

      <form onSubmit={handleResendSubmit} noValidate className="auth-kit-form">
        <label className="auth-kit-field" htmlFor="auth-kit-resend-email">
          Correo electrónico
          <input
            id="auth-kit-resend-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className="auth-kit-input"
          />
        </label>
        {fieldErrors.email && <p className="auth-kit-error">{fieldErrors.email}</p>}
        {turnstile?.enabled && (
          <TurnstileWidget
            siteKey={turnstile.siteKey}
            theme={turnstile.theme}
            mode={turnstile.mode}
            onToken={setTurnstileToken}
          />
        )}
        <button
          type="submit"
          disabled={resendFlow.status === 'submitting'}
          className="auth-kit-button"
        >
          {resendFlow.status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación'}
        </button>
        {resendFlow.status === 'error' && resendFlow.error && (
          <p className="auth-kit-error">{resendFlow.error.message}</p>
        )}
        {resendFlow.status === 'success' && (
          <p className="auth-kit-success">Email de verificación enviado.</p>
        )}
      </form>
    </div>
  );
}
