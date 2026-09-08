import { useState } from 'react';

import { buildForgotPasswordSchema, extractFieldError } from '../../../core/validation.js';

import type { FormEvent } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';

export interface UseForgotPasswordFormStateOptions {
  authKit: UseAuthKitResult;
}

export function useForgotPasswordFormState({ authKit }: UseForgotPasswordFormStateOptions) {
  const [email, setEmailRaw] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /** Clears a field's stale error message as soon as the user edits it, instead of leaving it displayed until the next submit. */
  const setEmail = (value: string): void => {
    setEmailRaw(value);
    setFieldErrors((prev) => {
      if (!('email' in prev)) return prev;
      const next = { ...prev };
      delete next.email;
      return next;
    });
  };

  /** Validates the field on blur — shows its error immediately instead of waiting for submit. */
  const onEmailBlur = (): void => {
    const result = buildForgotPasswordSchema().safeParse({ email });
    const message = extractFieldError(result, 'email');
    setFieldErrors((prev) => {
      if (!message) {
        if (!('email' in prev)) return prev;
        const next = { ...prev };
        delete next.email;
        return next;
      }
      return { ...prev, email: message };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = buildForgotPasswordSchema().safeParse({ email });
    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setFieldErrors({});
    void authKit.forgotPassword({ email, turnstileToken }).catch(() => {});
  };

  return {
    email,
    setEmail,
    onEmailBlur,
    turnstileToken,
    setTurnstileToken,
    fieldErrors,
    handleSubmit,
    flow: authKit.state.forgotPassword,
  };
}
