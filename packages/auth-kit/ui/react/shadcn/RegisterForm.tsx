import { useState } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as LabelPrimitive from '@radix-ui/react-label';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { evaluatePasswordStrength } from '../../../core/password-strength.js';
import '../../shadcn-theme.css';
import { CheckIcon, EyeIcon, EyeOffIcon } from '../icons.js';
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
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';

/** Shadcn variant — self-contained, styled shadcn-like via Radix primitives. Same props/behavior as headless. */
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
  const strength = evaluatePasswordStrength(state.password, passwordPolicy);

  return (
    <form onSubmit={state.handleSubmit} noValidate className="flex flex-col gap-4">
      {fields.profileType.enabled && (
        <TabsPrimitive.Root value={state.profileType} onValueChange={state.setProfileType}>
          <TabsPrimitive.List
            className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
            aria-label={fields.profileType.label}
          >
            {fields.profileType.options.map((option) => (
              <TabsPrimitive.Trigger
                key={option.value}
                value={option.value}
                className="rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {option.label}
              </TabsPrimitive.Trigger>
            ))}
          </TabsPrimitive.List>
        </TabsPrimitive.Root>
      )}

      <div className="flex flex-col gap-1.5">
        <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-register-email">
          Correo electrónico
        </LabelPrimitive.Root>
        <input
          id="auth-kit-register-email"
          type="email"
          value={state.email}
          onChange={(event) => state.setEmail(event.target.value)}
          onBlur={state.onEmailBlur}
          autoComplete="email"
          className={inputClass}
        />
        {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
      </div>

      {fields.firstName.enabled && (
        <div className="flex flex-col gap-1.5">
          <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-register-firstname">
            {fields.firstName.label}
          </LabelPrimitive.Root>
          <input
            id="auth-kit-register-firstname"
            type="text"
            value={state.firstName}
            onChange={(event) => state.setFirstName(event.target.value)}
            onBlur={state.onFirstNameBlur}
            className={inputClass}
          />
          {fieldErrors.firstName && <p className={errorClass}>{fieldErrors.firstName}</p>}
        </div>
      )}

      {fields.lastName.enabled && (
        <div className="flex flex-col gap-1.5">
          <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-register-lastname">
            {fields.lastName.label}
          </LabelPrimitive.Root>
          <input
            id="auth-kit-register-lastname"
            type="text"
            value={state.lastName}
            onChange={(event) => state.setLastName(event.target.value)}
            onBlur={state.onLastNameBlur}
            className={inputClass}
          />
          {fieldErrors.lastName && <p className={errorClass}>{fieldErrors.lastName}</p>}
        </div>
      )}

      {fields.phone.enabled && (
        <div className="flex flex-col gap-1.5">
          <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-register-phone">
            {fields.phone.label}
          </LabelPrimitive.Root>
          <input
            id="auth-kit-register-phone"
            type="tel"
            value={state.phone}
            onChange={(event) => state.setPhone(event.target.value)}
            onBlur={state.onPhoneBlur}
            className={inputClass}
          />
          {fieldErrors.phone && <p className={errorClass}>{fieldErrors.phone}</p>}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-register-password">
          Contraseña
        </LabelPrimitive.Root>
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
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        {state.password.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1">
              {Array.from({ length: strength.total }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full ${
                    index < strength.score
                      ? strength.score === strength.total
                        ? 'bg-green-500'
                        : strength.score >= strength.total - 1
                          ? 'bg-yellow-500'
                          : 'bg-destructive'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
              {strength.requirements.map((requirement) => (
                <li
                  key={requirement.key}
                  className={`flex items-center gap-1 ${requirement.met ? 'text-green-600' : 'text-muted-foreground'}`}
                >
                  {requirement.met ? (
                    <CheckIcon className="h-3 w-3" />
                  ) : (
                    <span className="inline-block h-3 w-3" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {requirement.label}
                </li>
              ))}
            </ul>
          </div>
        )}
        {fieldErrors.password && <p className={errorClass}>{fieldErrors.password}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-register-confirm-password">
          Confirmar contraseña
        </LabelPrimitive.Root>
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
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
          >
            {showConfirm ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.confirmPassword && <p className={errorClass}>{fieldErrors.confirmPassword}</p>}
      </div>

      {fields.legalConsent.enabled && (
        <div>
          <div className="flex items-start gap-2">
            <CheckboxPrimitive.Root
              id="auth-kit-register-terms"
              checked={state.termsAccepted}
              onCheckedChange={(checked) => state.setTermsAccepted(checked === true)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            >
              <CheckboxPrimitive.Indicator className="flex items-center justify-center">
                <CheckIcon className="h-3.5 w-3.5" />
              </CheckboxPrimitive.Indicator>
            </CheckboxPrimitive.Root>
            <LabelPrimitive.Root
              htmlFor="auth-kit-register-terms"
              className="text-sm text-muted-foreground"
            >
              {fields.legalConsent.text}{' '}
              {fields.legalConsent.links.map((link, index) => (
                <span key={link.href}>
                  {index > 0 && ' '}
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {link.label}
                  </a>
                </span>
              ))}
            </LabelPrimitive.Root>
          </div>
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
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {flow.status === 'submitting' ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
      {flow.status === 'error' && flow.error && <p className={errorClass}>{flow.error.message}</p>}
      {flow.status === 'success' && <p className="text-sm text-green-600">Cuenta creada.</p>}

      {onNavigateToLogin && (
        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes una cuenta?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="font-medium text-primary hover:underline"
          >
            Iniciar sesión
          </button>
        </p>
      )}
    </form>
  );
}
