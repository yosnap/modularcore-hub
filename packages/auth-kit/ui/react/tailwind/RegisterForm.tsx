import { useState } from 'react';

import { EyeIcon, EyeOffIcon } from '../icons.js';
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

const inputClass =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const errorClass = 'text-sm text-red-600 dark:text-red-400';
const eyeButtonClass =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

/** Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. */
export function RegisterForm({
  authKit,
  fieldConfig,
  passwordPolicy,
  onNavigateToLogin,
}: RegisterFormProps): JSX.Element {
  const state = useRegisterFormState({ authKit, fieldConfig, passwordPolicy });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { fields, fieldErrors, flow } = state;

  return (
    <form onSubmit={state.handleSubmit} noValidate className="flex flex-col gap-3">
      <label className={labelClass} htmlFor="auth-kit-register-email">
        Correo electrónico
        <input
          id="auth-kit-register-email"
          type="email"
          value={state.email}
          onChange={(event) => state.setEmail(event.target.value)}
          onBlur={state.onEmailBlur}
          autoComplete="email"
          className={inputClass}
        />
      </label>
      {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}

      {fields.firstName.enabled && (
        <label className={labelClass} htmlFor="auth-kit-register-firstname">
          {fields.firstName.label}
          <input
            id="auth-kit-register-firstname"
            type="text"
            value={state.firstName}
            onChange={(event) => state.setFirstName(event.target.value)}
            onBlur={state.onFirstNameBlur}
            className={inputClass}
          />
        </label>
      )}
      {fieldErrors.firstName && <p className={errorClass}>{fieldErrors.firstName}</p>}

      {fields.lastName.enabled && (
        <label className={labelClass} htmlFor="auth-kit-register-lastname">
          {fields.lastName.label}
          <input
            id="auth-kit-register-lastname"
            type="text"
            value={state.lastName}
            onChange={(event) => state.setLastName(event.target.value)}
            onBlur={state.onLastNameBlur}
            className={inputClass}
          />
        </label>
      )}
      {fieldErrors.lastName && <p className={errorClass}>{fieldErrors.lastName}</p>}

      {fields.phone.enabled && (
        <label className={labelClass} htmlFor="auth-kit-register-phone">
          {fields.phone.label}
          <input
            id="auth-kit-register-phone"
            type="tel"
            value={state.phone}
            onChange={(event) => state.setPhone(event.target.value)}
            onBlur={state.onPhoneBlur}
            className={inputClass}
          />
        </label>
      )}
      {fieldErrors.phone && <p className={errorClass}>{fieldErrors.phone}</p>}

      {fields.profileType.enabled && (
        <label className={labelClass} htmlFor="auth-kit-register-profile-type">
          {fields.profileType.label}
          <select
            id="auth-kit-register-profile-type"
            value={state.profileType}
            onChange={(event) => state.setProfileType(event.target.value)}
            className={`${inputClass} dark:[color-scheme:dark]`}
          >
            {fields.profileType.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className={labelClass} htmlFor="auth-kit-register-password">
        Contraseña
        <div className="relative">
          <input
            id="auth-kit-register-password"
            type={showPassword ? 'text' : 'password'}
            value={state.password}
            onChange={(event) => state.setPassword(event.target.value)}
            onBlur={state.onPasswordBlur}
            autoComplete="new-password"
            className={`${inputClass} pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className={eyeButtonClass}
          >
            {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </label>
      {fieldErrors.password && <p className={errorClass}>{fieldErrors.password}</p>}

      <label className={labelClass} htmlFor="auth-kit-register-confirm-password">
        Confirmar contraseña
        <div className="relative">
          <input
            id="auth-kit-register-confirm-password"
            type={showConfirm ? 'text' : 'password'}
            value={state.confirmPassword}
            onChange={(event) => state.setConfirmPassword(event.target.value)}
            onBlur={state.onConfirmPasswordBlur}
            autoComplete="new-password"
            className={`${inputClass} pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((value) => !value)}
            aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className={eyeButtonClass}
          >
            {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </label>
      {fieldErrors.confirmPassword && <p className={errorClass}>{fieldErrors.confirmPassword}</p>}

      {fields.legalConsent.enabled && (
        <div>
          <label
            className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            htmlFor="auth-kit-register-terms"
          >
            <input
              id="auth-kit-register-terms"
              type="checkbox"
              checked={state.termsAccepted}
              onChange={(event) => state.setTermsAccepted(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              {fields.legalConsent.text}{' '}
              {fields.legalConsent.links.map((link, index) => (
                <span key={link.href}>
                  {index > 0 && ' '}
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </span>
          </label>
          {fieldErrors.termsAccepted && <p className={errorClass}>{fieldErrors.termsAccepted}</p>}
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

      <button
        type="submit"
        disabled={flow.status === 'submitting'}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {flow.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
      {flow.status === 'error' && flow.error && <p className={errorClass}>{flow.error.message}</p>}
      {flow.status === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">Cuenta creada.</p>
      )}
      {onNavigateToLogin && (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          ¿Ya tienes una cuenta?{' '}
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
