import { useState } from 'react';

import { buildChangePasswordSchema, extractFieldError } from '../../../core/validation.js';

import type { FormEvent } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';
import type { PasswordPolicy } from '../../../core/validation.js';

export interface UseChangePasswordFormStateOptions {
  authKit: UseAuthKitResult;
  passwordPolicy?: PasswordPolicy;
}

export function useChangePasswordFormState({ authKit, passwordPolicy }: UseChangePasswordFormStateOptions) {
  const [currentPassword, setCurrentPasswordRaw] = useState('');
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

  const setCurrentPassword = (value: string): void => {
    setCurrentPasswordRaw(value);
    clearError('currentPassword');
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
    const result = buildChangePasswordSchema({ passwordPolicy }).safeParse({ currentPassword, newPassword, confirmPassword });
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
  const onCurrentPasswordBlur = (): void => validateField('currentPassword');
  const onNewPasswordBlur = (): void => validateField('newPassword');
  const onConfirmPasswordBlur = (): void => validateField('confirmPassword');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = buildChangePasswordSchema({ passwordPolicy }).safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!result.success) {
      setFieldErrors(Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setFieldErrors({});
    void authKit.changePassword({ currentPassword, newPassword }).catch(() => {});
  };

  return {
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
    flow: authKit.state.changePassword,
  };
}
