import { useState } from 'react';

import { TurnstileWidget } from './TurnstileWidget.js';
import { useRegisterFormState } from './internal/register-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../adapters/react/use-auth-kit.js';
import type { AuthKitFieldConfig } from '../../core/field-config.js';
import type { PasswordPolicy } from '../../core/validation.js';

export interface RegisterFormProps {
  authKit: UseAuthKitResult;
  fieldConfig?: AuthKitFieldConfig;
  passwordPolicy?: PasswordPolicy;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToLogin?: () => void;
}

/** Headless variant — no CSS classes, fully consumer-styleable. Same props/behavior across every presentation. */
export function RegisterForm({ authKit, fieldConfig, passwordPolicy, onNavigateToLogin }: RegisterFormProps): JSX.Element {
  const state = useRegisterFormState({ authKit, fieldConfig, passwordPolicy });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { fields, fieldErrors, flow } = state;

  return (
    <form onSubmit={state.handleSubmit} noValidate>
      <div>
        <label htmlFor="auth-kit-register-email">Correo electrónico</label>
        <input
          id="auth-kit-register-email"
          type="email"
          value={state.email}
          onChange={(event) => state.setEmail(event.target.value)}
          onBlur={state.onEmailBlur}
          autoComplete="email"
        />
        {fieldErrors.email && <p role="alert">{fieldErrors.email}</p>}
      </div>

      {fields.firstName.enabled && (
        <div>
          <label htmlFor="auth-kit-register-firstname">{fields.firstName.label}</label>
          <input
            id="auth-kit-register-firstname"
            type="text"
            value={state.firstName}
            onChange={(event) => state.setFirstName(event.target.value)}
            onBlur={state.onFirstNameBlur}
          />
          {fieldErrors.firstName && <p role="alert">{fieldErrors.firstName}</p>}
        </div>
      )}

      {fields.lastName.enabled && (
        <div>
          <label htmlFor="auth-kit-register-lastname">{fields.lastName.label}</label>
          <input
            id="auth-kit-register-lastname"
            type="text"
            value={state.lastName}
            onChange={(event) => state.setLastName(event.target.value)}
            onBlur={state.onLastNameBlur}
          />
          {fieldErrors.lastName && <p role="alert">{fieldErrors.lastName}</p>}
        </div>
      )}

      {fields.phone.enabled && (
        <div>
          <label htmlFor="auth-kit-register-phone">{fields.phone.label}</label>
          <input
            id="auth-kit-register-phone"
            type="tel"
            value={state.phone}
            onChange={(event) => state.setPhone(event.target.value)}
            onBlur={state.onPhoneBlur}
          />
          {fieldErrors.phone && <p role="alert">{fieldErrors.phone}</p>}
        </div>
      )}

      {fields.profileType.enabled && (
        <div>
          <label htmlFor="auth-kit-register-profile-type">{fields.profileType.label}</label>
          <select
            id="auth-kit-register-profile-type"
            value={state.profileType}
            onChange={(event) => state.setProfileType(event.target.value)}
          >
            {fields.profileType.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="auth-kit-register-password">Contraseña</label>
        <input
          id="auth-kit-register-password"
          type={showPassword ? 'text' : 'password'}
          value={state.password}
          onChange={(event) => state.setPassword(event.target.value)}
            onBlur={state.onPasswordBlur}
          autoComplete="new-password"
        />
        <button type="button" onClick={() => setShowPassword((value) => !value)}>
          {showPassword ? 'Ocultar' : 'Mostrar'}
        </button>
        {fieldErrors.password && <p role="alert">{fieldErrors.password}</p>}
      </div>

      <div>
        <label htmlFor="auth-kit-register-confirm-password">Confirmar contraseña</label>
        <input
          id="auth-kit-register-confirm-password"
          type={showConfirm ? 'text' : 'password'}
          value={state.confirmPassword}
          onChange={(event) => state.setConfirmPassword(event.target.value)}
            onBlur={state.onConfirmPasswordBlur}
          autoComplete="new-password"
        />
        <button type="button" onClick={() => setShowConfirm((value) => !value)}>
          {showConfirm ? 'Ocultar' : 'Mostrar'}
        </button>
        {fieldErrors.confirmPassword && <p role="alert">{fieldErrors.confirmPassword}</p>}
      </div>

      {fields.legalConsent.enabled && (
        <div>
          <label htmlFor="auth-kit-register-terms">
            <input
              id="auth-kit-register-terms"
              type="checkbox"
              checked={state.termsAccepted}
              onChange={(event) => state.setTermsAccepted(event.target.checked)}
            />
            {fields.legalConsent.text}{' '}
            {fields.legalConsent.links.map((link, index) => (
              <span key={link.href}>
                {index > 0 && ' '}
                <a href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </span>
            ))}
          </label>
          {fieldErrors.termsAccepted && <p role="alert">{fieldErrors.termsAccepted}</p>}
        </div>
      )}

      {fields.turnstile.enabled && (
        <TurnstileWidget
          siteKey={fields.turnstile.siteKey}
          theme={fields.turnstile.theme}
          mode={fields.turnstile.mode}
          onToken={state.setTurnstileToken}
        />
      )}

      <button type="submit" disabled={flow.status === 'submitting'}>
        {flow.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
      {flow.status === 'error' && flow.error && <p role="alert">{flow.error.message}</p>}
      {flow.status === 'success' && <p>Cuenta creada.</p>}
      {onNavigateToLogin && (
        <button type="button" onClick={onNavigateToLogin}>
          Iniciar sesión
        </button>
      )}
    </form>
  );
}
