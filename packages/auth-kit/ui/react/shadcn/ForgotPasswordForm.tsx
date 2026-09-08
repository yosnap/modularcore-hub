import * as LabelPrimitive from '@radix-ui/react-label';

import '../../shadcn-theme.css';
import { TurnstileWidget } from '../TurnstileWidget.js';
import { useForgotPasswordFormState } from '../internal/forgot-password-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

export interface ForgotPasswordFormProps {
  authKit: UseAuthKitResult;
  turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToLogin?: () => void;
}

const inputClass =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';

/** Shadcn variant — self-contained, styled shadcn-like via Radix primitives. Same props/behavior as headless. */
export function ForgotPasswordForm({ authKit, turnstile, onNavigateToLogin }: ForgotPasswordFormProps): JSX.Element {
  const { email, setEmail, onEmailBlur, setTurnstileToken, fieldErrors, handleSubmit, flow } = useForgotPasswordFormState({ authKit });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-forgot-email">
          Correo electrónico
        </LabelPrimitive.Root>
        <input
          id="auth-kit-forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={onEmailBlur}
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
        disabled={flow.status === 'submitting'}
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {flow.status === 'submitting' ? 'Enviando…' : 'Enviar enlace'}
      </button>
      {flow.status === 'error' && flow.error && <p className={errorClass}>{flow.error.message}</p>}
      {flow.status === 'success' && <p className="text-sm text-green-600">Revisa tu correo para ver el enlace de restablecimiento.</p>}

      {onNavigateToLogin && (
        <p className="text-center text-sm text-muted-foreground">
          ¿Recordaste tu contraseña?{' '}
          <button type="button" onClick={onNavigateToLogin} className="font-medium text-primary hover:underline">
            Iniciar sesión
          </button>
        </p>
      )}
    </form>
  );
}
