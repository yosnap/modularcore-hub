import { signal } from '@angular/core';

import { AuthKit } from '../../core/auth-kit.js';

import type { DestroyRef, Signal } from '@angular/core';
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

/**
 * Per-component Angular binding for the headless auth kit. Create it in a standalone
 * component/directive with that instance's `DestroyRef`; it is deliberately not a root
 * service (same rationale as `MediaPickerService`: each form owns its own `AuthKit`).
 */
export interface AuthKitService<TSession = unknown> {
  readonly state: Signal<AuthKitState>;
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
 * Connects one `AuthKit` to an Angular signal and disposes its subscription when the owning
 * standalone component/directive is destroyed. The core remains the sole state owner.
 */
export function createAuthKitService<TSession = unknown>(
  destroyRef: DestroyRef,
  hooks: AuthKitHooks<TSession>,
): AuthKitService<TSession> {
  const kit = new AuthKit<TSession>(hooks);
  const state = signal<AuthKitState>(kit.getState());
  let active = true;
  const unsubscribe = kit.subscribe((next) => {
    if (active) state.set(next);
  });

  destroyRef.onDestroy(() => {
    active = false;
    unsubscribe();
  });

  return {
    state: state.asReadonly(),
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
