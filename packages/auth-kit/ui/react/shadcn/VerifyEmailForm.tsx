import * as LabelPrimitive from '@radix-ui/react-label';

import '../../shadcn-theme.css';
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

const inputClass =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';

/** Shadcn variant — self-contained, styled shadcn-like via Radix primitives. Same props/behavior as headless. */
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
            <p className="text-muted-foreground">Verificando tu email…</p>
          )}
          {verifyFlow.status === 'success' && (
            <p className="text-green-600">Tu email está verificado.</p>
          )}
          {verifyFlow.status === 'error' && verifyFlow.error && (
            <p className={errorClass}>{verifyFlow.error.message}</p>
          )}
        </div>
      )}

      <form onSubmit={handleResendSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-resend-email">
            Correo electrónico
          </LabelPrimitive.Root>
          <input
            id="auth-kit-resend-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className={inputClass}
          />
          {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
        </div>
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
          className="inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50"
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
