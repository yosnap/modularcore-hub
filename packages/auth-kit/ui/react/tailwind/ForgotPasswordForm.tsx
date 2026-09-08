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
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const errorClass = 'text-sm text-red-600 dark:text-red-400';

/** Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. */
export function ForgotPasswordForm({
  authKit,
  turnstile,
  onNavigateToLogin,
}: ForgotPasswordFormProps): JSX.Element {
  const { email, setEmail, onEmailBlur, setTurnstileToken, fieldErrors, handleSubmit, flow } =
    useForgotPasswordFormState({ authKit });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <label className={labelClass} htmlFor="auth-kit-forgot-email">
        Correo electrónico
        <input
          id="auth-kit-forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={onEmailBlur}
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
        disabled={flow.status === 'submitting'}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {flow.status === 'submitting' ? 'Enviando…' : 'Enviar enlace'}
      </button>
      {flow.status === 'error' && flow.error && <p className={errorClass}>{flow.error.message}</p>}
      {flow.status === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Revisa tu correo para ver el enlace de restablecimiento.
        </p>
      )}
      {onNavigateToLogin && (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Recordaste tu contraseña?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
          >
            Iniciar sesión
          </button>
        </p>
      )}
    </form>
  );
}
