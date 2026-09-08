import { mountTurnstileWidget, TurnstileController } from '../../../core/turnstile.js';
import { buildResendVerificationSchema } from '../../../core/validation.js';
import { el, errorText, field, statusText } from '../internal/dom.js';

import type { AuthKitStore } from '../../../adapters/vanilla/create-auth-kit-store.js';
import type { TurnstileFieldConfig } from '../../../core/field-config.js';

export interface MountVerifyEmailFormOptions {
  authKit: AuthKitStore;
  token?: string;
  email?: string;
  turnstile?: TurnstileFieldConfig;
}

/** Vanilla CSS variant — same options/behavior as headless, styled with `auth-kit-*` classes. */
export function mountVerifyEmailForm(container: HTMLElement, { authKit, token, email: initialEmail, turnstile }: MountVerifyEmailFormOptions): () => void {
  const verifyStatus = statusText();
  const email = field('Email', { id: 'auth-kit-resend-email', type: 'email', autocomplete: 'email' }, { label: 'auth-kit-field', input: 'auth-kit-input' });
  email.input.value = initialEmail ?? '';
  const emailError = errorText('auth-kit-error');
  const submit = el('button', { type: 'submit', class: 'auth-kit-button' }, ['Resend verification email']);
  const submitError = errorText('auth-kit-error');
  const success = el('p', { class: 'auth-kit-success' });
  success.hidden = true;

  const rows: HTMLElement[] = [email.label, emailError.node];

  let turnstileToken: string | null = null;
  let unmountTurnstile: (() => void) | undefined;
  if (turnstile?.enabled) {
    const turnstileContainer = el('div');
    const controller = new TurnstileController({ siteKey: turnstile.siteKey, theme: turnstile.theme, mode: turnstile.mode });
    controller.subscribe((state) => {
      turnstileToken = state.token;
    });
    unmountTurnstile = mountTurnstileWidget(turnstileContainer, controller);
    rows.push(turnstileContainer);
  }
  rows.push(submit, submitError.node, success);

  const resendForm = el('form', { novalidate: '', class: 'auth-kit-form' }, rows);
  const verifyStatusWrapper = el('div', { role: 'status', class: 'auth-kit-status' }, [verifyStatus.node]);
  const root = el('div', {}, token ? [verifyStatusWrapper, resendForm] : [resendForm]);
  container.append(root);

  const unsubscribe = authKit.subscribe((state) => {
    if (token) {
      const { status: verifyState, error: verifyError } = state.verifyEmail;
      if (verifyState === 'submitting') verifyStatus.setText('Verifying your email…');
      else if (verifyState === 'success') verifyStatus.setText('Your email is verified.');
      else if (verifyState === 'error') verifyStatus.setText(verifyError?.message);
      else verifyStatus.setText(null);
    }

    const { status, error } = state.resendVerification;
    submit.toggleAttribute('disabled', status === 'submitting');
    submit.textContent = status === 'submitting' ? 'Sending…' : 'Resend verification email';
    submitError.setText(status === 'error' ? error?.message : null);
    success.hidden = status !== 'success';
    success.textContent = status === 'success' ? 'Verification email sent.' : '';
  });

  if (token) void authKit.verifyEmail({ token }).catch(() => {});

  const handleResendSubmit = (event: Event): void => {
    event.preventDefault();
    const result = buildResendVerificationSchema().safeParse({ email: email.input.value });
    if (!result.success) {
      emailError.setText(result.error.issues[0]?.message);
      return;
    }
    emailError.setText(null);
    void authKit.resendVerification({ email: email.input.value, turnstileToken }).catch(() => {});
  };
  resendForm.addEventListener('submit', handleResendSubmit);

  return () => {
    resendForm.removeEventListener('submit', handleResendSubmit);
    unsubscribe();
    unmountTurnstile?.();
    root.remove();
  };
}
