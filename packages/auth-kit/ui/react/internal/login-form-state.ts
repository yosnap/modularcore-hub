import { useState } from 'react';

import { buildLoginSchema, extractFieldError } from '../../../core/validation.js';

import type { FormEvent } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';

export interface UseLoginFormStateOptions {
  authKit: UseAuthKitResult;
}

/** Shared logic behind every LoginForm presentation — only markup/classes differ between them. */
export function useLoginFormState({ authKit }: UseLoginFormStateOptions) {
  const [identifier, setIdentifierRaw] = useState('');
  const [password, setPasswordRaw] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
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

  const setIdentifier = (value: string): void => {
    setIdentifierRaw(value);
    clearError('identifier');
  };
  const setPassword = (value: string): void => {
    setPasswordRaw(value);
    clearError('password');
  };

  /** Validates a single field on blur — shows that field's error immediately instead of waiting for submit. */
  const validateField = (key: string): void => {
    const result = buildLoginSchema().safeParse({ identifier, password });
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
  const onIdentifierBlur = (): void => validateField('identifier');
  const onPasswordBlur = (): void => validateField('password');

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = buildLoginSchema().safeParse({ identifier, password });
    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setFieldErrors({});
    void authKit.login({ identifier, password, turnstileToken }).catch(() => {});
  };

  return {
    identifier,
    setIdentifier,
    onIdentifierBlur,
    password,
    setPassword,
    onPasswordBlur,
    turnstileToken,
    setTurnstileToken,
    fieldErrors,
    handleSubmit,
    flow: authKit.state.login,
  };
}
