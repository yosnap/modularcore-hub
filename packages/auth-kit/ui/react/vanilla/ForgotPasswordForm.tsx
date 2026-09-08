import '../../vanilla-styles.css';
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

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
export function ForgotPasswordForm({ authKit, turnstile, onNavigateToLogin }: ForgotPasswordFormProps): JSX.Element {
  const { email, setEmail, onEmailBlur, setTurnstileToken, fieldErrors, handleSubmit, flow } = useForgotPasswordFormState({ authKit });

  return (
    <form onSubmit={handleSubmit} noValidate className="auth-kit-form">
      <label className="auth-kit-field" htmlFor="auth-kit-forgot-email">
        Correo electrónico
        <input
          id="auth-kit-forgot-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={onEmailBlur}
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
      <button type="submit" disabled={flow.status === 'submitting'} className="auth-kit-button auth-kit-button--primary">
        {flow.status === 'submitting' ? 'Enviando…' : 'Enviar enlace'}
      </button>
      {flow.status === 'error' && flow.error && <p className="auth-kit-error">{flow.error.message}</p>}
      {flow.status === 'success' && <p className="auth-kit-success">Revisa tu correo para ver el enlace de restablecimiento.</p>}
      {onNavigateToLogin && (
        <button type="button" onClick={onNavigateToLogin} className="auth-kit-button auth-kit-button--ghost">
          Iniciar sesión
        </button>
      )}
    </form>
  );
}
