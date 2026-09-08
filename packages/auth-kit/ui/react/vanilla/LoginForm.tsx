import { useState } from 'react';

import '../../vanilla-styles.css';
import { TurnstileWidget } from '../TurnstileWidget.js';
import { useLoginFormState } from '../internal/login-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

export interface LoginFormProps {
  authKit: UseAuthKitResult;
  turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
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
    <form onSubmit={handleSubmit} noValidate className="auth-kit-form">
      <label className="auth-kit-field" htmlFor="auth-kit-login-identifier">
        Correo electrónico o nombre de usuario
        <input
          id="auth-kit-login-identifier"
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          onBlur={onIdentifierBlur}
          autoComplete="username"
          className="auth-kit-input"
        />
      </label>
      {fieldErrors.identifier && <p className="auth-kit-error">{fieldErrors.identifier}</p>}

      <label className="auth-kit-field" htmlFor="auth-kit-login-password">
        Contraseña
        <span className="auth-kit-field__row">
          <input
            id="auth-kit-login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={onPasswordBlur}
            autoComplete="current-password"
            className="auth-kit-input"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="auth-kit-button auth-kit-button--ghost"
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </span>
      </label>
      {fieldErrors.password && <p className="auth-kit-error">{fieldErrors.password}</p>}

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
        className="auth-kit-button auth-kit-button--primary"
      >
        {flow.status === 'submitting' ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>
      {flow.status === 'error' && flow.error && (
        <p className="auth-kit-error">{flow.error.message}</p>
      )}
      {flow.status === 'success' && <p className="auth-kit-success">Sesión iniciada.</p>}
      {onNavigateToForgotPassword && (
        <button
          type="button"
          onClick={onNavigateToForgotPassword}
          className="auth-kit-button auth-kit-button--ghost"
        >
          ¿Olvidaste tu contraseña?
        </button>
      )}
      {onNavigateToRegister && (
        <button
          type="button"
          onClick={onNavigateToRegister}
          className="auth-kit-button auth-kit-button--ghost"
        >
          Registrarse
        </button>
      )}
    </form>
  );
}
