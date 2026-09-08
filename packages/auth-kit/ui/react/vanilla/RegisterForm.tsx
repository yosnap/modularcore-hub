import { useState } from 'react';

import '../../vanilla-styles.css';
import { TurnstileWidget } from '../TurnstileWidget.js';
import { useRegisterFormState } from '../internal/register-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { AuthKitFieldConfig } from '../../../core/field-config.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface RegisterFormProps {
  authKit: UseAuthKitResult;
  fieldConfig?: AuthKitFieldConfig;
  passwordPolicy?: PasswordPolicy;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means. */
  onNavigateToLogin?: () => void;
}

/** Vanilla CSS variant — same props/behavior as headless, styled with `auth-kit-*` classes. */
export function RegisterForm({ authKit, fieldConfig, passwordPolicy, onNavigateToLogin }: RegisterFormProps): JSX.Element {
  const state = useRegisterFormState({ authKit, fieldConfig, passwordPolicy });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { fields, fieldErrors, flow } = state;

  return (
    <form onSubmit={state.handleSubmit} noValidate className="auth-kit-form">
      <label className="auth-kit-field" htmlFor="auth-kit-register-email">
        Email
        <input
          id="auth-kit-register-email"
          type="email"
          value={state.email}
          onChange={(event) => state.setEmail(event.target.value)}
          onBlur={state.onEmailBlur}
          autoComplete="email"
          className="auth-kit-input"
        />
      </label>
      {fieldErrors.email && <p className="auth-kit-error">{fieldErrors.email}</p>}

      {fields.firstName.enabled && (
        <label className="auth-kit-field" htmlFor="auth-kit-register-firstname">
          {fields.firstName.label}
          <input
            id="auth-kit-register-firstname"
            type="text"
            value={state.firstName}
            onChange={(event) => state.setFirstName(event.target.value)}
            onBlur={state.onFirstNameBlur}
            className="auth-kit-input"
          />
        </label>
      )}
      {fieldErrors.firstName && <p className="auth-kit-error">{fieldErrors.firstName}</p>}

      {fields.lastName.enabled && (
        <label className="auth-kit-field" htmlFor="auth-kit-register-lastname">
          {fields.lastName.label}
          <input
            id="auth-kit-register-lastname"
            type="text"
            value={state.lastName}
            onChange={(event) => state.setLastName(event.target.value)}
            onBlur={state.onLastNameBlur}
            className="auth-kit-input"
          />
        </label>
      )}
      {fieldErrors.lastName && <p className="auth-kit-error">{fieldErrors.lastName}</p>}

      {fields.phone.enabled && (
        <label className="auth-kit-field" htmlFor="auth-kit-register-phone">
          {fields.phone.label}
          <input
            id="auth-kit-register-phone"
            type="tel"
            value={state.phone}
            onChange={(event) => state.setPhone(event.target.value)}
            onBlur={state.onPhoneBlur}
            className="auth-kit-input"
          />
        </label>
      )}
      {fieldErrors.phone && <p className="auth-kit-error">{fieldErrors.phone}</p>}

      {fields.profileType.enabled && (
        <label className="auth-kit-field" htmlFor="auth-kit-register-profile-type">
          {fields.profileType.label}
          <select
            id="auth-kit-register-profile-type"
            value={state.profileType}
            onChange={(event) => state.setProfileType(event.target.value)}
            className="auth-kit-select"
          >
            {fields.profileType.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="auth-kit-field" htmlFor="auth-kit-register-password">
        Password
        <span className="auth-kit-field__row">
          <input
            id="auth-kit-register-password"
            type={showPassword ? 'text' : 'password'}
            value={state.password}
            onChange={(event) => state.setPassword(event.target.value)}
            onBlur={state.onPasswordBlur}
            autoComplete="new-password"
            className="auth-kit-input"
          />
          <button type="button" onClick={() => setShowPassword((value) => !value)} className="auth-kit-button auth-kit-button--ghost">
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>
      {fieldErrors.password && <p className="auth-kit-error">{fieldErrors.password}</p>}

      <label className="auth-kit-field" htmlFor="auth-kit-register-confirm-password">
        Confirm password
        <span className="auth-kit-field__row">
          <input
            id="auth-kit-register-confirm-password"
            type={showConfirm ? 'text' : 'password'}
            value={state.confirmPassword}
            onChange={(event) => state.setConfirmPassword(event.target.value)}
            onBlur={state.onConfirmPasswordBlur}
            autoComplete="new-password"
            className="auth-kit-input"
          />
          <button type="button" onClick={() => setShowConfirm((value) => !value)} className="auth-kit-button auth-kit-button--ghost">
            {showConfirm ? 'Hide' : 'Show'}
          </button>
        </span>
      </label>
      {fieldErrors.confirmPassword && <p className="auth-kit-error">{fieldErrors.confirmPassword}</p>}

      {fields.legalConsent.enabled && (
        <div>
          <label className="auth-kit-checkbox-row" htmlFor="auth-kit-register-terms">
            <input
              id="auth-kit-register-terms"
              type="checkbox"
              checked={state.termsAccepted}
              onChange={(event) => state.setTermsAccepted(event.target.checked)}
            />
            <span>
              {fields.legalConsent.text}{' '}
              {fields.legalConsent.links.map((link, index) => (
                <span key={link.href}>
                  {index > 0 && ' '}
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </span>
              ))}
            </span>
          </label>
          {fieldErrors.termsAccepted && <p className="auth-kit-error">{fieldErrors.termsAccepted}</p>}
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

      <button type="submit" disabled={flow.status === 'submitting'} className="auth-kit-button auth-kit-button--primary">
        {flow.status === 'submitting' ? 'Creating account…' : 'Create account'}
      </button>
      {flow.status === 'error' && flow.error && <p className="auth-kit-error">{flow.error.message}</p>}
      {flow.status === 'success' && <p className="auth-kit-success">Account created.</p>}
      {onNavigateToLogin && (
        <button type="button" onClick={onNavigateToLogin} className="auth-kit-button auth-kit-button--ghost">
          Sign in
        </button>
      )}
    </form>
  );
}
