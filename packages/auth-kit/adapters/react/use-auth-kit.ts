import { useEffect, useRef, useState } from 'react';

import { AuthKit } from '../../core/auth-kit.js';

import type { AuthKitState } from '../../core/auth-kit.js';
import type {
  AuthKitHooks,
  ChangePasswordPayload,
  FlowName,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResendVerificationPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from '../../core/types.js';

export interface UseAuthKitResult<TSession = unknown> {
  state: AuthKitState;
  login: (payload: LoginPayload) => Promise<TSession>;
  register: (payload: RegisterPayload) => Promise<TSession | void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<void>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<void>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<void>;
  resendVerification: (payload: ResendVerificationPayload) => Promise<void>;
  reset: (flow?: FlowName) => void;
}

/**
 * Binds `AuthKit` (headless core) to React state. No business logic lives here — every action
 * just forwards to the core instance, which owns the per-flow state machine and notifies this
 * hook via `subscribe`. Same split as `useMediaPicker` in `packages/media-picker`.
 */
export function useAuthKit<TSession = unknown>(
  hooks: AuthKitHooks<TSession>,
): UseAuthKitResult<TSession> {
  const kitRef = useRef<AuthKit<TSession> | null>(null);
  if (!kitRef.current) kitRef.current = new AuthKit<TSession>(hooks);
  const kit = kitRef.current;

  const [state, setState] = useState<AuthKitState>(() => kit.getState());

  useEffect(() => kit.subscribe(setState), [kit]);

  return {
    state,
    login: (payload) => kit.login(payload),
    register: (payload) => kit.register(payload),
    changePassword: (payload) => kit.changePassword(payload),
    forgotPassword: (payload) => kit.forgotPassword(payload),
    resetPassword: (payload) => kit.resetPassword(payload),
    verifyEmail: (payload) => kit.verifyEmail(payload),
    resendVerification: (payload) => kit.resendVerification(payload),
    reset: (flow) => kit.reset(flow),
  };
}
