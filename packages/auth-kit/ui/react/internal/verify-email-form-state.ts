import { useEffect, useRef, useState } from 'react';

import { buildResendVerificationSchema } from '../../../core/validation.js';

import type { FormEvent } from 'react';
import type { UseAuthKitResult } from '../../../adapters/react/use-auth-kit.js';

export interface UseVerifyEmailFormStateOptions {
  authKit: UseAuthKitResult;
  /** Verification token from the URL — when present, `verifyEmail` fires once automatically. */
  token?: string;
  email?: string;
}

/** Owns both the auto-verify-on-mount flow and the resend sub-flow — kept together since a
 * failed/expired token is exactly when the resend form becomes relevant. */
export function useVerifyEmailFormState({
  authKit,
  token,
  email: initialEmail,
}: UseVerifyEmailFormStateOptions) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const verifyAttempted = useRef(false);

  useEffect(() => {
    if (!token || verifyAttempted.current) return;
    verifyAttempted.current = true;
    void authKit.verifyEmail({ token }).catch(() => {});
    // authKit is a stable per-mount object from useAuthKit; token drives this effect.
  }, [token]);

  const handleResendSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = buildResendVerificationSchema().safeParse({ email });
    if (!result.success) {
      setFieldErrors(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setFieldErrors({});
    void authKit.resendVerification({ email, turnstileToken }).catch(() => {});
  };

  return {
    email,
    setEmail,
    turnstileToken,
    setTurnstileToken,
    fieldErrors,
    handleResendSubmit,
    verifyFlow: authKit.state.verifyEmail,
    resendFlow: authKit.state.resendVerification,
  };
}
