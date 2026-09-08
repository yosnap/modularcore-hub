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

export interface AuthKitStore<TSession = unknown> {
  getState: () => AuthKitState;
  /** Registers a listener and invokes it immediately with the current state, so the first paint needs no separate `getState` call. Returns the unsubscribe function. */
  subscribe: (listener: (state: AuthKitState) => void) => () => void;
  /** Unsubscribes every listener registered through this store. */
  destroy: () => void;
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
 * Framework-free binding for the headless `AuthKit` core — for Astro islands, Blade, HTMX,
 * Rails, or any framework-less page. No framework here, so cleanup is left to the caller: call
 * `destroy()` when the island/page/widget unmounts. Same shape/rationale as `createMediaPickerStore`.
 */
export function createAuthKitStore<TSession = unknown>(
  hooks: AuthKitHooks<TSession>,
): AuthKitStore<TSession> {
  const kit = new AuthKit<TSession>(hooks);
  const unsubscribes = new Set<() => void>();

  return {
    getState: () => kit.getState(),
    subscribe: (listener) => {
      // The core keeps listeners in a Set, so subscribing the same function twice would only
      // register one entry and the first unsubscribe would silence the second too. Each call
      // wraps the listener so its own unsubscribe only affects this subscription — reusing one
      // paint function across several DOM zones is normal without a framework.
      const wrapped = (state: AuthKitState) => listener(state);
      const unsubscribe = kit.subscribe(wrapped);
      unsubscribes.add(unsubscribe);
      listener(kit.getState());

      return () => {
        unsubscribes.delete(unsubscribe);
        unsubscribe();
      };
    },
    destroy: () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
      unsubscribes.clear();
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
