import { useState } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

import '../../shadcn-theme.css';
import { EyeIcon, EyeOffIcon } from '../icons.js';
import { TurnstileWidget } from '../TurnstileWidget.js';
import { useLoginFormState } from '../internal/login-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

export interface LoginFormProps {
  authKit: UseAuthKitResult;
  turnstile?: TurnstileFieldConfig;
  /** Rendered as a footer link when provided — the consumer decides what "navigate" means (router push, tab switch, ...). */
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}

const inputClass =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';

/** Shadcn variant — self-contained, styled shadcn-like via Radix primitives (no assumption the consumer has shadcn/ui installed). Same props/behavior as headless. */
export function LoginForm({ authKit, turnstile, onNavigateToRegister, onNavigateToForgotPassword }: LoginFormProps): JSX.Element {
  const { identifier, setIdentifier, onIdentifierBlur, password, setPassword, onPasswordBlur, setTurnstileToken, fieldErrors, handleSubmit, flow } =
    useLoginFormState({ authKit });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-login-identifier">
          Correo electrónico o nombre de usuario
        </LabelPrimitive.Root>
        <input
          id="auth-kit-login-identifier"
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          onBlur={onIdentifierBlur}
          autoComplete="username"
          className={inputClass}
        />
        {fieldErrors.identifier && <p className="text-sm text-destructive">{fieldErrors.identifier}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-login-password">
            Contraseña
          </LabelPrimitive.Root>
          {onNavigateToForgotPassword && (
            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-xs font-medium appearance-none border-0 bg-transparent p-0 text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
        <div className="relative">
          <input
            id="auth-kit-login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={onPasswordBlur}
            autoComplete="current-password"
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
        {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
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
        {flow.status === 'submitting' ? 'Iniciando sesión…' : 'Iniciar sesión'}
      </button>
      {flow.status === 'error' && flow.error && <p className="text-sm text-destructive">{flow.error.message}</p>}
      {flow.status === 'success' && <p className="text-sm text-green-600">Sesión iniciada.</p>}

      {onNavigateToRegister && (
        <p className="text-center text-sm text-muted-foreground">
          ¿Aún no tienes una cuenta?{' '}
          <button type="button" onClick={onNavigateToRegister} className="font-medium text-primary hover:underline">
            Registrarse
          </button>
        </p>
      )}
    </form>
  );
}
