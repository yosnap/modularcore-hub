import { TurnstileWidget } from './TurnstileWidget.js';
import { useVerifyEmailFormState } from './internal/verify-email-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../adapters/react/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

export interface VerifyEmailFormProps {
  authKit: UseAuthKitResult;
  /** Verification token from the URL — when present, verification runs automatically on mount. */
  token?: string;
  email?: string;
  turnstile?: TurnstileFieldConfig;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
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
        <div role="status">
          {verifyFlow.status === 'submitting' && <p>Verificando tu email…</p>}
          {verifyFlow.status === 'success' && <p>Tu email está verificado.</p>}
          {verifyFlow.status === 'error' && verifyFlow.error && (
            <p role="alert">{verifyFlow.error.message}</p>
          )}
        </div>
      )}

      <form onSubmit={handleResendSubmit} noValidate>
        <div>
          <label htmlFor="auth-kit-resend-email">Correo electrónico</label>
          <input
            id="auth-kit-resend-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
          {fieldErrors.email && <p role="alert">{fieldErrors.email}</p>}
        </div>
        {turnstile?.enabled && (
          <TurnstileWidget
            siteKey={turnstile.siteKey}
            theme={turnstile.theme}
            mode={turnstile.mode}
            onToken={setTurnstileToken}
          />
        )}
        <button type="submit" disabled={resendFlow.status === 'submitting'}>
          {resendFlow.status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación'}
        </button>
        {resendFlow.status === 'error' && resendFlow.error && (
          <p role="alert">{resendFlow.error.message}</p>
        )}
        {resendFlow.status === 'success' && <p>Email de verificación enviado.</p>}
      </form>
    </div>
  );
}
