import { useState } from 'react';

import { EyeIcon, EyeOffIcon } from '../icons.js';
import { useChangePasswordFormState } from '../internal/change-password-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface ChangePasswordFormProps {
  authKit: UseAuthKitResult;
  passwordPolicy?: PasswordPolicy;
}

const inputClass =
  'box-border w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:text-zinc-100';
const labelClass = 'flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300';
const errorClass = 'text-sm text-red-600 dark:text-red-400';
const eyeButtonClass =
  'absolute inset-y-0 right-0 flex w-9 appearance-none items-center justify-center border-0 bg-transparent p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

/** Tailwind variant — same props/behavior as headless, styled with the media-picker zinc palette. */
export function ChangePasswordForm({
  authKit,
  passwordPolicy,
}: ChangePasswordFormProps): JSX.Element {
  const {
    currentPassword,
    setCurrentPassword,
    onCurrentPasswordBlur,
    newPassword,
    setNewPassword,
    onNewPasswordBlur,
    confirmPassword,
    setConfirmPassword,
    onConfirmPasswordBlur,
    fieldErrors,
    handleSubmit,
    flow,
  } = useChangePasswordFormState({ authKit, passwordPolicy });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
      <label className={labelClass} htmlFor="auth-kit-change-current">
        Contraseña actual
        <div className="relative">
          <input
            id="auth-kit-change-current"
            type={showCurrent ? 'text' : 'password'}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            onBlur={onCurrentPasswordBlur}
            autoComplete="current-password"
            className={`${inputClass} pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowCurrent((value) => !value)}
            aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className={eyeButtonClass}
          >
            {showCurrent ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </label>
      {fieldErrors.currentPassword && <p className={errorClass}>{fieldErrors.currentPassword}</p>}

      <label className={labelClass} htmlFor="auth-kit-change-new">
        Contraseña nueva
        <div className="relative">
          <input
            id="auth-kit-change-new"
            type={showNew ? 'text' : 'password'}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            onBlur={onNewPasswordBlur}
            autoComplete="new-password"
            className={`${inputClass} pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowNew((value) => !value)}
            aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className={eyeButtonClass}
          >
            {showNew ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </label>
      {fieldErrors.newPassword && <p className={errorClass}>{fieldErrors.newPassword}</p>}

      <label className={labelClass} htmlFor="auth-kit-change-confirm">
        Confirmar contraseña nueva
        <input
          id="auth-kit-change-confirm"
          type={showNew ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={onConfirmPasswordBlur}
          autoComplete="new-password"
          className={inputClass}
        />
      </label>
      {fieldErrors.confirmPassword && <p className={errorClass}>{fieldErrors.confirmPassword}</p>}

      <button
        type="submit"
        disabled={flow.status === 'submitting'}
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {flow.status === 'submitting' ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
      {flow.status === 'error' && flow.error && <p className={errorClass}>{flow.error.message}</p>}
      {flow.status === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">Contraseña actualizada.</p>
      )}
    </form>
  );
}
