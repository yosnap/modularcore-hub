import { useState } from 'react';

import { TurnstileWidget } from './TurnstileWidget.js';
import { useLoginFormState } from './internal/login-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../adapters/react/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../core/field-config.js';

export interface LoginFormProps {
  authKit: UseAuthKitResult;
  turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
export function LoginForm({
  authKit,
  turnstile,
  onNavigateToRegister,
  onNavigateToForgotPassword,
}: LoginFormProps): JSX.Element {
  const {
    identifier,
    setIdentifier,
    onIdentifierBlur,
    password,
    setPassword,
    onPasswordBlur,
    setTurnstileToken,
    fieldErrors,
    handleSubmit,
    flow,
  } = useLoginFormState({ authKit });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="auth-kit-login-identifier">Correo electrónico o nombre de usuario</label>
        <input
          id="auth-kit-login-identifier"
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          onBlur={onIdentifierBlur}
          autoComplete="username"
        />
        {fieldErrors.identifier && <p role="alert">{fieldErrors.identifier}</p>}
      </div>
      <div>
        <label htmlFor="auth-kit-login-password">Contraseña</label>
        <input
          id="auth-kit-login-password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onBlur={onPasswordBlur}
          autoComplete="current-password"
        />
        <button type="button" onClick={() => setShowPassword((value) => !value)}>
          {showPassword ? 'Ocultar' : 'Mostrar'}
        </button>
        {fieldErrors.password && <p role="alert">{fieldErrors.password}</p>}
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
        {flow.status === 'submitting' ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>
      {flow.status === 'error' && flow.error && <p role="alert">{flow.error.message}</p>}
      {flow.status === 'success' && <p>Sesión iniciada.</p>}
      {onNavigateToForgotPassword && (
        <button type="button" onClick={onNavigateToForgotPassword}>
          ¿Olvidaste tu contraseña?
        </button>
      )}
      {onNavigateToRegister && (
        <button type="button" onClick={onNavigateToRegister}>
          Registrarse
        </button>
      )}
    </form>
  );
}
