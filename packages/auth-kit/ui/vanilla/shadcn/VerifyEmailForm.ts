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

const INPUT_CLASS =
  'box-border flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const LABEL_CLASS = 'text-sm font-medium leading-none';
const ERROR_CLASS = 'text-sm text-destructive';

/** Shadcn variant — self-contained, styled shadcn-like via native elements + the shared design tokens. Same options/behavior as headless. */
export function mountVerifyEmailForm(container: HTMLElement, { authKit, token, email: initialEmail, turnstile }: MountVerifyEmailFormOptions): () => void {
  const verifyStatus = statusText('text-muted-foreground');
  const email = field('Email', { id: 'auth-kit-resend-email', type: 'email', autocomplete: 'email' }, { label: LABEL_CLASS, input: INPUT_CLASS });
  email.input.value = initialEmail ?? '';
  const emailError = errorText(ERROR_CLASS);
  const submit = el(
    'button',
    {
      type: 'submit',
      class: 'inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm font-medium shadow-sm hover:bg-accent disabled:opacity-50',
    },
    ['Resend verification email'],
  );
  const submitError = errorText(ERROR_CLASS);
  const success = el('p', { class: 'text-sm text-green-600' });
  success.hidden = true;

  const rows: HTMLElement[] = [el('div', { class: 'flex flex-col gap-1.5' }, [email.label, emailError.node])];

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

  const resendForm = el('form', { novalidate: '', class: 'flex flex-col gap-4' }, rows);
  const verifyStatusWrapper = el('div', { role: 'status', class: 'text-sm' }, [verifyStatus.node]);
  const root = el('div', { class: 'flex flex-col gap-4' }, token ? [verifyStatusWrapper, resendForm] : [resendForm]);
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
