/// <reference types="svelte" />
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

export interface AuthKitRune<TSession = unknown> {
  readonly state: AuthKitState;
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
 * Svelte 5 rune binding to `AuthKit` (headless core). No business logic here — `state` is a
 * `$state` mirror kept in sync via `kit.subscribe`, every action just forwards. Same split as
 * `createMediaPicker`.
 */
export function createAuthKit<TSession = unknown>(
  hooks: AuthKitHooks<TSession>,
): AuthKitRune<TSession> {
  const kit = new AuthKit<TSession>(hooks);
  let state = $state<AuthKitState>(kit.getState());

  kit.subscribe((next) => {
    state = next;
  });

  return {
    get state() {
      return state;
    },
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
