import { initialFlowState } from './types.js';

import type {
  AuthKitHooks,
  ChangePasswordPayload,
  FlowName,
  FlowState,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResendVerificationPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from './types.js';

export interface AuthKitState {
  login: FlowState;
  register: FlowState;
  changePassword: FlowState;
  forgotPassword: FlowState;
  resetPassword: FlowState;
  verifyEmail: FlowState;
  resendVerification: FlowState;
}

function initialState(): AuthKitState {
  return {
    login: initialFlowState(),
    register: initialFlowState(),
    changePassword: initialFlowState(),
    forgotPassword: initialFlowState(),
    resetPassword: initialFlowState(),
    verifyEmail: initialFlowState(),
    resendVerification: initialFlowState(),
  };
}

export type AuthKitListener = (state: AuthKitState) => void;

const OPTIONAL_HOOK_FLOWS = new Set<FlowName>([
  'changePassword',
  'forgotPassword',
  'resetPassword',
  'verifyEmail',
  'resendVerification',
]);

/**
 * Headless orchestrator: owns per-flow submit state (idle/submitting/success/error) and
 * forwards every action to the hook the consumer configured. No transport, no storage — the
 * hook's promise IS the network call. Framework adapters are thin `subscribe()` bindings over
 * this, same split as `MediaPicker` in `packages/media-picker/core/media-picker.ts`.
 */
export class AuthKit<TSession = unknown> {
  private state: AuthKitState = initialState();
  private readonly listeners = new Set<AuthKitListener>();
  private readonly hooks: AuthKitHooks<TSession>;
  // Per-flow generation guard: a flow fired twice before the first resolves (double submit,
  // or reset() while in flight) must not let the stale call's result/error land after the
  // newer one — same "last one wins" pattern as MediaPicker.run/commitIfCurrent.
  private readonly generations: Record<FlowName, number> = {
    login: 0,
    register: 0,
    changePassword: 0,
    forgotPassword: 0,
    resetPassword: 0,
    verifyEmail: 0,
    resendVerification: 0,
  };

  constructor(hooks: AuthKitHooks<TSession>) {
    this.hooks = hooks;
  }

  getState(): AuthKitState {
    return this.state;
  }

  subscribe(listener: AuthKitListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setFlowState(flow: FlowName, patch: Partial<FlowState>): void {
    this.state = { ...this.state, [flow]: { ...this.state[flow], ...patch } };
    for (const listener of this.listeners) listener(this.state);
  }

  /** Resets one flow (or every flow when omitted) back to idle — e.g. after navigating away from a form. */
  reset(flow?: FlowName): void {
    if (flow) {
      this.generations[flow] += 1;
      this.setFlowState(flow, initialFlowState());
      return;
    }
    for (const key of Object.keys(this.generations) as FlowName[]) {
      this.generations[key] += 1;
    }
    this.state = initialState();
    for (const listener of this.listeners) listener(this.state);
  }

  private async run<T>(
    flow: FlowName,
    hook: ((payload: never) => Promise<T>) | undefined,
    payload: unknown,
  ): Promise<T> {
    if (!hook) {
      const error = new Error(
        `auth-kit: the "${flow}" flow was called but no ${hookName(flow)} hook was configured.`,
      );
      this.setFlowState(flow, { status: 'error', error });
      throw error;
    }

    const gen = ++this.generations[flow];
    this.setFlowState(flow, { status: 'submitting', error: null });
    try {
      const result = await hook(payload as never);
      if (gen === this.generations[flow])
        this.setFlowState(flow, { status: 'success', error: null });
      return result;
    } catch (cause) {
      if (gen !== this.generations[flow]) throw cause; // superseded — don't report a stale error
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.setFlowState(flow, { status: 'error', error });
      throw error;
    }
  }

  login(payload: LoginPayload): Promise<TSession> {
    return this.run('login', this.hooks.onLogin, payload);
  }

  register(payload: RegisterPayload): Promise<TSession | void> {
    return this.run('register', this.hooks.onRegister, payload);
  }

  changePassword(payload: ChangePasswordPayload): Promise<void> {
    return this.run('changePassword', this.hooks.onChangePassword, payload);
  }

  forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    return this.run('forgotPassword', this.hooks.onForgotPassword, payload);
  }

  resetPassword(payload: ResetPasswordPayload): Promise<void> {
    return this.run('resetPassword', this.hooks.onResetPassword, payload);
  }

  verifyEmail(payload: VerifyEmailPayload): Promise<void> {
    return this.run('verifyEmail', this.hooks.onVerifyEmail, payload);
  }

  resendVerification(payload: ResendVerificationPayload): Promise<void> {
    return this.run('resendVerification', this.hooks.onResendVerification, payload);
  }
}

function hookName(flow: FlowName): string {
  const name = `on${flow.charAt(0).toUpperCase()}${flow.slice(1)}`;
  return OPTIONAL_HOOK_FLOWS.has(flow) ? `${name} (optional)` : name;
}
