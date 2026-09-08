import { TurnstileWidget } from './TurnstileWidget.js';
import { useForgotPasswordFormState } from './internal/forgot-password-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../adapters/react/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

export interface ForgotPasswordFormProps {
  authKit: UseAuthKitResult;
  turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToLogin?: () => void;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
export function ForgotPasswordForm({
  authKit,
  turnstile,
  onNavigateToLogin,
}: ForgotPasswordFormProps): JSX.Element {
  const { email, setEmail, onEmailBlur, setTurnstileToken, fieldErrors, handleSubmit, flow } =
    useForgotPasswordFormState({ authKit });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="auth-kit-forgot-email">Correo electrónico</label>
        <input
          id="auth-kit-forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={onEmailBlur}
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
      <button type="submit" disabled={flow.status === 'submitting'}>
        {flow.status === 'submitting' ? 'Enviando…' : 'Enviar enlace'}
      </button>
      {flow.status === 'error' && flow.error && <p role="alert">{flow.error.message}</p>}
      {flow.status === 'success' && <p>Revisa tu correo para ver el enlace de restablecimiento.</p>}
      {onNavigateToLogin && (
        <button type="button" onClick={onNavigateToLogin}>
          Iniciar sesión
        </button>
      )}
    </form>
  );
}
