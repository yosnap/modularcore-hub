import { useState } from 'react';

import { EyeIcon, EyeOffIcon } from '../icons.js';
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

const inputClass =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const errorClass = 'text-sm text-red-600 dark:text-red-400';
const linkClass =
  'appearance-none border-0 bg-transparent p-0 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';
const eyeButtonClass =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

/** Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. */
export function LoginForm({ authKit, turnstile, onNavigateToRegister, onNavigateToForgotPassword }: LoginFormProps): JSX.Element {
  const { identifier, setIdentifier, onIdentifierBlur, password, setPassword, onPasswordBlur, setTurnstileToken, fieldErrors, handleSubmit, flow } =
    useLoginFormState({ authKit });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <label className={labelClass} htmlFor="auth-kit-login-identifier">
        Email or username
        <input
          id="auth-kit-login-identifier"
          type="text"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          onBlur={onIdentifierBlur}
          autoComplete="username"
          className={inputClass}
        />
      </label>
      {fieldErrors.identifier && <p className={errorClass}>{fieldErrors.identifier}</p>}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-sm text-zinc-700 dark:text-zinc-300" htmlFor="auth-kit-login-password">
            Password
          </label>
          {onNavigateToForgotPassword && (
            <button type="button" onClick={onNavigateToForgotPassword} className={linkClass}>
              Forgot your password?
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
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className={eyeButtonClass}
          >
            {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {fieldErrors.password && <p className={errorClass}>{fieldErrors.password}</p>}

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
        {flow.status === 'submitting' ? 'Signing in…' : 'Sign in'}
      </button>
      {flow.status === 'error' && flow.error && <p className={errorClass}>{flow.error.message}</p>}
      {flow.status === 'success' && <p className="text-sm text-green-600 dark:text-green-400">Signed in.</p>}
      {onNavigateToRegister && (
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Don't have an account yet?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="appearance-none border-0 bg-transparent p-0 font-medium text-zinc-900 underline hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
          >
            Sign up
          </button>
        </p>
      )}
    </form>
  );
}
