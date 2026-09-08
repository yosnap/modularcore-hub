/**
 * Public contract for `auth-kit`. Every payload/hook shape here is intentionally generic —
 * the component never talks to a real backend itself, it only calls the hooks the consumer
 * wires to their own API (Better Auth, a custom REST backend, whatever). Credentials and
 * session shapes are opaque (`TSession = unknown` by default) because auth-kit never stores
 * or inspects them; it only forwards the hook's resolved value to the caller.
 */

export type FlowName =
  | 'login'
  | 'register'
  | 'changePassword'
  | 'forgotPassword'
  | 'resetPassword'
  | 'verifyEmail'
  | 'resendVerification';

export type FlowStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface FlowState {
  status: FlowStatus;
  error: Error | null;
}

export function initialFlowState(): FlowState {
  return { status: 'idle', error: null };
}

export interface LoginPayload {
  /** Email or username — the hook decides which identifiers it accepts. */
  identifier: string;
  password: string;
  turnstileToken?: string | null;
}

export interface RegisterPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** Value of the configured `profileType` field (e.g. "particular" / "professional"). */
  profileType?: string;
  termsAccepted?: boolean;
  turnstileToken?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
  turnstileToken?: string | null;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ResendVerificationPayload {
  email: string;
  turnstileToken?: string | null;
}

/**
 * Hooks the consumer implements against their own backend. Only `onLogin` and `onRegister`
 * are required — every other flow is opt-in: if the consumer doesn't pass the hook, calling
 * that flow's action rejects with a clear "hook not configured" error instead of doing
 * nothing silently (see `AuthKit.run` in `auth-kit.ts`).
 */
export interface AuthKitHooks<TSession = unknown> {
  onLogin: (payload: LoginPayload) => Promise<TSession>;
  onRegister: (payload: RegisterPayload) => Promise<TSession | void>;
  onChangePassword?: (payload: ChangePasswordPayload) => Promise<void>;
  onForgotPassword?: (payload: ForgotPasswordPayload) => Promise<void>;
  onResetPassword?: (payload: ResetPasswordPayload) => Promise<void>;
  onVerifyEmail?: (payload: VerifyEmailPayload) => Promise<void>;
  onResendVerification?: (payload: ResendVerificationPayload) => Promise<void>;
}
