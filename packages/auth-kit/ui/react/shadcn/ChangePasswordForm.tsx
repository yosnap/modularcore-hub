import { useState } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

import { evaluatePasswordStrength } from '../../../core/password-strength.js';
import '../../shadcn-theme.css';
import { CheckIcon, EyeIcon, EyeOffIcon } from '../icons.js';
import { useChangePasswordFormState } from '../internal/change-password-form-state.js';

import type { JSX } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface ChangePasswordFormProps {
  authKit: UseAuthKitResult;
  passwordPolicy?: PasswordPolicy;
}

const inputClass =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const labelClass = 'text-sm font-medium leading-none';
const errorClass = 'text-sm text-destructive';

/** Shadcn variant — self-contained, styled shadcn-like via Radix primitives. Same props/behavior as headless. */
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
  const strength = evaluatePasswordStrength(newPassword, passwordPolicy);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-change-current">
          Contraseña actual
        </LabelPrimitive.Root>
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
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
          >
            {showCurrent ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.currentPassword && <p className={errorClass}>{fieldErrors.currentPassword}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-change-new">
          Contraseña nueva
        </LabelPrimitive.Root>
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
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center appearance-none border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground"
          >
            {showNew ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        {newPassword.length > 0 && (
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
        {fieldErrors.newPassword && <p className={errorClass}>{fieldErrors.newPassword}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <LabelPrimitive.Root className={labelClass} htmlFor="auth-kit-change-confirm">
          Confirmar contraseña nueva
        </LabelPrimitive.Root>
        <input
          id="auth-kit-change-confirm"
          type={showNew ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={onConfirmPasswordBlur}
          autoComplete="new-password"
          className={inputClass}
        />
        {fieldErrors.confirmPassword && <p className={errorClass}>{fieldErrors.confirmPassword}</p>}
      </div>

      <button
        type="submit"
        disabled={flow.status === 'submitting'}
        className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
      >
        {flow.status === 'submitting' ? 'Actualizando…' : 'Actualizar contraseña'}
      </button>
      {flow.status === 'error' && flow.error && <p className={errorClass}>{flow.error.message}</p>}
      {flow.status === 'success' && (
        <p className="text-sm text-green-600">Contraseña actualizada.</p>
      )}
    </form>
  );
}
