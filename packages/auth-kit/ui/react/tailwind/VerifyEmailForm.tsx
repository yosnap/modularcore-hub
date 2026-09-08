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

const inputClass = 'rounded-md border border-zinc-300 px-2 py-1.5 text-sm';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700';
const errorClass = 'text-sm text-red-600';

/** Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. */
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
    <div className="flex flex-col gap-4">
      {token && (
        <div role="status" className="text-sm">
          {verifyFlow.status === 'submitting' && (
            <p className="text-zinc-700">Verificando tu email…</p>
          )}
          {verifyFlow.status === 'success' && (
            <p className="text-green-600">Tu email está verificado.</p>
          )}
          {verifyFlow.status === 'error' && verifyFlow.error && (
            <p className={errorClass}>{verifyFlow.error.message}</p>
          )}
        </div>
      )}

      <form onSubmit={handleResendSubmit} noValidate className="flex flex-col gap-3">
        <label className={labelClass} htmlFor="auth-kit-resend-email">
          Correo electrónico
          <input
            id="auth-kit-resend-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className={inputClass}
          />
        </label>
        {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
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
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
        >
          {resendFlow.status === 'submitting' ? 'Enviando…' : 'Reenviar email de verificación'}
        </button>
        {resendFlow.status === 'error' && resendFlow.error && (
          <p className={errorClass}>{resendFlow.error.message}</p>
        )}
        {resendFlow.status === 'success' && (
          <p className="text-sm text-green-600">Email de verificación enviado.</p>
        )}
      </form>
    </div>
  );
}
