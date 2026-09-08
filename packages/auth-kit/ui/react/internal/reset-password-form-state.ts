import { useState } from 'react';

import { buildResetPasswordSchema, extractFieldError } from '../../../core/validation.js';

import type { FormEvent } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface UseResetPasswordFormStateOptions {
  authKit: UseAuthKitResult;
  token: string;
  passwordPolicy?: PasswordPolicy;
}

export function useResetPasswordFormState({ authKit, token, passwordPolicy }: UseResetPasswordFormStateOptions) {
  const [newPassword, setNewPasswordRaw] = useState('');
  const [confirmPassword, setConfirmPasswordRaw] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
  const clearError = (key: string): void => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setNewPassword = (value: string): void => {
    setNewPasswordRaw(value);
    clearError('newPassword');
  };
  const setConfirmPassword = (value: string): void => {
    setConfirmPasswordRaw(value);
    clearError('confirmPassword');
  };

  /** Validates a single field on blur — shows that field's error immediately instead of waiting for submit. */
  const validateField = (key: string): void => {
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse({ newPassword, confirmPassword });
    const message = extractFieldError(result, key);
    setFieldErrors((prev) => {
      if (!message) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: message };
    });
  };
  const onNewPasswordBlur = (): void => validateField('newPassword');
  const onConfirmPasswordBlur = (): void => validateField('confirmPassword');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = buildResetPasswordSchema({ passwordPolicy }).safeParse({ newPassword, confirmPassword });
    if (!result.success) {
      setFieldErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setFieldErrors({});
    void authKit.resetPassword({ token, newPassword }).catch(() => {});
  };

  return {
    newPassword,
    setNewPassword,
    onNewPasswordBlur,
    confirmPassword,
    setConfirmPassword,
    onConfirmPasswordBlur,
    fieldErrors,
    handleSubmit,
    flow: authKit.state.resetPassword,
  };
}
